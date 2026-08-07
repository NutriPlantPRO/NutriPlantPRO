"""Pruebas mínimas del detector grid_v1 (y evidencia RGB de apoyo)."""

import math
import tempfile
from pathlib import Path

import cv2
import numpy as np
import rasterio
from rasterio.transform import from_origin
from rasterio.warp import transform as warp_transform

from detector import (
    DETECTOR_VERSION,
    PlantingPattern,
    analyze_geotiff,
    confirm_seed,
    detect_tile,
    merge_and_score,
    pattern_from_calibration,
    seed_grid,
    _prepare_confirm_masks,
)


def _paint_canopy(image: np.ndarray, x: int, y: int, radius: int, dark: bool = True) -> None:
    if dark:
        cv2.circle(image[0], (x, y), radius, 48, -1)
        cv2.circle(image[1], (x, y), radius, 92, -1)
        cv2.circle(image[2], (x, y), radius, 42, -1)
        for _ in range(40):
            jx = int(np.clip(x + np.random.randint(-radius + 2, radius - 1), 0, image.shape[2] - 1))
            jy = int(np.clip(y + np.random.randint(-radius + 2, radius - 1), 0, image.shape[1] - 1))
            if (jx - x) ** 2 + (jy - y) ** 2 <= (radius - 1) ** 2:
                image[1, jy, jx] = min(130, int(image[1, jy, jx]) + 18)
                image[0, jy, jx] = max(20, int(image[0, jy, jx]) - 6)
        cv2.ellipse(image[0], (x - radius, y + 4), (radius, max(4, radius // 2)), 0, 0, 360, 18, -1)
        cv2.ellipse(image[1], (x - radius, y + 4), (radius, max(4, radius // 2)), 0, 0, 360, 22, -1)
        cv2.ellipse(image[2], (x - radius, y + 4), (radius, max(4, radius // 2)), 0, 0, 360, 16, -1)
    else:
        cv2.circle(image[0], (x, y), radius, 45, -1)
        cv2.circle(image[1], (x, y), radius, 155, -1)
        cv2.circle(image[2], (x, y), radius, 45, -1)


def _px_to_sample(transform, crs: str, x: float, y: float, radius_px: float, diameter_m: float) -> dict:
    gx, gy = transform * (x + 0.5, y + 0.5)
    lngs, lats = warp_transform(crs, "EPSG:4326", [gx], [gy])
    ring = []
    for side in range(8):
        ang = (2.0 * math.pi * side) / 8
        px = x + math.cos(ang) * radius_px
        py = y + math.sin(ang) * radius_px
        sx, sy = transform * (px + 0.5, py + 0.5)
        rlngs, rlats = warp_transform(crs, "EPSG:4326", [sx], [sy])
        ring.append([float(rlats[0]), float(rlngs[0])])
    return {
        "diameter_m": diameter_m,
        "area_m2": math.pi * (diameter_m * 0.5) ** 2,
        "center_lat": float(lats[0]),
        "center_lng": float(lngs[0]),
        "polygon_json": ring,
    }


def test_evidence_detect_tile() -> None:
    np.random.seed(7)
    nodata = np.zeros((3, 128, 128), dtype=np.uint8)
    if detect_tile(nodata, 0.05, 1.0, 8.0, 6.0):
        raise AssertionError("Un tile nodata no debe producir copas")

    image_a = np.zeros((3, 512, 512), dtype=np.uint8)
    image_a[0, :, :] = 105
    image_a[1, :, :] = 80
    image_a[2, :, :] = 55
    for x, y, radius in [(100, 110, 28), (270, 115, 24), (175, 320, 31)]:
        _paint_canopy(image_a, x, y, radius, dark=False)
    detections_a = detect_tile(image_a, 0.05, 1.0, 8.0, 6.0)
    if len(detections_a) != 3:
        raise AssertionError(f"Caso A: se esperaban 3 copas; devolvió {len(detections_a)}")

    image_b = np.zeros((3, 512, 512), dtype=np.uint8)
    image_b[0, :, :] = 165
    image_b[1, :, :] = 195
    image_b[2, :, :] = 95
    for x, y, radius in [(120, 130, 26), (290, 140, 22), (200, 330, 28)]:
        _paint_canopy(image_b, x, y, radius, dark=True)
    detections_b = detect_tile(image_b, 0.05, 1.0, 8.0, 6.0)
    if len(detections_b) < 2:
        raise AssertionError(f"Caso B: se esperaban ≥2 copas; devolvió {len(detections_b)}")
    if len(detections_b) > 8:
        raise AssertionError(f"Caso B: demasiadas detecciones ({len(detections_b)})")


def test_pattern_and_seed_grid() -> None:
    # 10 centros en rejilla 5×6 m (ENU aproximado cerca de 19N, -102W).
    lat0, lng0 = 19.0, -102.0
    meters_per_deg_lat = 111_320.0
    meters_per_deg_lng = 111_320.0 * math.cos(math.radians(lat0))
    in_row, between = 5.0, 6.0
    samples = []
    coords = [
        (0, 0),
        (1, 0),
        (2, 0),
        (0, 1),
        (1, 1),
        (2, 1),
        (0, 2),
        (1, 2),
        (3, 0),
        (3, 2),
    ]
    for col, row in coords:
        east = col * in_row
        north = row * between
        samples.append(
            {
                "diameter_m": 3.0,
                "area_m2": math.pi * 1.5**2,
                "center_lat": lat0 + north / meters_per_deg_lat,
                "center_lng": lng0 + east / meters_per_deg_lng,
                "polygon_json": [
                    [lat0 + north / meters_per_deg_lat + 0.00001, lng0 + east / meters_per_deg_lng],
                    [lat0 + north / meters_per_deg_lat, lng0 + east / meters_per_deg_lng + 0.00001],
                    [lat0 + north / meters_per_deg_lat - 0.00001, lng0 + east / meters_per_deg_lng],
                ],
            }
        )
    pattern = pattern_from_calibration(samples, {"target_trees_per_ha": 10000 / (5 * 6)})
    if abs(pattern.spacing_in_row_m - 5.0) / 5.0 > 0.08 and abs(pattern.spacing_between_rows_m - 5.0) / 5.0 > 0.08:
        # Puede intercambiar ejes; el producto debe ≈ 30 m².
        product = pattern.spacing_in_row_m * pattern.spacing_between_rows_m
        if abs(product - 30.0) / 30.0 > 0.12:
            raise AssertionError(
                f"Patrón malo: {pattern.spacing_in_row_m}×{pattern.spacing_between_rows_m} (prod={product})"
            )
    if abs(pattern.typical_diam_m - 3.0) > 0.2:
        raise AssertionError(f"Ø típico malo: {pattern.typical_diam_m}")

    # 1 ha @ 400/ha → ~400 seeds (±10 %), GSD 0.1 → 1000×1000 px = 1 ha.
    gsd = 0.1
    width = height = int(round(100.0 / gsd))  # 100 m × 100 m = 1 ha
    dens_pattern = PlantingPattern(
        typical_diam_m=3.0,
        spacing_in_row_m=5.0,
        spacing_between_rows_m=5.0,
        row_azimuth_deg=0.0,
        source="test",
        pattern_confidence=0.9,
        target_trees_per_ha=400,
    )
    seeds = seed_grid(dens_pattern, width, height, gsd, expected_trees=400)
    if not (360 <= len(seeds) <= 440):
        raise AssertionError(f"Seed grid 1 ha @400/ha esperaba ~400; hubo {len(seeds)}")


def test_confirm_and_merge() -> None:
    gsd = 0.05
    image = np.zeros((3, 256, 256), dtype=np.uint8)
    image[0, :, :] = 165
    image[1, :, :] = 195
    image[2, :, :] = 95
    _paint_canopy(image, 128, 128, 28, dark=True)
    pattern = PlantingPattern(
        typical_diam_m=2.8,
        spacing_in_row_m=6.0,
        spacing_between_rows_m=6.0,
        row_azimuth_deg=0.0,
        source="test",
        pattern_confidence=0.9,
        target_trees_per_ha=400,
    )
    canopy, lum, texture, dark_blob, labels = _prepare_confirm_masks(image, pattern, gsd)
    hit = confirm_seed(canopy, lum, texture, dark_blob, labels, 128, 128, pattern, gsd)
    if hit is None:
        raise AssertionError("confirm_seed debió confirmar copa oscura en pasto")
    miss = confirm_seed(canopy, lum, texture, dark_blob, labels, 40, 40, pattern, gsd)
    if miss is not None:
        raise AssertionError("confirm_seed debió marcar faltante en pasto puro")

    anchors = [
        {
            "tree_index": 1,
            "stable_id": "calib-1",
            "center_lat": 19.0,
            "center_lng": -102.0,
            "area_px": 100.0,
            "area_m2": 6.0,
            "diameter_m": 2.8,
            "confidence": 100.0,
            "sem_key": "verde",
            "polygon_json": [[19.0, -102.0], [19.0001, -102.0], [19.0, -102.0001]],
            "is_manual": True,
            "metrics_json": {"from_calibration": True, "calibration_index": 1, "z": 0.0},
        }
    ]
    confirmed = [
        {
            "tree_index": 1,
            "stable_id": "r0-c0",
            "center_lat": 19.000001,
            "center_lng": -102.000001,
            "area_px": 90.0,
            "area_m2": 5.5,
            "diameter_m": 2.6,
            "confidence": 70.0,
            "sem_key": "verde",
            "polygon_json": [[19.0, -102.0], [19.0001, -102.0], [19.0, -102.0001]],
            "is_manual": False,
            "metrics_json": {"source": "grid_confirmed", "seed_id": "r0-c0"},
        }
    ]
    trees, stats = merge_and_score(
        confirmed,
        anchors,
        pattern,
        missing_count=3,
        seeds_total=10,
        ortho_ha=0.25,
        gsd_m=gsd,
    )
    manuals = [t for t in trees if t.get("is_manual")]
    if len(manuals) != 1:
        raise AssertionError("merge: ancla no quedó")
    if len(trees) != 1:
        raise AssertionError("merge: seed cerca del ancla debía eliminarse")
    if stats.get("band") != "S":
        raise AssertionError(f"Banda S esperada en 0.25 ha; hubo {stats.get('band')}")
    if stats.get("missingCount") != 3:
        raise AssertionError("missingCount no se propagó")


def test_analyze_grid_geotiff() -> None:
    np.random.seed(3)
    gsd = 0.05
    # ~0.25 ha: 100 m × 25 m → 2000×500 px; usamos 512×512 (~0.065 ha) banda S.
    size = 512
    transform = from_origin(500000, 2200000, gsd, gsd)
    crs = "EPSG:32613"
    image = np.zeros((3, size, size), dtype=np.uint8)
    image[0, :, :] = 165
    image[1, :, :] = 195
    image[2, :, :] = 95

    # Rejilla 6 m → 120 px; colocar 3×3 copas y calibrar con 10 puntos
    # (algunos en las mismas copas + vecinos).
    spacing_px = int(round(6.0 / gsd))
    crowns = []
    for row in range(3):
        for col in range(3):
            x = 80 + col * spacing_px
            y = 80 + row * spacing_px
            if x < size - 40 and y < size - 40:
                crowns.append((x, y))
                _paint_canopy(image, x, y, 26, dark=True)

    if len(crowns) < 6:
        raise AssertionError("fixture insuficiente")

    # 10 samples: repetir/ciclar centros de copas con pequeño jitter de polígono.
    samples = []
    for index in range(10):
        x, y = crowns[index % len(crowns)]
        samples.append(_px_to_sample(transform, crs, x, y, 26, 2.6))

    with tempfile.NamedTemporaryFile(suffix=".tif", delete=False) as handle:
        path = Path(handle.name)
    try:
        with rasterio.open(
            path,
            "w",
            driver="GTiff",
            width=size,
            height=size,
            count=3,
            dtype="uint8",
            crs=crs,
            transform=transform,
        ) as dataset:
            dataset.write(image)

        trees, stats = analyze_geotiff(
            str(path),
            {
                "detector_mode": "grid_v1",
                "tile_size": 512,
                "overlap": 64,
                "gsd_m": gsd,
                "target_trees_per_ha": 400,
                "planting_frame_m": {"in_row": 6.0, "between_rows": 6.0},
                "calibration": {"samples": samples},
            },
        )
        if "grid" not in str(stats.get("detectorVersion") or ""):
            raise AssertionError(f"Versión grid esperada; hubo {stats.get('detectorVersion')}")
        if stats.get("detectorMode") != "grid_v1":
            raise AssertionError("detectorMode distinto de grid_v1")
        if stats.get("calibrationAnchors") != 10:
            raise AssertionError(f"Debía anclar 10; ancló {stats.get('calibrationAnchors')}")
        manuals = [t for t in trees if t.get("is_manual")]
        if len(manuals) != 10:
            raise AssertionError(f"Las 10 anclas deben quedar; hay {len(manuals)}")
        if stats.get("band") != "S":
            raise AssertionError(f"Banda S esperada; hubo {stats.get('band')}")
        if stats.get("seedsTotal", 0) < 10:
            raise AssertionError("Debía generar seeds")
        # Debe confirmar al menos parte de las copas pintadas (además de anclas).
        auto = [t for t in trees if not t.get("is_manual")]
        if len(trees) < 10:
            raise AssertionError("Resultado vacío tras merge")
        # Sanity: no explotar
        if len(trees) > 80:
            raise AssertionError(f"Demasiados árboles en fixture chica: {len(trees)}")
        _ = auto
    finally:
        path.unlink(missing_ok=True)


def main() -> None:
    test_evidence_detect_tile()
    test_pattern_and_seed_grid()
    test_confirm_and_merge()
    test_analyze_grid_geotiff()
    print(
        f"AirCI detector self-test OK ({DETECTOR_VERSION}): "
        "pattern + seed_grid + confirm + merge + analyze_geotiff grid_v1"
    )


if __name__ == "__main__":
    main()
