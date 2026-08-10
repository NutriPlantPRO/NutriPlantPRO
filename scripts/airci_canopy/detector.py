"""Detector AirCI — motor oficial ``grid_v1``.

Pipeline: patrón (10 + densidad) → rejilla de seeds → confirmar RGB local → merge.
El RGB no inventa centros libres; solo confirma candidatos de la rejilla.
``detect_tile`` queda como apoyo de evidencia / modo experimental ``classical_v1``.
"""

from __future__ import annotations

import math
from dataclasses import asdict, dataclass, field
from typing import Callable, Iterable

import cv2
import numpy as np
import rasterio
from rasterio.windows import Window
from rasterio.warp import transform as warp_transform


DETECTOR_VERSION = "airci-grid-v1.1.0"
CLASSICAL_DETECTOR_VERSION = "airci-classical-v1.2.0"


class DetectorError(ValueError):
    """Error de negocio con código estable para UI/worker."""

    def __init__(self, code: str, message: str):
        self.code = str(code)
        super().__init__(message)


@dataclass
class Candidate:
    x_px: float
    y_px: float
    radius_px: float
    confidence: float
    area_px: float
    contour_px: list[tuple[float, float]] = field(default_factory=list)
    seed_id: str | None = None
    shift_m: float | None = None


@dataclass
class PlantingPattern:
    typical_diam_m: float
    spacing_in_row_m: float
    spacing_between_rows_m: float
    row_azimuth_deg: float
    source: str
    pattern_confidence: float
    target_trees_per_ha: float | None = None

    def as_dict(self) -> dict:
        return asdict(self)


@dataclass
class Seed:
    seed_id: str
    x_px: float
    y_px: float
    row_i: int
    col_i: int


@dataclass
class MarkAppearance:
    """Perfil visual aprendido de las 10 marcas (planta vs no-planta)."""

    lum_lo: float
    lum_hi: float
    green_lo: float
    green_hi: float
    texture_lo: float
    texture_hi: float
    dark_lo: float
    dark_hi: float
    sample_count: int
    pixel_count: int

    def as_dict(self) -> dict:
        return asdict(self)

    def match_score(
        self, lum: float, green: float, texture: float, dark: float
    ) -> float:
        """0–1: qué tanto se parece el candidato a las marcas."""
        checks = (
            self.lum_lo <= lum <= self.lum_hi,
            self.green_lo <= green <= self.green_hi,
            self.texture_lo <= texture <= self.texture_hi,
            self.dark_lo <= dark <= self.dark_hi,
        )
        return float(sum(1 for ok in checks if ok)) / 4.0

    def accepts(self, lum: float, green: float, texture: float, dark: float) -> bool:
        # Trazo imperfecto: bastan 3/4 señales dentro de banda.
        # Rechazo duro si brillo o textura están muy lejos (pasto/sombra plana).
        lum_span = max(8.0, self.lum_hi - self.lum_lo)
        tex_span = max(1.5, self.texture_hi - self.texture_lo)
        far_bright = lum > self.lum_hi + max(10.0, 0.28 * lum_span)
        far_dark = lum < self.lum_lo - max(10.0, 0.28 * lum_span)
        far_flat = texture < max(0.0, self.texture_lo - 0.45 * tex_span)
        if far_bright or far_dark or far_flat:
            return False
        score = self.match_score(lum, green, texture, dark)
        if score >= 0.75:
            return True
        # Pasto soleado suele fallar textura+dark aunque el verdor se solape.
        if texture < self.texture_lo and dark < self.dark_lo:
            return False
        return score >= 0.5


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


def _feature_maps(rgb: np.ndarray) -> dict[str, np.ndarray]:
    """Mapas usados para perfil de marcas y confirmación visual."""
    canopy, lum, texture, dark_blob = _canopy_evidence(rgb)
    red = rgb[:, :, 0].astype(np.float32)
    green = rgb[:, :, 1].astype(np.float32)
    blue = rgb[:, :, 2].astype(np.float32)
    total = np.maximum(red + green + blue, 1.0)
    greenness = np.clip((2.0 * green - red - blue) / total, 0.0, 1.5)
    return {
        "canopy": canopy,
        "lum": lum,
        "texture": texture,
        "dark_blob": dark_blob,
        "greenness": greenness,
    }


def _band_from_values(values: np.ndarray, pad_frac: float = 0.35) -> tuple[float, float]:
    sample = np.asarray(values, dtype=np.float64)
    sample = sample[np.isfinite(sample)]
    if sample.size == 0:
        return 0.0, 1.0
    q25 = float(np.percentile(sample, 20))
    q75 = float(np.percentile(sample, 80))
    med = float(np.median(sample))
    iqr = max(q75 - q25, abs(med) * 0.08, 1e-3)
    lo = q25 - pad_frac * iqr
    hi = q75 + pad_frac * iqr
    # Evitar bandas degeneradas por trazos casi constantes.
    if hi - lo < iqr * 0.5:
        lo = med - 0.75 * iqr
        hi = med + 0.75 * iqr
    return float(lo), float(hi)


def _ring_pixel_xy(
    dataset: rasterio.io.DatasetReader, ring: list
) -> np.ndarray | None:
    if not ring or len(ring) < 3:
        return None
    lats = [float(point[0]) for point in ring]
    lngs = [float(point[1]) for point in ring]
    try:
        xs_crs, ys_crs = warp_transform("EPSG:4326", dataset.crs, lngs, lats)
    except Exception:
        return None
    points: list[list[float]] = []
    for x_crs, y_crs in zip(xs_crs, ys_crs):
        col, row = ~dataset.transform * (x_crs, y_crs)
        if math.isfinite(col) and math.isfinite(row):
            points.append([float(col), float(row)])
    if len(points) < 3:
        return None
    return np.asarray(points, dtype=np.float32)


