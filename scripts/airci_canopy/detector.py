"""Detector clásico AirCI v1.

Procesa GeoTIFF por ventanas solapadas. No carga el raster completo en memoria.
La salida es determinista y está diseñada como línea base medible; un modelo de
segmentación entrenado puede sustituir ``detect_tile`` sin cambiar el contrato.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Callable, Iterable

import cv2
import numpy as np
import rasterio
from rasterio.windows import Window
from rasterio.warp import transform as warp_transform


DETECTOR_VERSION = "airci-classical-v1.0.0"


@dataclass
class Candidate:
    x_px: float
    y_px: float
    radius_px: float
    confidence: float
    area_px: float


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


def detect_tile(
    tile: np.ndarray,
    gsd_m: float | None,
    min_canopy_m: float,
    max_canopy_m: float,
    expected_spacing_m: float,
) -> list[Candidate]:
    """Detecta centros de copa en una ventana RGB."""

    rgb = _rgb_u8(tile)
    red = rgb[:, :, 0].astype(np.int16)
    green = rgb[:, :, 1].astype(np.int16)
    blue = rgb[:, :, 2].astype(np.int16)
    exg = np.clip(2 * green - red - blue + 128, 0, 255).astype(np.uint8)

    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    saturation = hsv[:, :, 1]
    value = hsv[:, :, 2]
    valid = value > 12
    if not valid.any():
        return []

    otsu_value, _ = cv2.threshold(exg[valid], 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    threshold = max(132, int(otsu_value))
    mask = ((exg >= threshold) & (saturation >= 24) & valid).astype(np.uint8) * 255

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

    distance = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
    peak_window = _odd(min(101, max(5, int(round(spacing_px * 0.55)))))
    dilated = cv2.dilate(
        distance,
        cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (peak_window, peak_window)),
    )
    min_peak = max(1.5, min_radius_px * 0.28)
    peaks = ((distance >= dilated - 1e-4) & (distance >= min_peak)).astype(np.uint8)

    count, labels, stats, centroids = cv2.connectedComponentsWithStats(peaks, connectivity=8)
    found: list[Candidate] = []
    for label in range(1, count):
        cx, cy = centroids[label]
        x = int(round(cx))
        y = int(round(cy))
        if x < 0 or y < 0 or y >= distance.shape[0] or x >= distance.shape[1]:
            continue
        raw_radius = float(distance[y, x])
        radius = max(min_radius_px * 0.45, min(raw_radius, max_radius_px))
        local_exg = float(exg[y, x])
        radius_score = min(1.0, raw_radius / max(min_radius_px, 1.0))
        green_score = max(0.0, min(1.0, (local_exg - threshold + 45.0) / 90.0))
        confidence = 100.0 * (0.62 * radius_score + 0.38 * green_score)
        if confidence < 34:
            continue
        found.append(
            Candidate(
                x_px=float(cx),
                y_px=float(cy),
                radius_px=float(radius),
                confidence=float(round(confidence, 1)),
                area_px=float(math.pi * radius * radius),
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
    for candidate in candidates:
        x_geo, y_geo = dataset.transform * (candidate.x_px + 0.5, candidate.y_px + 0.5)
        center_xs.append(x_geo)
        center_ys.append(y_geo)
        for side in range(sides):
            angle = (2.0 * math.pi * side) / sides
            px = candidate.x_px + math.cos(angle) * candidate.radius_px
            py = candidate.y_px + math.sin(angle) * candidate.radius_px
            gx, gy = dataset.transform * (px + 0.5, py + 0.5)
            ring_xs.append(gx)
            ring_ys.append(gy)

    center_lngs, center_lats = warp_transform(dataset.crs, "EPSG:4326", center_xs, center_ys)
    ring_lngs, ring_lats = warp_transform(dataset.crs, "EPSG:4326", ring_xs, ring_ys)
    centers = list(zip(center_lats, center_lngs))
    polygons: list[list[list[float]]] = []
    for index in range(len(candidates)):
        start = index * sides
        ring = [
            [float(ring_lats[start + side]), float(ring_lngs[start + side])]
            for side in range(sides)
        ]
        polygons.append(ring)
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
    expected_spacing_m = max(0.0, float(options.get("expected_spacing_m") or 0.0))
    provided_gsd = float(options.get("gsd_m") or 0.0) or None

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

        report(84, "Convirtiendo coordenadas")
        centers, polygons = _to_wgs84(dataset, candidates)
        areas = np.asarray([candidate.area_px for candidate in candidates], dtype=np.float64)
        mean_area = float(areas.mean()) if len(areas) else 0.0
        std_area = float(areas.std()) if len(areas) else 0.0
        total_pixels = float(dataset.width * dataset.height)

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
                    "metrics_json": {
                        "radius_px": round(candidate.radius_px, 2),
                        "z": round(z_score, 4),
                    },
                }
            )

        cover_pct = 100.0 * float(areas.sum()) / total_pixels if total_pixels else 0.0
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
        }
        if centers:
            latitudes = [center[0] for center in centers]
            longitudes = [center[1] for center in centers]
            stats["treeBbox"] = [
                float(min(longitudes)),
                float(min(latitudes)),
                float(max(longitudes)),
                float(max(latitudes)),
            ]
        report(90, "Preparando resultados")
        return trees, stats
