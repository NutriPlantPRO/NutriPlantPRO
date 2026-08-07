"""Prueba mínima reproducible del detector sin GeoTIFF externo."""

import math
import tempfile
from pathlib import Path

import cv2
import numpy as np
import rasterio
from rasterio.transform import from_origin
from rasterio.warp import transform as warp_transform

from detector import analyze_geotiff, detect_tile


def _paint_canopy(image: np.ndarray, x: int, y: int, radius: int, dark: bool = True) -> None:
    if dark:
        # Copa forestal oscura + textura
        cv2.circle(image[0], (x, y), radius, 48, -1)
        cv2.circle(image[1], (x, y), radius, 92, -1)
        cv2.circle(image[2], (x, y), radius, 42, -1)
        for _ in range(40):
            jx = int(np.clip(x + np.random.randint(-radius + 2, radius - 1), 0, image.shape[2] - 1))
            jy = int(np.clip(y + np.random.randint(-radius + 2, radius - 1), 0, image.shape[1] - 1))
            if (jx - x) ** 2 + (jy - y) ** 2 <= (radius - 1) ** 2:
                image[1, jy, jx] = min(130, int(image[1, jy, jx]) + 18)
                image[0, jy, jx] = max(20, int(image[0, jy, jx]) - 6)
        # Sombra a la izquierda
        cv2.ellipse(image[0], (x - radius, y + 4), (radius, max(4, radius // 2)), 0, 0, 360, 18, -1)
        cv2.ellipse(image[1], (x - radius, y + 4), (radius, max(4, radius // 2)), 0, 0, 360, 22, -1)
        cv2.ellipse(image[2], (x - radius, y + 4), (radius, max(4, radius // 2)), 0, 0, 360, 16, -1)
    else:
        cv2.circle(image[0], (x, y), radius, 45, -1)
        cv2.circle(image[1], (x, y), radius, 155, -1)
        cv2.circle(image[2], (x, y), radius, 45, -1)


def main() -> None:
    np.random.seed(7)
    nodata = np.zeros((3, 128, 128), dtype=np.uint8)
    if detect_tile(nodata, 0.05, 1.0, 8.0, 6.0):
        raise AssertionError("Un tile nodata no debe producir copas")

    # Caso A: fondo marrón + copas verdes clásicas
    image_a = np.zeros((3, 512, 512), dtype=np.uint8)
    image_a[0, :, :] = 105
    image_a[1, :, :] = 80
    image_a[2, :, :] = 55
    crowns_a = [(100, 110, 28), (270, 115, 24), (175, 320, 31)]
    for x, y, radius in crowns_a:
        _paint_canopy(image_a, x, y, radius, dark=False)

    detections_a = detect_tile(
        image_a,
        gsd_m=0.05,
        min_canopy_m=1.0,
        max_canopy_m=8.0,
        expected_spacing_m=6.0,
    )
    if len(detections_a) != 3:
        raise AssertionError(
            f"Caso A: se esperaban 3 copas; detector devolvió {len(detections_a)}"
        )

    # Caso B: pasto limón brillante + copas oscuras (como el ejemplo del usuario)
    image_b = np.zeros((3, 512, 512), dtype=np.uint8)
    image_b[0, :, :] = 165  # pasto amarillo-verdoso
    image_b[1, :, :] = 195
    image_b[2, :, :] = 95
    crowns_b = [(120, 130, 26), (290, 140, 22), (200, 330, 28)]
    for x, y, radius in crowns_b:
        _paint_canopy(image_b, x, y, radius, dark=True)

    detections_b = detect_tile(
        image_b,
        gsd_m=0.05,
        min_canopy_m=1.0,
        max_canopy_m=8.0,
        expected_spacing_m=6.0,
    )
    if len(detections_b) < 2:
        raise AssertionError(
            f"Caso B (pasto > verde que copa): se esperaban ≥2 copas; devolvió {len(detections_b)}"
        )
    # No debe explotar marcando todo el pasto
    if len(detections_b) > 8:
        raise AssertionError(
            f"Caso B: demasiadas detecciones sobre pasto ({len(detections_b)})"
        )

    with tempfile.NamedTemporaryFile(suffix=".tif", delete=False) as handle:
        path = Path(handle.name)
    try:
        transform = from_origin(500000, 2200000, 0.05, 0.05)
        with rasterio.open(
            path,
            "w",
            driver="GTiff",
            width=512,
            height=512,
            count=3,
            dtype="uint8",
            crs="EPSG:32613",
            transform=transform,
        ) as dataset:
            dataset.write(image_a)

        x0, y0, r0 = crowns_a[0]
        gx, gy = transform * (x0 + 0.5, y0 + 0.5)
        lngs, lats = warp_transform("EPSG:32613", "EPSG:4326", [gx], [gy])
        center_lat, center_lng = float(lats[0]), float(lngs[0])
        ring = []
        for side in range(8):
            ang = (2.0 * math.pi * side) / 8
            px = x0 + math.cos(ang) * r0
            py = y0 + math.sin(ang) * r0
            sx, sy = transform * (px + 0.5, py + 0.5)
            rlngs, rlats = warp_transform("EPSG:32613", "EPSG:4326", [sx], [sy])
            ring.append([float(rlats[0]), float(rlngs[0])])

        samples = [{"diameter_m": 2.8} for _ in range(9)]
        samples.insert(
            0,
            {
                "diameter_m": 2.8,
                "area_m2": 6.15,
                "center_lat": center_lat,
                "center_lng": center_lng,
                "polygon_json": ring,
            },
        )

        trees, stats = analyze_geotiff(
            str(path),
            {
                "tile_size": 512,
                "overlap": 64,
                "gsd_m": 0.05,
                "min_canopy_m": 1.0,
                "max_canopy_m": 8.0,
                "expected_spacing_m": 6.0,
                "target_trees_per_ha": 400,
                "calibration": {"samples": samples},
            },
        )
        if stats["calibrationAnchors"] != 1:
            raise AssertionError(
                f"Debía anclar 1 copa de calibración; ancló {stats['calibrationAnchors']}"
            )
        manual = [tree for tree in trees if tree.get("is_manual")]
        if len(manual) != 1:
            raise AssertionError("La copa de calibración no quedó en el resultado")
        if manual[0]["polygon_json"] != ring:
            raise AssertionError("El perímetro de calibración no se conservó")
        if not stats["calibrated"] or stats["calibrationSamples"] != 10:
            raise AssertionError("No se aplicó la calibración de 10 copas")
        if stats.get("targetTreesPerHa") != 400:
            raise AssertionError("No se respetó la densidad del predio")
        if "v1.2" not in str(stats.get("detectorVersion") or ""):
            raise AssertionError("Versión del detector no actualizada a v1.2")
        if len(trees) != 3 or stats["count"] != 3:
            raise AssertionError(
                f"GeoTIFF completo esperaba 3 copas; devolvió {len(trees)}"
            )
    finally:
        path.unlink(missing_ok=True)

    print(
        "AirCI detector self-test OK: "
        f"A={len(detections_a)} B={len(detections_b)} + anclas calibración (v1.2)"
    )


if __name__ == "__main__":
    main()