def appearance_from_calibration(
    dataset: rasterio.io.DatasetReader,
    samples: list[dict],
) -> MarkAppearance | None:
    """Lee RGB dentro de las marcas y arma el perfil visual de planta."""
    valid = _valid_calibration_samples(samples)
    if len(valid) < 3:
        return None

    lum_vals: list[float] = []
    green_vals: list[float] = []
    texture_vals: list[float] = []
    dark_vals: list[float] = []
    used = 0

    for sample in valid:
        ring_xy = _ring_pixel_xy(dataset, sample.get("polygon_json") or [])
        if ring_xy is None:
            continue
        min_x = int(math.floor(float(ring_xy[:, 0].min()))) - 2
        max_x = int(math.ceil(float(ring_xy[:, 0].max()))) + 2
        min_y = int(math.floor(float(ring_xy[:, 1].min()))) - 2
        max_y = int(math.ceil(float(ring_xy[:, 1].max()))) + 2
        min_x = max(0, min_x)
        min_y = max(0, min_y)
        max_x = min(dataset.width, max_x)
        max_y = min(dataset.height, max_y)
        width = max_x - min_x
        height = max_y - min_y
        if width < 3 or height < 3:
            continue
        window = Window(min_x, min_y, width, height)
        try:
            tile = dataset.read(
                indexes=list(range(1, min(dataset.count, 3) + 1)),
                window=window,
                boundless=False,
            )
        except Exception:
            continue
        rgb = _rgb_u8(tile)
        features = _feature_maps(rgb)
        local = ring_xy.copy()
        local[:, 0] -= min_x
        local[:, 1] -= min_y
        # Encoger el polígono al centro (~70%): el trazo humano suele comer pasto.
        centroid = local.mean(axis=0)
        local = centroid + 0.70 * (local - centroid)
        mask = np.zeros((height, width), dtype=np.uint8)
        cv2.fillPoly(mask, [np.round(local).astype(np.int32)], 1)
        # Núcleo interior: evita borde/pasto si el trazo quedó un poco grande.
        if mask.any() and min(height, width) >= 7:
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
            eroded = cv2.erode(mask, kernel, iterations=1)
            if eroded.any():
                mask = eroded
        selected = mask > 0
        if int(selected.sum()) < 8:
            continue
        lum_vals.extend(features["lum"][selected].astype(np.float64).tolist())
        green_vals.extend(features["greenness"][selected].astype(np.float64).tolist())
        texture_vals.extend(features["texture"][selected].astype(np.float64).tolist())
        dark_vals.extend(features["dark_blob"][selected].astype(np.float64).tolist())
        used += 1

    if used < 3 or len(lum_vals) < 40:
        return None

    lum_lo, lum_hi = _band_from_values(np.asarray(lum_vals))
    green_lo, green_hi = _band_from_values(np.asarray(green_vals), pad_frac=0.45)
    texture_lo, texture_hi = _band_from_values(np.asarray(texture_vals), pad_frac=0.40)
    dark_lo, dark_hi = _band_from_values(np.asarray(dark_vals), pad_frac=0.40)
    # Textura mínima: las marcas suelen tener follaje; no aceptar piso liso.
    texture_lo = max(0.0, min(texture_lo, float(np.percentile(texture_vals, 15))))
    return MarkAppearance(
        lum_lo=lum_lo,
        lum_hi=lum_hi,
        green_lo=green_lo,
        green_hi=green_hi,
        texture_lo=texture_lo,
        texture_hi=max(texture_hi, texture_lo + 1.0),
        dark_lo=dark_lo,
        dark_hi=max(dark_hi, dark_lo + 0.5),
        sample_count=used,
        pixel_count=len(lum_vals),
    )


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
    if not dataset.crs:
        return None
    try:
        x_res, y_res = dataset.res
    except Exception:
        return None
    ax = abs(float(x_res))
    ay = abs(float(y_res))
    if ax <= 0 or ay <= 0:
        return None
    if dataset.crs.is_projected:
        value = (ax + ay) / 2.0
        return value if value > 0 else None
    # Geographic CRS (p.ej. EPSG:4326): res está en grados → convertir a metros
    # en el centro del raster. Sin esto, ortos WebODM/Leaflet en 4326 fallan NO_GSD.
    if dataset.crs.is_geographic:
        try:
            bounds = dataset.bounds
            center_lat = (float(bounds.top) + float(bounds.bottom)) / 2.0
            center_lng = (float(bounds.left) + float(bounds.right)) / 2.0
        except Exception:
            return None
        if not math.isfinite(center_lat) or abs(center_lat) > 90:
            return None
        # 1 px en X/Y → distancia real (haversine) en el centro
        mx = _haversine_m(center_lat, center_lng, center_lat, center_lng + ax)
        my = _haversine_m(center_lat, center_lng, center_lat + ay, center_lng)
        value = (mx + my) / 2.0
        # GSD de dron típico ≪ 2 m/px; rechazar basura
        if not math.isfinite(value) or value <= 0 or value > 2.0:
            return None
        return float(value)
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


def _valid_calibration_samples(samples: list) -> list[dict]:
    valid: list[dict] = []
    for sample in samples:
        if not isinstance(sample, dict):
            continue
        ring = _normalize_ring(sample.get("polygon_json"))
        lat = float(sample.get("center_lat") or 0)
        lng = float(sample.get("center_lng") or 0)
        if ring is None or not (math.isfinite(lat) and math.isfinite(lng)):
            continue
        if abs(lat) > 90 or abs(lng) > 180:
            continue
        diameter_m = float(sample.get("diameter_m") or 0)
        if diameter_m <= 0 and float(sample.get("area_m2") or 0) > 0:
            diameter_m = 2.0 * math.sqrt(float(sample["area_m2"]) / math.pi)
        if diameter_m <= 0:
            continue
        item = dict(sample)
        item["center_lat"] = lat
        item["center_lng"] = lng
        item["diameter_m"] = diameter_m
        item["polygon_json"] = ring
        valid.append(item)
    return valid


