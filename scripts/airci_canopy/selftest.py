"""Prueba mínima reproducible del detector sin GeoTIFF externo."""

import tempfile
from pathlib import Path

import cv2
import numpy as np
import rasterio
from rasterio.transform import from_origin

from detector import analyze_geotiff, detect_tile


def main() -> None:
    nodata = np.zeros((3, 128, 128), dtype=np.uint8)
    if detect_tile(nodata, 0.05, 1.0, 8.0, 6.0):
        raise AssertionError("Un tile nodata no debe producir copas")

    image = np.zeros((3, 512, 512), dtype=np.uint8)
    image[0, :, :] = 105
    image[1, :, :] = 80
    image[2, :, :] = 55
    for x, y, radius in [(100, 110, 28), (270, 115, 24), (175, 320, 31)]:
        cv2.circle(image[0], (x, y), radius, 45, -1)
        cv2.circle(image[1], (x, y), radius, 155, -1)
        cv2.circle(image[2], (x, y), radius, 45, -1)

    detections = detect_tile(
        image,
        gsd_m=0.05,
        min_canopy_m=1.0,
        max_canopy_m=8.0,
        expected_spacing_m=6.0,
    )
    if len(detections) != 3:
        raise AssertionError(f"Se esperaban 3 copas sintéticas; detector devolvió {len(detections)}")

    with tempfile.NamedTemporaryFile(suffix=".tif", delete=False) as handle:
        path = Path(handle.name)
    try:
        with rasterio.open(
            path,
            "w",
            driver="GTiff",
            width=512,
            height=512,
            count=3,
            dtype="uint8",
            crs="EPSG:32613",
            transform=from_origin(500000, 2200000, 0.05, 0.05),
        ) as dataset:
            dataset.write(image)
        trees, stats = analyze_geotiff(
            str(path),
            {
                "tile_size": 512,
                "overlap": 64,
                "gsd_m": 0.05,
                "min_canopy_m": 1.0,
                "max_canopy_m": 8.0,
                "expected_spacing_m": 6.0,
                "calibration": {
                    "samples": [
                        {"diameter_m": 2.8}
                        for _ in range(10)
                    ]
                },
            },
        )
        if len(trees) != 3 or stats["count"] != 3:
            raise AssertionError(
                f"GeoTIFF completo esperaba 3 copas; devolvió {len(trees)}"
            )
        if not all(-180 <= tree["center_lng"] <= 180 for tree in trees):
            raise AssertionError("Coordenadas WGS84 inválidas")
        if not stats["calibrated"] or stats["calibrationSamples"] != 10:
            raise AssertionError("No se aplicó la calibración de 10 copas")
    finally:
        path.unlink(missing_ok=True)

    print("AirCI detector self-test OK: tile + GeoTIFF = 3/3 copas")


if __name__ == "__main__":
    main()
