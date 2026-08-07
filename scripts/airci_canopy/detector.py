"""Detector clásico AirCI v1.2.

Procesa GeoTIFF por ventanas solapadas. No carga el raster completo en memoria.
Criterio multi-señal (contraste oscuro, textura, sombra, verdor relativo): no basta
“más verde”. Un modelo de segmentación entrenado puede sustituir ``detect_tile``
sin cambiar el contrato.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Callable, Iterable

import cv2
import numpy as np
import rasterio
from rasterio.windows import Window
from rasterio.warp import transform as warp_transform


DETECTOR_VERSION = "airci-classical-v1.2.0"


@dataclass
class Candidate:
    x_px: float
    y_px: float
    radius_px: float
    confidence: float
    area_px: float
    contour_px: list[tuple[float, float]] = field(default_factory=list)


def _to_u8(band: np.ndarray) -> np.ndarray:
    arr = np.asarray(band, dtype=np.float32)
    finite = np.isfinite(arr)
    if not finite.any():
        return np.zeros(arr.shape, dtype=np.uint8)
    sample = arr[finite]
    lo = float(np.percentile(sample, 1.0))
    hi = float(np.percentile(sample, 99.0))
    if hi <= lo:
        lo = float(sample.min())
        hi = float(sample.max())
    if hi <= lo:
        return np.zeros(arr.shape, dtype=np.uint8)
    scaled = np.clip((arr - lo) * (255.0 / (hi - lo)), 0, 255)
    scaled[~finite] = 0
    return scaled.astype(np.uint8)


def _rgb_u8(tile: np.ndarray) -> np.ndarray:
    if tile.ndim != 3 or tile.shape[0] < 1:
        raise ValueError("El GeoTIFF no contiene bandas legibles.")
    red = _to_u8(tile[0])
    green = _to_u8(tile[1] if tile.shape[0] > 1 else tile[0])
    blue = _to_u8(tile[2] if tile.shape[0] > 2 else tile[0])
    return np.dstack([red, green, blue])


def _odd(value: int) -> int:
    value = max(3, int(value))
    return value if value % 2 else value + 1


def _canopy_evidence(rgb: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Criterio multi-señal: no basta “más verde”.

    En huertas con pasto limón y copa oscura, ExG puro marca el piso.
    Aquí se premia:
    - copa más oscura que su vecindario (contraste local),
    - textura de follaje vs calle lisa,
    - verdor relativo (no brillo absoluto),
    - anillo de sombra / oscuridad amplia.
    """
    red = rgb[:, :, 0].astype(np.float32)
    green = rgb[:, :, 1].astype(np.float32)
    blue = rgb[:, :, 2].astype(np.float32)
    lum = 0.30 * red + 0.59 * green + 0.11 * blue
    total = np.maximum(red + green + blue, 1.0)
    greenness = np.clip((2.0 * green - red - blue) / total, 0.0, 1.5)

    height, width = lum.shape
    canopy_k = _odd(max(15, min(61, int(round(min(height, width) / 18.0)))))
    fine_k = _odd(max(3, canopy_k // 5))
    wide_k = _odd(min(101, canopy_k + 16))
    mean_l = cv2.blur(lum, (canopy_k, canopy_k))
    fine_l = cv2.blur(lum, (fine_k, fine_k))
    wide_l = cv2.blur(lum, (wide_k, wide_k))

    dark_blob = np.maximum(0.0, mean_l - lum)
    bright_blob = np.maximum(0.0, lum - mean_l)
    texture = np.abs(lum - fine_l)
    shadow_cue = np.maximum(0.0, mean_l - wide_l)
    mean_green = cv2.blur(greenness.astype(np.float32), (canopy_k, canopy_k))

    # Pasto soleado: calle YA clara/verdosa + pixel más claro y poco texturizado.
    # No confundir con copa verde brillante sobre suelo marrón (mean_l bajo).
    grass_like = (
        (mean_l > 125.0)
        & (mean_green > 0.06)
        & (lum > mean_l + 5.0)
        & (texture < 4.8)
        & (greenness > 0.03)
    )
    # Sombra plana / suelo negro: sin textura de hoja.
    shadow_flat = (lum < 32.0) & (mean_l < 48.0) & (texture < 3.2)
    flat_field = (texture < 2.8) & (dark_blob < 3.5) & (bright_blob < 3.5)

    # Sobre suelo oscuro, la copa puede ser el blob más brillante; sobre pasto limón, el más oscuro.
    bright_weight = np.where(mean_l < 120.0, 1.05, 0.30)
    dark_weight = np.where(mean_l >= 120.0, 1.65, 1.15)

    score = (
        dark_weight * dark_blob
        + bright_weight * np.minimum(bright_blob, 48.0)
        + 1.15 * texture
        + 0.80 * shadow_cue
        + 28.0 * greenness
    )
    score = np.where(grass_like, score * 0.16, score)
    score = np.where(shadow_flat, score * 0.10, score)
    score = np.where(flat_field, score * 0.28, score)
    # Sin verdor ni blob oscuro+textura → casi seguro no es copa.
    vegish = (greenness > 0.03) | ((dark_blob > 7.0) & (texture > 2.8))
    score = np.where(vegish, score, score * 0.12)

    valid = lum > 10.0
    canopy = np.zeros_like(lum, dtype=np.uint8)
    if valid.any():
        # Suavizar a escala de copa: el interior plano no debe quedar bajo por textura solo en el borde.
        score = cv2.blur(score, (fine_k, fine_k))
        sample = score[valid]
        peak = float(np.percentile(sample, 99.5))
        if peak <= 1e-6:
            peak = float(sample.max()) if sample.size else 1.0
        peak = max(peak, 1e-3)
        canopy = np.clip(score * (255.0 / peak), 0, 255).astype(np.uint8)
        canopy[~valid] = 0
    return canopy, lum, texture, dark_blob


def _shadow_support(lum: np.ndarray, x: int, y: int, radius_px: float) -> float:
    """¿Hay sombra proyectada junto al candidato? (objeto 3D vs mancha plana)."""
    height, width = lum.shape
    if radius_px < 2:
        return 0.0
    local_r = max(2, int(round(radius_px * 0.35)))
    y0, y1 = max(0, y - local_r), min(height, y + local_r + 1)
    x0, x1 = max(0, x - local_r), min(width, x + local_r + 1)
    crown = lum[y0:y1, x0:x1]
    if crown.size == 0:
        return 0.0
    crown_mean = float(crown.mean())
    best = 0.0
    dist = max(3, int(round(radius_px * 1.55)))
    patch = max(2, int(round(radius_px * 0.45)))
    for angle_deg in range(0, 360, 45):
        ang = math.radians(angle_deg)
        sx = int(round(x + math.cos(ang) * dist))
        sy = int(round(y + math.sin(ang) * dist))
        if sx < 0 or sy < 0 or sx >= width or sy >= height:
            continue
        py0, py1 = max(0, sy - patch), min(height, sy + patch + 1)
        px0, px1 = max(0, sx - patch), min(width, sx + patch + 1)
        sample = lum[py0:py1, px0:px1]
        if sample.size == 0:
            continue
        contrast = crown_mean - float(sample.mean())
        # Sombra = parche claramente más oscuro que la copa.
        if contrast > best:
            best = contrast
    return max(0.0, min(1.0, best / 28.0))


def _nms(candidates: Iterable[Candidate], min_distance: float) -> list[Candidate]:
    ordered = sorted(candidates, key=lambda c: c.confidence, reverse=True)
    kept: list[Candidate] = []
    cell = max(2.0, float(min_distance))
    grid: dict[tuple[int, int], list[Candidate]] = {}
    for candidate in ordered:
        gx = int(candidate.x_px // cell)
        gy = int(candidate.y_px // cell)
        duplicate = False
        for yy in range(gy - 1, gy + 2):
            for xx in range(gx - 1, gx + 2):
                for other in grid.get((xx, yy), ()):
                    dx = other.x_px - candidate.x_px
                    dy = other.y_px - candidate.y_px
                    threshold = max(
                        min_distance,
                        min(other.radius_px, candidate.radius_px) * 0.65,
                    )
                    if dx * dx + dy * dy < threshold * threshold:
                        duplicate = True
                        break
                if duplicate:
                    break
            if duplicate:
                break
        if duplicate:
            continue
        kept.append(candidate)
        grid.setdefault((gx, gy), []).append(candidate)
    return kept


def _contour_for_seed(labels: np.ndarray, x: int, y: int, radius_px: float) -> tuple[list[tuple[float, float]], float]:
    """Obtiene el borde real de vegetación asociado a un centro de copa.

    Si dos copas quedaron unidas en la máscara, limita el componente al radio
    local del candidato para evitar que un solo perímetro cubra toda la hilera.
    """
    height, width = labels.shape[:2]
    if x < 0 or y < 0 or x >= width or y >= height:
        return [], 0.0
    label = int(labels[y, x])
    if label == 0:
        search = max(2, int(round(radius_px * 0.25)))
        y0, y1 = max(0, y - search), min(height, y + search + 1)
        x0, x1 = max(0, x - search), min(width, x + search + 1)
        nearby = labels[y0:y1, x0:x1]
        values = nearby[nearby > 0]
        if not values.size:
            return [], 0.0
        label = int(values[0])
    component = (labels == label).astype(np.uint8) * 255
    # Una copa pegada a otra se conserva cerca de su máximo local.
    limit = max(4, int(round(radius_px * 1.35)))
    local = np.zeros_like(component)
    cv2.circle(local, (x, y), limit, 255, thickness=-1)
    component = cv2.bitwise_and(component, local)
    contours, _ = cv2.findContours(component, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return [], 0.0
    contour = max(contours, key=cv2.contourArea)
    if cv2.contourArea(contour) < 4:
        return [], 0.0
    epsilon = max(1.0, 0.008 * cv2.arcLength(contour, True))
    simplified = cv2.approxPolyDP(contour, epsilon, True).reshape(-1, 2)
    points = [(float(px), float(py)) for px, py in simplified]
    return points, float(cv2.contourArea(contour))


def detect_tile(
    tile: np.ndarray,
    gsd_m: float | None,
    min_canopy_m: float,
    max_canopy_m: float,
    expected_spacing_m: float,
) -> list[Candidate]:
    """Detecta centros de copa en una ventana RGB (contraste + textura + sombra + verdor)."""

    rgb = _rgb_u8(tile)
    canopy, lum, texture, dark_blob = _canopy_evidence(rgb)
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    value = hsv[:, :, 2]
    valid = value > 12
    if not valid.any() or int(canopy[valid].max()) < 8:
        return []

    otsu_value, _ = cv2.threshold(canopy[valid], 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    # Percentil de soporte: Otsu solo a veces corta el interior de la copa.
    positive = canopy[valid & (canopy > 8)]
    pct_thr = int(np.percentile(positive, 58)) if positive.size > 80 else int(otsu_value)
    threshold = max(55, min(int(otsu_value * 0.82), pct_thr))
    mask = ((canopy >= threshold) & valid).astype(np.uint8) * 255

    if gsd_m and gsd_m > 0:
        min_radius_px = max(2.5, (min_canopy_m * 0.5) / gsd_m)
        max_radius_px = max(min_radius_px + 1, (max_canopy_m * 0.5) / gsd_m)
        spacing_px = expected_spacing_m / gsd_m if expected_spacing_m > 0 else min_radius_px * 2.4
    else:
        min_radius_px = 4.0
        max_radius_px = 90.0
        spacing_px = 14.0

    morphology_radius = max(1, min(12, int(round(min_radius_px * 0.12))))
    kernel = cv2.getStructuringElement(
        cv2.MORPH_ELLIPSE, (_odd(morphology_radius * 2 + 1), _odd(morphology_radius * 2 + 1))
    )
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    _, component_labels = cv2.connectedComponents((mask > 0).astype(np.uint8), connectivity=8)

    distance = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
    peak_window = _odd(min(101, max(5, int(round(spacing_px * 0.55)))))
    dilated = cv2.dilate(
        distance,
        cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (peak_window, peak_window)),
    )
    min_peak = max(1.5, min_radius_px * 0.28)
    peaks = ((distance >= dilated - 1e-4) & (distance >= min_peak)).astype(np.uint8)

    count, _labels, _stats, centroids = cv2.connectedComponentsWithStats(peaks, connectivity=8)
    found: list[Candidate] = []
    for label in range(1, count):
        cx, cy = centroids[label]
        x = int(round(cx))
        y = int(round(cy))
        if x < 0 or y < 0 or y >= distance.shape[0] or x >= distance.shape[1]:
            continue
        raw_radius = float(distance[y, x])
        radius = max(min_radius_px * 0.45, min(raw_radius, max_radius_px))
        radius_score = min(1.0, raw_radius / max(min_radius_px, 1.0))
        score_norm = float(canopy[y, x]) / 255.0
        texture_score = min(1.0, float(texture[y, x]) / 12.0)
        dark_score = min(1.0, float(dark_blob[y, x]) / 22.0)
        shadow_score = _shadow_support(lum, x, y, radius)
        confidence = 100.0 * (
            0.34 * radius_score
            + 0.26 * score_norm
            + 0.18 * texture_score
            + 0.14 * dark_score
            + 0.08 * shadow_score
        )
        if confidence < 32:
            continue
        contour_px, contour_area = _contour_for_seed(component_labels, x, y, radius)
        found.append(
            Candidate(
                x_px=float(cx),
                y_px=float(cy),
                radius_px=float(radius),
                confidence=float(round(confidence, 1)),
                area_px=contour_area if contour_area > 0 else float(math.pi * radius * radius),
                contour_px=contour_px,
            )
        )

    return _nms(found, max(3.0, spacing_px * 0.35))


def _window_starts(length: int, tile_size: int, overlap: int) -> list[int]:
    if length <= tile_size:
        return [0]
    step = max(1, tile_size - overlap)
    starts = list(range(0, max(1, length - tile_size + 1), step))
    last = max(0, length - tile_size)
    if starts[-1] != last:
        starts.append(last)
    return starts


def _in_core(
    x: float,
    y: float,
    x0: int,
    y0: int,
    width: int,
    height: int,
    raster_width: int,
    raster_height: int,
    overlap: int,
) -> bool:
    half = overlap / 2.0
    left = x0 + (half if x0 > 0 else 0)
    top = y0 + (half if y0 > 0 else 0)
    right = x0 + width - (half if x0 + width < raster_width else 0)
    bottom = y0 + height - (half if y0 + height < raster_height else 0)
    return left <= x < right and top <= y < bottom


def _meters_per_pixel(dataset: rasterio.io.DatasetReader, provided: float | None) -> float | None:
    if provided and provided > 0:
        return float(provided)
    if dataset.crs and dataset.crs.is_projected:
        x_res, y_res = dataset.res
        value = (abs(float(x_res)) + abs(float(y_res))) / 2.0
        return value if value > 0 else None
    return None


def _haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radius = 6371000.0
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * radius * math.asin(min(1.0, math.sqrt(a)))


def _normalize_ring(ring: object) -> list[list[float]] | None:
    if not isinstance(ring, list) or len(ring) < 3:
        return None
    points: list[list[float]] = []
    for point in ring:
        if not isinstance(point, (list, tuple)) or len(point) < 2:
            return None
        lat = float(point[0])
        lng = float(point[1])
        if not math.isfinite(lat) or not math.isfinite(lng):
            return None
        points.append([lat, lng])
    return points


def _resolve_spacing_m(options: dict, samples: list, sample_diameters: list[float]) -> tuple[float, float | None]:
    """Densidad del predio manda; si no hay, usan las 10 copas; si no, diámetro."""
    dens = float(options.get("target_trees_per_ha") or options.get("densidad_ha") or 0.0)
    dens = dens if 20 <= dens <= 5000 else 0.0
    spacing_density = math.sqrt(10000.0 / dens) if dens > 0 else 0.0
    spacing_opt = max(0.0, float(options.get("expected_spacing_m") or 0.0))
    spacing_nn: list[float] = []
    centers = []
    for sample in samples:
        if not isinstance(sample, dict):
            continue
        lat = float(sample.get("center_lat") or 0)
        lng = float(sample.get("center_lng") or 0)
        if math.isfinite(lat) and math.isfinite(lng) and abs(lat) <= 90 and abs(lng) <= 180:
            centers.append((lat, lng))
    for index, (lat, lng) in enumerate(centers):
        best = float("inf")
        for other_index, (olat, olng) in enumerate(centers):
            if index == other_index:
                continue
            dist = _haversine_m(lat, lng, olat, olng)
            if dist < best:
                best = dist
        if math.isfinite(best) and best < 1e8:
            spacing_nn.append(best)
    spacing_calib = float(np.median(spacing_nn)) if len(spacing_nn) >= 2 else 0.0
    spacing_diam = float(np.median(sample_diameters)) * 1.7 if len(sample_diameters) > 1 else 0.0
    # Prioridad: densidad del predio → espaciado explícito → NN de las 10 → Ø×1.7
    spacing = spacing_density or spacing_opt or spacing_calib or spacing_diam
    return max(0.0, float(spacing)), (dens if dens > 0 else None)


def _calibration_anchor_trees(samples: list, gsd_m: float | None) -> list[dict]:
    """Convierte las copas dibujadas por el usuario en árboles forzados del resultado."""
    anchors: list[dict] = []
    for index, sample in enumerate(samples, start=1):
        if not isinstance(sample, dict):
            continue
        ring = _normalize_ring(sample.get("polygon_json"))
        lat = float(sample.get("center_lat") or 0)
        lng = float(sample.get("center_lng") or 0)
        if ring is None or not (math.isfinite(lat) and math.isfinite(lng)):
            continue
        if abs(lat) > 90 or abs(lng) > 180:
            continue
        diameter_m = float(sample.get("diameter_m") or 0) or None
        area_m2 = float(sample.get("area_m2") or 0) or None
        if area_m2 is None and diameter_m and diameter_m > 0:
            area_m2 = math.pi * (diameter_m * 0.5) ** 2
        area_px = None
        if area_m2 is not None and gsd_m and gsd_m > 0:
            area_px = area_m2 / (gsd_m * gsd_m)
        anchors.append(
            {
                "tree_index": index,
                "stable_id": f"calib-{index}",
                "center_lat": lat,
                "center_lng": lng,
                "area_px": round(area_px, 2) if area_px is not None else None,
                "area_m2": round(area_m2, 3) if area_m2 is not None else None,
                "diameter_m": round(diameter_m, 3) if diameter_m is not None else None,
                "confidence": 100.0,
                "sem_key": "verde",
                "polygon_json": ring,
                "is_manual": True,
                "metrics_json": {
                    "from_calibration": True,
                    "calibration_index": index,
                    "z": 0.0,
                },
            }
        )
    return anchors


def _merge_calibration_anchors(
    trees: list[dict],
    anchors: list[dict],
    spacing_m: float,
) -> tuple[list[dict], int]:
    """Inserta las 10 copas del usuario y quita detecciones automáticas demasiado cerca."""
    if not anchors:
        return trees, 0
    suppress_m = max(1.2, spacing_m * 0.45) if spacing_m > 0 else 3.0
    kept: list[dict] = []
    replaced = 0
    for tree in trees:
        too_close = False
        for anchor in anchors:
            if (
                _haversine_m(
                    float(tree["center_lat"]),
                    float(tree["center_lng"]),
                    float(anchor["center_lat"]),
                    float(anchor["center_lng"]),
                )
                < suppress_m
            ):
                too_close = True
                break
        if too_close:
            replaced += 1
            continue
        kept.append(tree)
    kept.extend(anchors)
    for index, tree in enumerate(kept, start=1):
        tree["tree_index"] = index
        if not tree.get("stable_id") or str(tree.get("stable_id")).isdigit():
            if tree.get("is_manual"):
                tree["stable_id"] = f"calib-{tree.get('metrics_json', {}).get('calibration_index', index)}"
            else:
                tree["stable_id"] = str(index)
    return kept, replaced


def _to_wgs84(
    dataset: rasterio.io.DatasetReader,
    candidates: list[Candidate],
    sides: int = 16,
) -> tuple[list[tuple[float, float]], list[list[list[float]]]]:
    if not dataset.crs:
        raise ValueError("El GeoTIFF no tiene CRS; no se pueden generar coordenadas GPS.")

    center_xs: list[float] = []
    center_ys: list[float] = []
    ring_xs: list[float] = []
    ring_ys: list[float] = []
    ring_sizes: list[int] = []
    for candidate in candidates:
        x_geo, y_geo = dataset.transform * (candidate.x_px + 0.5, candidate.y_px + 0.5)
        center_xs.append(x_geo)
        center_ys.append(y_geo)
        points = candidate.contour_px
        if len(points) < 3:
            points = [
                (
                    candidate.x_px + math.cos((2.0 * math.pi * side) / sides) * candidate.radius_px,
                    candidate.y_px + math.sin((2.0 * math.pi * side) / sides) * candidate.radius_px,
                )
                for side in range(sides)
            ]
        ring_sizes.append(len(points))
        for px, py in points:
            gx, gy = dataset.transform * (px + 0.5, py + 0.5)
            ring_xs.append(gx)
            ring_ys.append(gy)

    center_lngs, center_lats = warp_transform(dataset.crs, "EPSG:4326", center_xs, center_ys)
    ring_lngs, ring_lats = warp_transform(dataset.crs, "EPSG:4326", ring_xs, ring_ys)
    centers = list(zip(center_lats, center_lngs))
    polygons: list[list[list[float]]] = []
    start = 0
    for ring_size in ring_sizes:
        ring = [
            [float(ring_lats[start + side]), float(ring_lngs[start + side])]
            for side in range(ring_size)
        ]
        polygons.append(ring)
        start += ring_size
    return centers, polygons


def analyze_geotiff(
    path: str,
    options: dict,
    progress: Callable[[int, str], None] | None = None,
) -> tuple[list[dict], dict]:
    """Procesa un GeoTIFF completo por tiles y devuelve árboles + estadísticas."""

    tile_size = max(512, min(int(options.get("tile_size") or 2048), 4096))
    overlap = max(64, min(int(options.get("overlap") or 256), tile_size // 3))
    min_canopy_m = max(0.3, float(options.get("min_canopy_m") or 1.0))
    max_canopy_m = max(min_canopy_m + 0.5, float(options.get("max_canopy_m") or 12.0))
    provided_gsd = float(options.get("gsd_m") or 0.0) or None
    calibration = options.get("calibration") if isinstance(options.get("calibration"), dict) else {}
    samples = calibration.get("samples") if isinstance(calibration.get("samples"), list) else []
    # Las copas corregidas por el usuario mandan sobre los valores genéricos.
    sample_diameters = [
        float(sample["diameter_m"])
        for sample in samples
        if isinstance(sample, dict) and float(sample.get("diameter_m") or 0) > 0
    ]
    if sample_diameters:
        min_canopy_m = max(0.3, min(sample_diameters) * 0.72)
        max_canopy_m = max(min_canopy_m + 0.5, max(sample_diameters) * 1.35)
    expected_spacing_m, target_density = _resolve_spacing_m(options, samples, sample_diameters)

    def report(value: int, phase: str) -> None:
        if progress:
            progress(max(0, min(100, int(value))), phase)

    report(8, "Abriendo GeoTIFF")
    with rasterio.open(path) as dataset:
        if dataset.count < 1:
            raise ValueError("El GeoTIFF no tiene bandas.")
        gsd_m = _meters_per_pixel(dataset, provided_gsd)
        x_starts = _window_starts(dataset.width, tile_size, overlap)
        y_starts = _window_starts(dataset.height, tile_size, overlap)
        total_tiles = len(x_starts) * len(y_starts)
        candidates: list[Candidate] = []
        completed = 0

        for y0 in y_starts:
            for x0 in x_starts:
                width = min(tile_size, dataset.width - x0)
                height = min(tile_size, dataset.height - y0)
                window = Window(x0, y0, width, height)
                tile = dataset.read(
                    indexes=list(range(1, min(dataset.count, 3) + 1)),
                    window=window,
                    boundless=False,
                )
                local = detect_tile(
                    tile,
                    gsd_m=gsd_m,
                    min_canopy_m=min_canopy_m,
                    max_canopy_m=max_canopy_m,
                    expected_spacing_m=expected_spacing_m,
                )
                for candidate in local:
                    candidate.x_px += x0
                    candidate.y_px += y0
                    candidate.contour_px = [(x + x0, y + y0) for x, y in candidate.contour_px]
                    if _in_core(
                        candidate.x_px,
                        candidate.y_px,
                        x0,
                        y0,
                        width,
                        height,
                        dataset.width,
                        dataset.height,
                        overlap,
                    ):
                        candidates.append(candidate)
                        if len(candidates) > 100_000:
                            raise ValueError(
                                "Más de 100,000 candidatos; ajusta tamaño/espaciamiento."
                            )
                completed += 1
                report(
                    12 + int(68 * completed / max(total_tiles, 1)),
                    f"Detectando tile {completed}/{total_tiles}",
                )

        total_pixels = float(dataset.width * dataset.height)
        ortho_ha = (
            (total_pixels * gsd_m * gsd_m) / 10000.0 if gsd_m and gsd_m > 0 else None
        )
        expected_trees = (
            int(round(target_density * ortho_ha))
            if target_density and ortho_ha and ortho_ha > 0
            else None
        )
        # Si hay densidad, no dejes que el detector invente el doble de plantas.
        if expected_trees and expected_trees >= 10 and len(candidates) > expected_trees * 1.45:
            candidates = sorted(candidates, key=lambda c: c.confidence, reverse=True)
            candidates = candidates[: max(expected_trees, int(math.ceil(expected_trees * 1.35)))]

        report(84, "Convirtiendo coordenadas")
        centers, polygons = _to_wgs84(dataset, candidates)
        areas = np.asarray([candidate.area_px for candidate in candidates], dtype=np.float64)
        mean_area = float(areas.mean()) if len(areas) else 0.0
        std_area = float(areas.std()) if len(areas) else 0.0

        trees: list[dict] = []
        for index, candidate in enumerate(candidates, start=1):
            area_m2 = candidate.area_px * gsd_m * gsd_m if gsd_m else None
            diameter_m = 2.0 * candidate.radius_px * gsd_m if gsd_m else None
            z_score = (
                (candidate.area_px - mean_area) / std_area if std_area > 1e-9 else 0.0
            )
            if z_score < -1.1:
                sem_key = "rojo"
            elif z_score < -0.45:
                sem_key = "amarillo"
            elif z_score > 1.0:
                sem_key = "azul"
            else:
                sem_key = "verde"
            lat, lng = centers[index - 1]
            trees.append(
                {
                    "tree_index": index,
                    "stable_id": str(index),
                    "center_lat": float(lat),
                    "center_lng": float(lng),
                    "area_px": round(candidate.area_px, 2),
                    "area_m2": round(area_m2, 3) if area_m2 is not None else None,
                    "diameter_m": round(diameter_m, 3) if diameter_m is not None else None,
                    "confidence": candidate.confidence,
                    "sem_key": sem_key,
                    "polygon_json": polygons[index - 1],
                    "is_manual": False,
                    "metrics_json": {
                        "radius_px": round(candidate.radius_px, 2),
                        "z": round(z_score, 4),
                    },
                }
            )

        report(88, "Aplicando copas de calibración")
        anchors = _calibration_anchor_trees(samples, gsd_m)
        trees, replaced = _merge_calibration_anchors(trees, anchors, expected_spacing_m)

        # Recalcular semáforo con el set final (incluye anclas).
        final_areas = np.asarray(
            [float(tree.get("area_px") or 0) for tree in trees if tree.get("area_px") is not None],
            dtype=np.float64,
        )
        mean_area = float(final_areas.mean()) if len(final_areas) else mean_area
        std_area = float(final_areas.std()) if len(final_areas) else std_area
        for tree in trees:
            area_px = float(tree.get("area_px") or 0)
            z_score = (area_px - mean_area) / std_area if std_area > 1e-9 else 0.0
            if tree.get("is_manual"):
                # Las del usuario no se “castigan”: quedan verdes de referencia.
                tree["sem_key"] = "verde"
                metrics = dict(tree.get("metrics_json") or {})
                metrics["z"] = round(z_score, 4)
                tree["metrics_json"] = metrics
                continue
            if z_score < -1.1:
                tree["sem_key"] = "rojo"
            elif z_score < -0.45:
                tree["sem_key"] = "amarillo"
            elif z_score > 1.0:
                tree["sem_key"] = "azul"
            else:
                tree["sem_key"] = "verde"
            metrics = dict(tree.get("metrics_json") or {})
            metrics["z"] = round(z_score, 4)
            tree["metrics_json"] = metrics

        cover_area = float(
            sum(float(tree.get("area_px") or 0) for tree in trees)
        )
        cover_pct = 100.0 * cover_area / total_pixels if total_pixels else 0.0
        stats = {
            "count": len(trees),
            "coverPct": round(min(100.0, cover_pct), 3),
            "meanArea": round(mean_area, 3),
            "stdArea": round(std_area, 3),
            "gsdM": gsd_m,
            "widthPx": dataset.width,
            "heightPx": dataset.height,
            "tileSize": tile_size,
            "overlap": overlap,
            "tilesProcessed": total_tiles,
            "detectorVersion": DETECTOR_VERSION,
            "professional": True,
            "validationStatus": "requires_review",
            "calibrationSamples": len(samples),
            "calibrated": len(samples) >= 10,
            "calibrationAnchors": len(anchors),
            "calibrationReplaced": replaced,
            "expectedSpacingM": round(expected_spacing_m, 3) if expected_spacing_m else None,
            "targetTreesPerHa": target_density,
            "expectedTrees": expected_trees,
            "orthoAreaHa": round(ortho_ha, 4) if ortho_ha else None,
        }
        if trees:
            latitudes = [float(tree["center_lat"]) for tree in trees]
            longitudes = [float(tree["center_lng"]) for tree in trees]
            stats["treeBbox"] = [
                float(min(longitudes)),
                float(min(latitudes)),
                float(max(longitudes)),
                float(max(latitudes)),
            ]
        report(90, "Preparando resultados")
        return trees, stats