def _local_en_m(centers: list[tuple[float, float]]) -> np.ndarray:
    """Lat/lng → este/norte locales en metros (origen = media)."""
    if not centers:
        return np.zeros((0, 2), dtype=np.float64)
    lat0 = float(np.mean([c[0] for c in centers]))
    lng0 = float(np.mean([c[1] for c in centers]))
    out = np.zeros((len(centers), 2), dtype=np.float64)
    for index, (lat, lng) in enumerate(centers):
        north = _haversine_m(lat0, lng0, lat, lng0)
        if lat < lat0:
            north = -north
        east = _haversine_m(lat0, lng0, lat0, lng)
        if lng < lng0:
            east = -east
        out[index, 0] = east
        out[index, 1] = north
    return out


def _angle_mod180(deg: float) -> float:
    value = deg % 180.0
    if value < 0:
        value += 180.0
    return value


def _nn_distances(xy: np.ndarray) -> list[float]:
    dists: list[float] = []
    for index in range(len(xy)):
        best = float("inf")
        for other in range(len(xy)):
            if index == other:
                continue
            delta = xy[index] - xy[other]
            dist = float(math.hypot(float(delta[0]), float(delta[1])))
            if dist < best:
                best = dist
        if math.isfinite(best) and best < 1e7:
            dists.append(best)
    return dists


def pattern_from_calibration(samples: list, options: dict | None = None) -> PlantingPattern:
    """Etapa A: Ø típico, azimut, paso en hilera y entre hileras."""
    options = options or {}
    valid = _valid_calibration_samples(samples)
    if len(valid) < 10:
        raise DetectorError(
            "CALIBRATION_REQUIRED",
            f"Se requieren 10 copas con centro+perímetro+Ø; hay {len(valid)} válidas.",
        )

    diameters = [float(sample["diameter_m"]) for sample in valid]
    typical_diam = float(np.median(diameters))
    if typical_diam < 0.4 or typical_diam > 40:
        raise DetectorError(
            "PATTERN_UNSTABLE",
            f"Diámetro típico fuera de rango ({typical_diam:.2f} m).",
        )

    centers = [(float(s["center_lat"]), float(s["center_lng"])) for s in valid]
    xy = _local_en_m(centers)
    # Separación mínima entre anclas (no pegadas).
    nn = _nn_distances(xy)
    median_nn = float(np.median(nn)) if nn else 0.0
    if median_nn > 0 and median_nn < 0.35 * typical_diam:
        raise DetectorError(
            "PATTERN_UNSTABLE",
            "Las 10 copas están demasiado juntas para estimar un patrón de plantación.",
        )

    dens = float(options.get("target_trees_per_ha") or options.get("densidad_ha") or 0.0)
    dens = dens if 20 <= dens <= 5000 else 0.0
    frame = options.get("planting_frame_m") if isinstance(options.get("planting_frame_m"), dict) else {}
    frame_in = float(frame.get("in_row") or 0) if frame else 0.0
    frame_between = float(frame.get("between_rows") or 0) if frame else 0.0
    az_opt = options.get("row_azimuth_deg")
    az_opt = float(az_opt) if az_opt is not None and str(az_opt) != "" else None

    # Azimut: PCA (dirección de mayor dispersión ≈ hilera o calle).
    centered = xy - xy.mean(axis=0)
    if float(np.linalg.norm(centered)) < 1e-6:
        raise DetectorError("PATTERN_UNSTABLE", "Las 10 copas colapsan en un solo punto.")
    cov = centered.T @ centered / max(1, len(centered) - 1)
    eigvals, eigvecs = np.linalg.eigh(cov)
    axis = eigvecs[:, int(np.argmax(eigvals))]
    az_pca = _angle_mod180(math.degrees(math.atan2(float(axis[1]), float(axis[0]))))

    # Refinar con ángulos de vecinos más cercanos.
    pair_angles: list[float] = []
    for index in range(len(xy)):
        best_j = -1
        best_d = float("inf")
        for other in range(len(xy)):
            if index == other:
                continue
            delta = xy[other] - xy[index]
            dist = float(math.hypot(float(delta[0]), float(delta[1])))
            if dist < best_d:
                best_d = dist
                best_j = other
        if best_j >= 0:
            delta = xy[best_j] - xy[index]
            pair_angles.append(
                _angle_mod180(math.degrees(math.atan2(float(delta[1]), float(delta[0]))))
            )
    if pair_angles:
        # Media circular mod 180.
        doubled = [math.radians(a * 2.0) for a in pair_angles]
        mean_sin = float(np.mean([math.sin(a) for a in doubled]))
        mean_cos = float(np.mean([math.cos(a) for a in doubled]))
        az_nn = _angle_mod180(math.degrees(math.atan2(mean_sin, mean_cos)) / 2.0)
        # Si PCA y NN discrepan mucho, preferir NN (hileras locales).
        diff = min(abs(az_pca - az_nn), 180.0 - abs(az_pca - az_nn))
        az_est = az_nn if diff > 35 else az_pca
    else:
        az_est = az_pca
        diff = 0.0

    row_azimuth = _angle_mod180(az_opt) if az_opt is not None else az_est

    # Proyectar a ejes hilera / entre-hilera.
    theta = math.radians(row_azimuth)
    cos_t, sin_t = math.cos(theta), math.sin(theta)
    along = centered[:, 0] * cos_t + centered[:, 1] * sin_t
    across = -centered[:, 0] * sin_t + centered[:, 1] * cos_t

    def _typical_step(values: np.ndarray) -> float:
        steps: list[float] = []
        for index, value in enumerate(values):
            best = float("inf")
            for other, other_value in enumerate(values):
                if index == other:
                    continue
                delta = abs(float(value - other_value))
                if 0.4 < delta < best:
                    best = delta
            if math.isfinite(best) and best < 1e6:
                steps.append(best)
        return float(np.median(steps)) if steps else 0.0

    step_along = _typical_step(along)
    step_across = _typical_step(across)
    spacing_density = math.sqrt(10000.0 / dens) if dens > 0 else 0.0

    source_parts: list[str] = []
    if frame_in >= 0.5 and frame_between >= 0.5:
        spacing_in_row = frame_in
        spacing_between = frame_between
        source_parts.append("frame")
    elif dens > 0:
        # Densidad manda el producto; NN afina el eje dominante.
        if step_along >= 0.8 and abs(step_along - spacing_density) / spacing_density <= 0.45:
            spacing_in_row = step_along
        else:
            spacing_in_row = spacing_density
        spacing_between = 10000.0 / (dens * spacing_in_row)
        if step_across >= 0.8 and abs(step_across - spacing_between) / max(spacing_between, 1e-6) <= 0.5:
            spacing_between = step_across
            spacing_in_row = 10000.0 / (dens * spacing_between)
        source_parts.append("density")
        if step_along >= 0.8 or step_across >= 0.8:
            source_parts.append("calibration")
    else:
        spacing_in_row = step_along or median_nn or typical_diam * 1.7
        spacing_between = step_across or spacing_in_row
        source_parts.append("calibration")

    if spacing_in_row < 0.8 or spacing_in_row > 45 or spacing_between < 0.8 or spacing_between > 60:
        raise DetectorError(
            "PATTERN_UNSTABLE",
            f"Espaciado incoherente ({spacing_in_row:.2f}×{spacing_between:.2f} m).",
        )

    # Confianza: dispersión de anclas + acuerdo NN/PCA + acuerdo con densidad.
    span = float(np.linalg.norm(xy.max(axis=0) - xy.min(axis=0)))
    span_score = min(1.0, span / max(spacing_in_row * 3.0, 1.0))
    angle_score = 1.0 if az_opt is not None else max(0.0, 1.0 - (diff / 90.0))
    dens_score = 1.0
    if dens > 0 and median_nn > 0:
        dens_score = max(0.0, 1.0 - abs(median_nn - spacing_density) / max(spacing_density, 1e-6))
    confidence = float(np.clip(0.35 * span_score + 0.35 * angle_score + 0.30 * dens_score, 0, 1))
    if confidence < 0.28 and az_opt is None:
        raise DetectorError(
            "PATTERN_UNSTABLE",
            "No hay hilera clara con las 10 marcas; reparte mejor las copas o indica azimut.",
        )

    return PlantingPattern(
        typical_diam_m=round(typical_diam, 4),
        spacing_in_row_m=round(float(spacing_in_row), 4),
        spacing_between_rows_m=round(float(spacing_between), 4),
        row_azimuth_deg=round(float(row_azimuth), 3),
        source="+".join(source_parts) or "calibration",
        pattern_confidence=round(confidence, 4),
        target_trees_per_ha=dens if dens > 0 else None,
    )


def seed_grid(
    pattern: PlantingPattern,
    width_px: int,
    height_px: int,
    gsd_m: float,
    origin_xy_px: tuple[float, float] | None = None,
    expected_trees: int | None = None,
) -> list[Seed]:
    """Etapa B: rejilla de candidatos en píxeles del orto."""
    if not gsd_m or gsd_m <= 0:
        raise DetectorError("NO_GSD", "El orto no tiene GSD usable para la rejilla.")
    step_x = pattern.spacing_in_row_m / gsd_m
    step_y = pattern.spacing_between_rows_m / gsd_m
    if step_x < 2 or step_y < 2:
        raise DetectorError("TOO_MANY_SEEDS", "Espaciado en píxeles demasiado fino; revisa GSD/densidad.")

    theta = math.radians(pattern.row_azimuth_deg)
    # En imagen, +y baja; el ENU norte ≈ −fila si el norte del CRS apunta “arriba”.
    # Trabajamos en ejes de píxel: col≈este, row≈sur ⇒ ángulo ENU se refleja en Y.
    ux, uy = math.cos(theta), -math.sin(theta)
    vx, vy = math.sin(theta), math.cos(theta)

    ox = float(origin_xy_px[0]) if origin_xy_px else width_px / 2.0
    oy = float(origin_xy_px[1]) if origin_xy_px else height_px / 2.0

    # Cubrir bbox con margen de medio paso.
    corners = [(0.0, 0.0), (width_px - 1.0, 0.0), (0.0, height_px - 1.0), (width_px - 1.0, height_px - 1.0)]
    along_vals: list[float] = []
    across_vals: list[float] = []
    for cx, cy in corners:
        dx, dy = cx - ox, cy - oy
        along_vals.append(dx * ux + dy * uy)
        across_vals.append(dx * vx + dy * vy)
    a0 = min(along_vals) - step_x
    a1 = max(along_vals) + step_x
    b0 = min(across_vals) - step_y
    b1 = max(across_vals) + step_y

    n_along = int(math.floor((a1 - a0) / step_x)) + 1
    n_across = int(math.floor((b1 - b0) / step_y)) + 1
    rough = n_along * n_across
    max_seeds = 50_000
    if expected_trees and expected_trees > 0:
        max_seeds = min(max_seeds, max(200, int(expected_trees * 1.35) + 50))
    if rough > max_seeds * 1.2:
        raise DetectorError(
            "TOO_MANY_SEEDS",
            f"La rejilla generaría ~{rough} seeds; sectoriza el orto o revisa densidad.",
        )

    seeds: list[Seed] = []
    for row_i in range(n_across):
        across = b0 + row_i * step_y
        for col_i in range(n_along):
            along = a0 + col_i * step_x
            x = ox + along * ux + across * vx
            y = oy + along * uy + across * vy
            if x < -step_x or y < -step_y or x > width_px + step_x or y > height_px + step_y:
                continue
            if x < 0 or y < 0 or x >= width_px or y >= height_px:
                continue
            seeds.append(
                Seed(
                    seed_id=f"r{row_i}-c{col_i}",
                    x_px=float(x),
                    y_px=float(y),
                    row_i=row_i,
                    col_i=col_i,
                )
            )
            if len(seeds) > max_seeds:
                raise DetectorError(
                    "TOO_MANY_SEEDS",
                    f"Más de {max_seeds} seeds; reduce el área o corrige densidad.",
                )
    return seeds


def confirm_seed(
    canopy: np.ndarray,
    lum: np.ndarray,
    texture: np.ndarray,
    dark_blob: np.ndarray,
    labels: np.ndarray,
    seed_x: float,
    seed_y: float,
    pattern: PlantingPattern,
    gsd_m: float,
    appearance: MarkAppearance | None = None,
    greenness: np.ndarray | None = None,
) -> Candidate | None:
    """Etapa C: confirma (o descarta) un seed con evidencia RGB local."""
    height, width = canopy.shape[:2]
    sx = int(round(seed_x))
    sy = int(round(seed_y))
    if sx < 0 or sy < 0 or sx >= width or sy >= height:
        return None

    typical_r = max(2.0, (pattern.typical_diam_m * 0.5) / gsd_m)
    max_shift_px = max(2.0, (0.25 * pattern.spacing_in_row_m) / gsd_m)
    search = int(math.ceil(max_shift_px))
    x0, x1 = max(0, sx - search), min(width, sx + search + 1)
    y0, y1 = max(0, sy - search), min(height, sy + search + 1)
    patch = canopy[y0:y1, x0:x1].astype(np.float32)
    if patch.size == 0:
        return None

    # Pico ponderado al centro del seed (evita enganchar sombra/borde lejano).
    yy, xx = np.mgrid[y0:y1, x0:x1]
    dist2 = (xx - seed_x) ** 2 + (yy - seed_y) ** 2
    allowed = dist2 <= (max_shift_px * max_shift_px)
    if not np.any(allowed):
        return None
    sigma2 = max(4.0, (max_shift_px * 0.55) ** 2)
    weight = np.exp(-dist2 / (2.0 * sigma2)).astype(np.float32)
    # Distancia al borde de vegetación favorece el interior de la copa.
    local_mask = (labels[y0:y1, x0:x1] > 0).astype(np.uint8)
    if local_mask.any():
        dist_in = cv2.distanceTransform(local_mask, cv2.DIST_L2, 5)
        interior = np.minimum(dist_in / max(typical_r * 0.35, 1.0), 1.5)
    else:
        interior = np.zeros_like(patch)
    scored = np.where(allowed, patch * weight * (0.55 + 0.45 * interior), -1.0)
    peak_score = float(scored.max())
    if peak_score < 28:
        return None
    py, px = np.unravel_index(int(np.argmax(scored)), scored.shape)
    cx = float(x0 + px)
    cy = float(y0 + py)
    # Si el centro del seed ya es creíble, no te vayas al borde.
    center_val = float(canopy[sy, sx])
    if center_val >= 55 and math.hypot(cx - seed_x, cy - seed_y) > max_shift_px * 0.45:
        cx, cy = float(seed_x), float(seed_y)
    ix, iy = int(round(cx)), int(round(cy))
    ix = min(max(ix, 0), width - 1)
    iy = min(max(iy, 0), height - 1)

    peak = float(canopy[iy, ix])
    score_norm = peak / 255.0
    local_lum = float(lum[iy, ix])
    local_texture = float(texture[iy, ix])
    local_dark = float(dark_blob[iy, ix])
    local_green = float(greenness[iy, ix]) if greenness is not None else 0.0
    texture_score = min(1.0, local_texture / 12.0)
    dark_score = min(1.0, local_dark / 22.0)
    shadow_score = _shadow_support(lum, ix, iy, typical_r)
    if score_norm < 0.20 and texture_score < 0.22:
        return None

    appearance_score = 1.0
    if appearance is not None:
        # Media local en un núcleo pequeño: el trazo de marca no es un solo pixel.
        r = max(1, int(round(typical_r * 0.28)))
        py0, py1 = max(0, iy - r), min(height, iy + r + 1)
        px0, px1 = max(0, ix - r), min(width, ix + r + 1)
        core_lum = float(lum[py0:py1, px0:px1].mean())
        core_texture = float(texture[py0:py1, px0:px1].mean())
        core_dark = float(dark_blob[py0:py1, px0:px1].mean())
        if greenness is not None:
            core_green = float(greenness[py0:py1, px0:px1].mean())
        else:
            core_green = local_green
        if not appearance.accepts(core_lum, core_green, core_texture, core_dark):
            return None
        appearance_score = appearance.match_score(
            core_lum, core_green, core_texture, core_dark
        )

    radius = typical_r
    contour_px, contour_area = _contour_for_seed(labels, ix, iy, radius)
    typical_area = math.pi * (pattern.typical_diam_m * 0.5) ** 2
    if contour_area > 0:
        area_m2 = contour_area * gsd_m * gsd_m
        if area_m2 < typical_area * 0.12 or area_m2 > typical_area * 2.8:
            contour_area = 0.0
            contour_px = []
        else:
            radius = max(
                typical_r * 0.45,
                min(math.sqrt(contour_area / math.pi), typical_r * 1.45),
            )
    if contour_area <= 0:
        # Evidencia en el seed pero máscara incompleta → círculo del Ø típico.
        if score_norm < 0.28 and texture_score < 0.30:
            return None
        contour_area = math.pi * radius * radius
        contour_px = []

    confidence = 100.0 * (
        0.34 * score_norm
        + 0.18 * texture_score
        + 0.14 * dark_score
        + 0.10 * shadow_score
        + 0.16 * appearance_score
        + 0.08 * min(1.0, typical_r / max(radius, 1.0))
    )
    if confidence < 34:
        return None

    shift_m = math.hypot(cx - seed_x, cy - seed_y) * gsd_m
    return Candidate(
        x_px=cx,
        y_px=cy,
        radius_px=float(radius),
        confidence=float(round(confidence, 1)),
        area_px=float(contour_area),
        contour_px=contour_px,
        shift_m=float(round(shift_m, 3)),
    )


def _apply_semaphore(trees: list[dict]) -> tuple[float, float]:
    areas = np.asarray(
        [float(tree.get("area_px") or 0) for tree in trees if tree.get("area_px") is not None],
        dtype=np.float64,
    )
    mean_area = float(areas.mean()) if len(areas) else 0.0
    std_area = float(areas.std()) if len(areas) else 0.0
    for tree in trees:
        area_px = float(tree.get("area_px") or 0)
        z_score = (area_px - mean_area) / std_area if std_area > 1e-9 else 0.0
        metrics = dict(tree.get("metrics_json") or {})
        metrics["z"] = round(z_score, 4)
        tree["metrics_json"] = metrics
        if tree.get("is_manual"):
            tree["sem_key"] = "verde"
            continue
        if z_score < -1.1:
            tree["sem_key"] = "rojo"
        elif z_score < -0.45:
            tree["sem_key"] = "amarillo"
        elif z_score > 1.0:
            tree["sem_key"] = "azul"
        else:
            tree["sem_key"] = "verde"
    return mean_area, std_area


def _size_band(ortho_ha: float | None) -> str:
    if ortho_ha is None:
        return "M"
    if ortho_ha <= 1.0:
        return "S"
    if ortho_ha <= 10.0:
        return "M"
    return "L"


def _samples_pixel_origin(
    dataset: rasterio.io.DatasetReader,
    samples: list[dict],
) -> tuple[float, float] | None:
    xs: list[float] = []
    ys: list[float] = []
    for sample in samples:
        lat = float(sample["center_lat"])
        lng = float(sample["center_lng"])
        try:
            xs_crs, ys_crs = warp_transform("EPSG:4326", dataset.crs, [lng], [lat])
            col, row = ~dataset.transform * (xs_crs[0], ys_crs[0])
        except Exception:
            continue
        if math.isfinite(col) and math.isfinite(row):
            xs.append(float(col))
            ys.append(float(row))
    if not xs:
        return None
    return float(np.mean(xs)), float(np.mean(ys))


def _candidates_to_trees(
    dataset: rasterio.io.DatasetReader,
    candidates: list[Candidate],
    gsd_m: float | None,
) -> list[dict]:
    centers, polygons = _to_wgs84(dataset, candidates)
    trees: list[dict] = []
    for index, candidate in enumerate(candidates):
        area_m2 = candidate.area_px * gsd_m * gsd_m if gsd_m else None
        diameter_m = 2.0 * candidate.radius_px * gsd_m if gsd_m else None
        lat, lng = centers[index]
        trees.append(
            {
                "tree_index": index + 1,
                "stable_id": candidate.seed_id or str(index + 1),
                "center_lat": float(lat),
                "center_lng": float(lng),
                "area_px": round(candidate.area_px, 2),
                "area_m2": round(area_m2, 3) if area_m2 is not None else None,
                "diameter_m": round(diameter_m, 3) if diameter_m is not None else None,
                "confidence": candidate.confidence,
                "sem_key": "verde",
                "polygon_json": polygons[index],
                "is_manual": False,
                "metrics_json": {
                    "source": "grid_confirmed",
                    "from_calibration": False,
                    "seed_id": candidate.seed_id,
                    "shift_m": candidate.shift_m,
                    "radius_px": round(candidate.radius_px, 2),
                    "z": 0.0,
                },
            }
        )
    return trees


def merge_and_score(
    confirmed: list[dict],
    anchors: list[dict],
    pattern: PlantingPattern,
    missing_count: int,
    seeds_total: int,
    ortho_ha: float | None,
    gsd_m: float | None,
    extra_stats: dict | None = None,
) -> tuple[list[dict], dict]:
    """Etapa D: anclas + confirmados + semáforo + stats."""
    trees, replaced = _merge_calibration_anchors(
        confirmed, anchors, pattern.spacing_in_row_m
    )
    for tree in trees:
        metrics = dict(tree.get("metrics_json") or {})
        if tree.get("is_manual"):
            metrics["source"] = "calibration"
            metrics["from_calibration"] = True
        tree["metrics_json"] = metrics
    mean_area, std_area = _apply_semaphore(trees)
    dens = pattern.target_trees_per_ha
    expected = int(round(dens * ortho_ha)) if dens and ortho_ha and ortho_ha > 0 else None
    stats = {
        "count": len(trees),
        "meanArea": round(mean_area, 3),
        "stdArea": round(std_area, 3),
        "gsdM": gsd_m,
        "detectorVersion": DETECTOR_VERSION,
        "detectorMode": "grid_v1",
        "professional": True,
        "validationStatus": "requires_review",
        "calibrationAnchors": len(anchors),
        "calibrationReplaced": replaced,
        "missingCount": int(missing_count),
        "seedsTotal": int(seeds_total),
        "confirmed": len(confirmed),
        "expectedSpacingM": round(pattern.spacing_in_row_m, 3),
        "targetTreesPerHa": dens,
        "expectedTrees": expected,
        "orthoAreaHa": round(ortho_ha, 4) if ortho_ha else None,
        "plantingPattern": pattern.as_dict(),
        "band": _size_band(ortho_ha),
        "quality": {
            "pattern_confidence": pattern.pattern_confidence,
            "frame_vs_density_ok": True,
            "gsd_cm": round(gsd_m * 100.0, 2) if gsd_m else None,
        },
    }
    if extra_stats:
        stats.update(extra_stats)
    if trees:
        latitudes = [float(tree["center_lat"]) for tree in trees]
        longitudes = [float(tree["center_lng"]) for tree in trees]
        stats["treeBbox"] = [
            float(min(longitudes)),
            float(min(latitudes)),
            float(max(longitudes)),
            float(max(latitudes)),
        ]
    return trees, stats


def _prepare_confirm_masks(
    tile: np.ndarray,
    pattern: PlantingPattern,
    gsd_m: float,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    rgb = _rgb_u8(tile)
    features = _feature_maps(rgb)
    canopy = features["canopy"]
    lum = features["lum"]
    texture = features["texture"]
    dark_blob = features["dark_blob"]
    greenness = features["greenness"]
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    valid = hsv[:, :, 2] > 12
    mask = np.zeros(canopy.shape, dtype=np.uint8)
    if valid.any() and int(canopy[valid].max()) >= 8:
        otsu_value, _ = cv2.threshold(canopy[valid], 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        positive = canopy[valid & (canopy > 8)]
        pct_thr = int(np.percentile(positive, 58)) if positive.size > 80 else int(otsu_value)
        threshold = max(50, min(int(otsu_value * 0.82), pct_thr))
        mask = ((canopy >= threshold) & valid).astype(np.uint8) * 255
        min_radius_px = max(2.5, (pattern.typical_diam_m * 0.35) / gsd_m)
        morphology_radius = max(1, min(12, int(round(min_radius_px * 0.12))))
        kernel = cv2.getStructuringElement(
            cv2.MORPH_ELLIPSE, (_odd(morphology_radius * 2 + 1), _odd(morphology_radius * 2 + 1))
        )
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    _, labels = cv2.connectedComponents((mask > 0).astype(np.uint8), connectivity=8)
    return canopy, lum, texture, dark_blob, labels, greenness


def analyze_geotiff_grid(
    path: str,
    options: dict,
    progress: Callable[[int, str], None] | None = None,
) -> tuple[list[dict], dict]:
    """Pipeline oficial: patrón → rejilla → confirmar → merge."""

    def report(value: int, phase: str) -> None:
        if progress:
            progress(max(0, min(100, int(value))), phase)

    calibration = options.get("calibration") if isinstance(options.get("calibration"), dict) else {}
    samples_raw = calibration.get("samples") if isinstance(calibration.get("samples"), list) else []
    samples = _valid_calibration_samples(samples_raw)
    pattern = pattern_from_calibration(samples_raw, options)

    tile_size = max(512, min(int(options.get("tile_size") or 2048), 4096))
    # Overlap debe cubrir > 1× Ø típico.
    min_overlap = int(math.ceil((pattern.typical_diam_m / max(float(options.get("gsd_m") or 0.05), 1e-3)) * 1.05))
    overlap = max(64, min(int(options.get("overlap") or max(256, min_overlap)), tile_size // 3))
    provided_gsd = float(options.get("gsd_m") or 0.0) or None

    report(8, "Abriendo GeoTIFF")
    with rasterio.open(path) as dataset:
        if dataset.count < 1:
            raise ValueError("El GeoTIFF no tiene bandas.")
        gsd_m = _meters_per_pixel(dataset, provided_gsd)
        if not gsd_m or gsd_m <= 0:
            raise DetectorError("NO_GSD", "El GeoTIFF no tiene escala (GSD) usable.")

        total_pixels = float(dataset.width * dataset.height)
        ortho_ha = (total_pixels * gsd_m * gsd_m) / 10000.0
        if ortho_ha < 0.05:
            raise DetectorError("PATTERN_UNSTABLE", "Orto demasiado pequeño (< 0.05 ha).")
        dens = pattern.target_trees_per_ha
        expected_trees = int(round(dens * ortho_ha)) if dens else None
        if expected_trees and expected_trees > 50_000:
            raise DetectorError(
                "TOO_MANY_SEEDS",
                f"Se esperan ~{expected_trees} plantas; sectoriza el predio antes de analizar.",
            )

        report(12, "Aprendiendo aspecto de tus 10 marcas")
        appearance = appearance_from_calibration(dataset, samples)

        report(14, "Generando rejilla de plantación")
        origin = _samples_pixel_origin(dataset, samples)
        seeds = seed_grid(
            pattern,
            width_px=dataset.width,
            height_px=dataset.height,
            gsd_m=gsd_m,
            origin_xy_px=origin,
            expected_trees=expected_trees,
        )

        # Índice espacial de seeds por celda de tile.
        cell = float(tile_size - overlap)
        buckets: dict[tuple[int, int], list[Seed]] = {}
        for seed in seeds:
            bx = int(seed.x_px // max(cell, 1.0))
            by = int(seed.y_px // max(cell, 1.0))
            buckets.setdefault((bx, by), []).append(seed)

        x_starts = _window_starts(dataset.width, tile_size, overlap)
        y_starts = _window_starts(dataset.height, tile_size, overlap)
        total_tiles = len(x_starts) * len(y_starts)
        confirmed: list[Candidate] = []
        completed = 0
        seen_seeds: set[str] = set()

        report(18, f"Confirmando {len(seeds)} candidatos")
        for y0 in y_starts:
            for x0 in x_starts:
                width = min(tile_size, dataset.width - x0)
                height = min(tile_size, dataset.height - y0)
                # Seeds cuyo centro cae en el core del tile (evita dobles en overlap).
                local_seeds: list[Seed] = []
                bx0 = int(x0 // max(cell, 1.0)) - 1
                by0 = int(y0 // max(cell, 1.0)) - 1
                bx1 = int((x0 + width) // max(cell, 1.0)) + 1
                by1 = int((y0 + height) // max(cell, 1.0)) + 1
                for by in range(by0, by1 + 1):
                    for bx in range(bx0, bx1 + 1):
                        for seed in buckets.get((bx, by), ()):
                            if seed.seed_id in seen_seeds:
                                continue
                            if not _in_core(
                                seed.x_px,
                                seed.y_px,
                                x0,
                                y0,
                                width,
                                height,
                                dataset.width,
                                dataset.height,
                                overlap,
                            ):
                                continue
                            local_seeds.append(seed)
                if local_seeds:
                    window = Window(x0, y0, width, height)
                    tile = dataset.read(
                        indexes=list(range(1, min(dataset.count, 3) + 1)),
                        window=window,
                        boundless=False,
                    )
                    canopy, lum, texture, dark_blob, labels, greenness = _prepare_confirm_masks(
                        tile, pattern, gsd_m
                    )
                    for seed in local_seeds:
                        seen_seeds.add(seed.seed_id)
                        hit = confirm_seed(
                            canopy,
                            lum,
                            texture,
                            dark_blob,
                            labels,
                            seed.x_px - x0,
                            seed.y_px - y0,
                            pattern,
                            gsd_m,
                            appearance=appearance,
                            greenness=greenness,
                        )
                        if hit is None:
                            continue
                        hit.x_px += x0
                        hit.y_px += y0
                        hit.contour_px = [(px + x0, py + y0) for px, py in hit.contour_px]
                        hit.seed_id = seed.seed_id
                        confirmed.append(hit)
                completed += 1
                report(
                    18 + int(62 * completed / max(total_tiles, 1)),
                    f"Confirmando tile {completed}/{total_tiles}",
                )

        missing_count = max(0, len(seeds) - len(confirmed))

        report(84, "Convirtiendo coordenadas")
        auto_trees = _candidates_to_trees(dataset, confirmed, gsd_m)
        report(88, "Fusionando anclas de calibración")
        anchors = _calibration_anchor_trees(samples, gsd_m)
        cover_area = float(sum(float(c.area_px) for c in confirmed))
        # Anclas suman después del merge; cover se recalcula abajo.
        trees, stats = merge_and_score(
            auto_trees,
            anchors,
            pattern,
            missing_count=missing_count,
            seeds_total=len(seeds),
            ortho_ha=ortho_ha,
            gsd_m=gsd_m,
            extra_stats={
                "widthPx": dataset.width,
                "heightPx": dataset.height,
                "tileSize": tile_size,
                "overlap": overlap,
                "tilesProcessed": total_tiles,
                "calibrationSamples": len(samples_raw),
                "calibrated": len(samples) >= 10,
                "appearancePrior": bool(appearance),
                "appearance": appearance.as_dict() if appearance else None,
            },
        )
        cover_area = float(sum(float(tree.get("area_px") or 0) for tree in trees))
        stats["coverPct"] = round(min(100.0, 100.0 * cover_area / total_pixels), 3)
        report(90, "Preparando resultados")
        return trees, stats


def analyze_geotiff_classical(
    path: str,
    options: dict,
    progress: Callable[[int, str], None] | None = None,
) -> tuple[list[dict], dict]:
    """Modo experimental: búsqueda libre por tiles (motor anterior)."""

    tile_size = max(512, min(int(options.get("tile_size") or 2048), 4096))
    overlap = max(64, min(int(options.get("overlap") or 256), tile_size // 3))
    min_canopy_m = max(0.3, float(options.get("min_canopy_m") or 1.0))
    max_canopy_m = max(min_canopy_m + 0.5, float(options.get("max_canopy_m") or 12.0))
    provided_gsd = float(options.get("gsd_m") or 0.0) or None
    calibration = options.get("calibration") if isinstance(options.get("calibration"), dict) else {}
    samples = calibration.get("samples") if isinstance(calibration.get("samples"), list) else []
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
        if expected_trees and expected_trees >= 10 and len(candidates) > expected_trees * 1.45:
            candidates = sorted(candidates, key=lambda c: c.confidence, reverse=True)
            candidates = candidates[: max(expected_trees, int(math.ceil(expected_trees * 1.35)))]

        report(84, "Convirtiendo coordenadas")
        trees = _candidates_to_trees(dataset, candidates, gsd_m)
        for tree in trees:
            metrics = dict(tree.get("metrics_json") or {})
            metrics["source"] = "classical"
            tree["metrics_json"] = metrics

        report(88, "Aplicando copas de calibración")
        anchors = _calibration_anchor_trees(samples, gsd_m)
        trees, replaced = _merge_calibration_anchors(trees, anchors, expected_spacing_m)
        mean_area, std_area = _apply_semaphore(trees)
        cover_area = float(sum(float(tree.get("area_px") or 0) for tree in trees))
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
            "detectorVersion": CLASSICAL_DETECTOR_VERSION,
            "detectorMode": "classical_v1",
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


def analyze_geotiff(
    path: str,
    options: dict,
    progress: Callable[[int, str], None] | None = None,
) -> tuple[list[dict], dict]:
    """Entrada única: por defecto ``grid_v1``; ``classical_v1`` solo experimental."""
    mode = str((options or {}).get("detector_mode") or "grid_v1").strip().lower()
    if mode in {"classical", "classical_v1", "free_search", "v1.2"}:
        return analyze_geotiff_classical(path, options, progress=progress)
    return analyze_geotiff_grid(path, options, progress=progress)