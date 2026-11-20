"""Motor DeepForest (modelo pretrained) → candidatos AirCI.

No inventa el detector: usa weecology/deepforest-tree (RetinaNet sobre RGB aéreo).
Convierte cajas a polígonos geo y filtra por predio / tamaño.
"""

from __future__ import annotations

import math
from typing import Callable

import numpy as np
import rasterio
from rasterio.warp import transform as warp_transform
from rasterio.windows import Window


DEEPFOREST_VERSION = "deepforest-tree-weecology"


def _to_u8_rgb(tile: np.ndarray) -> np.ndarray:
    """(C,H,W) → uint8 RGB HWC, stretch percentil suave."""
    bands = []
    for i in range(min(3, tile.shape[0])):
        arr = tile[i].astype(np.float32)
        finite = np.isfinite(arr)
        if not finite.any():
            bands.append(np.zeros(arr.shape, dtype=np.uint8))
            continue
        sample = arr[finite]
        lo = float(np.percentile(sample, 1.0))
        hi = float(np.percentile(sample, 99.0))
        if hi <= lo:
            lo = float(sample.min())
            hi = float(sample.max()) if sample.max() > lo else lo + 1.0
        scaled = np.clip((arr - lo) * (255.0 / (hi - lo)), 0, 255)
        scaled[~finite] = 0
        bands.append(scaled.astype(np.uint8))
    while len(bands) < 3:
        bands.append(bands[-1].copy())
    return np.dstack(bands)


def _bbox_to_ellipse_ring(xmin: float, ymin: float, xmax: float, ymax: float, sides: int = 16) -> list[tuple[float, float]]:
    cx = (xmin + xmax) * 0.5
    cy = (ymin + ymax) * 0.5
    rx = max(1.0, (xmax - xmin) * 0.5)
    ry = max(1.0, (ymax - ymin) * 0.5)
    ring: list[tuple[float, float]] = []
    for i in range(sides):
        ang = (2.0 * math.pi * i) / sides
        ring.append((cx + math.cos(ang) * rx, cy + math.sin(ang) * ry))
    return ring


def _px_to_wgs84(
    dataset: rasterio.io.DatasetReader,
    points_xy: list[tuple[float, float]],
) -> list[list[float]]:
    if not points_xy:
        return []
    cols = [p[0] for p in points_xy]
    rows = [p[1] for p in points_xy]
    xs, ys = rasterio.transform.xy(dataset.transform, rows, cols, offset="center")
    if dataset.crs and str(dataset.crs).upper() not in {"EPSG:4326", "WGS84"}:
        lngs, lats = warp_transform(dataset.crs, "EPSG:4326", list(xs), list(ys))
    else:
        lngs, lats = list(xs), list(ys)
    return [[float(lat), float(lng)] for lat, lng in zip(lats, lngs)]


def _load_model():
    from deepforest import main as df_main

    model = df_main.deepforest()
    model.load_model(model_name="weecology/deepforest-tree", revision="main")
    return model


def analyze_geotiff_deepforest(
    path: str,
    options: dict | None = None,
    progress: Callable[[int, str], None] | None = None,
) -> tuple[list[dict], dict]:
    """Corre DeepForest por ventanas sobre el GeoTIFF RGB."""

    options = options or {}

    def report(pct: int, phase: str) -> None:
        if progress:
            progress(max(0, min(100, int(pct))), phase)

    report(5, "Cargando DeepForest pretrained")
    model = _load_model()

    # ~5 cm → patch ~800 px ≈ 40 m (mismo FOV que el modelo a 10 cm / 400 px)
    provided_gsd = float(options.get("gsd_m") or 0.0) or None
    patch_size = int(options.get("patch_size") or 0)
    patch_overlap = float(options.get("patch_overlap") or 0.25)
    score_thresh = float(options.get("score_thresh") or 0.12)
    iou_threshold = float(options.get("iou_threshold") or 0.25)
    try:
        # Baja el umbral interno del RetinaNet si el config lo permite.
        if hasattr(model, "config") and isinstance(model.config, dict):
            model.config["score_thresh"] = score_thresh
        if hasattr(model, "model") and hasattr(model.model, "score_thresh"):
            model.model.score_thresh = score_thresh
    except Exception:
        pass
    min_canopy_m = max(0.4, float(options.get("min_canopy_m") or 1.2))
    max_canopy_m = max(min_canopy_m + 0.5, float(options.get("max_canopy_m") or 14.0))

    report(10, "Abriendo GeoTIFF")
    with rasterio.open(path) as dataset:
        if dataset.count < 1:
            raise ValueError("El GeoTIFF no tiene bandas.")
        gsd_m = None
        try:
            from detector import _meters_per_pixel

            gsd_m = _meters_per_pixel(dataset, provided_gsd)
        except Exception:
            gsd_m = provided_gsd

        if patch_size <= 0:
            if gsd_m and gsd_m > 0:
                # FOV objetivo ~40 m
                patch_size = int(round(40.0 / gsd_m))
                patch_size = max(400, min(1200, patch_size))
            else:
                patch_size = 800

        # DeepForest recomienda overlap; clamp
        patch_overlap = max(0.05, min(0.45, patch_overlap))
        step = max(64, int(round(patch_size * (1.0 - patch_overlap))))

        x_starts = list(range(0, max(1, dataset.width - patch_size + 1), step))
        y_starts = list(range(0, max(1, dataset.height - patch_size + 1), step))
        if not x_starts or x_starts[-1] != max(0, dataset.width - patch_size):
            x_starts.append(max(0, dataset.width - patch_size))
        if not y_starts or y_starts[-1] != max(0, dataset.height - patch_size):
            y_starts.append(max(0, dataset.height - patch_size))
        # unique keep order
        def _uniq(seq: list[int]) -> list[int]:
            seen = set()
            out = []
            for v in seq:
                if v not in seen:
                    seen.add(v)
                    out.append(v)
            return out

        x_starts = _uniq(x_starts)
        y_starts = _uniq(y_starts)
        total = max(1, len(x_starts) * len(y_starts))

        boxes_all: list[dict] = []
        done = 0
        for y0 in y_starts:
            for x0 in x_starts:
                w = min(patch_size, dataset.width - x0)
                h = min(patch_size, dataset.height - y0)
                if w < 64 or h < 64:
                    done += 1
                    continue
                window = Window(x0, y0, w, h)
                tile = dataset.read(
                    indexes=list(range(1, min(dataset.count, 3) + 1)),
                    window=window,
                    boundless=False,
                )
                rgb = _to_u8_rgb(tile)
                # DeepForest espera HWC uint8
                try:
                    pred = model.predict_image(image=rgb)
                except TypeError:
                    # APIs antiguas
                    pred = model.predict_image(np.array(rgb))
                if pred is None:
                    done += 1
                    report(12 + int(70 * done / total), f"DeepForest {done}/{total}")
                    continue
                # DataFrame con xmin,ymin,xmax,ymax,score,label
                try:
                    records = pred.to_dict("records")
                except Exception:
                    records = list(pred) if isinstance(pred, list) else []
                for row in records:
                    try:
                        xmin = float(row.get("xmin"))
                        ymin = float(row.get("ymin"))
                        xmax = float(row.get("xmax"))
                        ymax = float(row.get("ymax"))
                        score = float(row.get("score") or row.get("confidence") or 0)
                    except Exception:
                        continue
                    if score < score_thresh:
                        continue
                    # a coords absolutas del raster
                    boxes_all.append(
                        {
                            "xmin": xmin + x0,
                            "ymin": ymin + y0,
                            "xmax": xmax + x0,
                            "ymax": ymax + y0,
                            "score": score,
                        }
                    )
                done += 1
                report(12 + int(70 * done / total), f"DeepForest {done}/{total}")

        report(84, "NMS global + geo")
        boxes_all = _nms_boxes(boxes_all, iou_threshold)

        trees: list[dict] = []
        for index, box in enumerate(boxes_all):
            xmin, ymin, xmax, ymax = box["xmin"], box["ymin"], box["xmax"], box["ymax"]
            width_px = max(1.0, xmax - xmin)
            height_px = max(1.0, ymax - ymin)
            diam_px = (width_px + height_px) * 0.5
            if gsd_m and gsd_m > 0:
                diameter_m = diam_px * gsd_m
                if diameter_m < min_canopy_m * 0.55 or diameter_m > max_canopy_m * 1.35:
                    continue
                area_m2 = math.pi * (diameter_m * 0.5) ** 2
            else:
                diameter_m = None
                area_m2 = None
            ring_px = _bbox_to_ellipse_ring(xmin, ymin, xmax, ymax, sides=16)
            cx = (xmin + xmax) * 0.5
            cy = (ymin + ymax) * 0.5
            centers = _px_to_wgs84(dataset, [(cx, cy)])
            polygon = _px_to_wgs84(dataset, ring_px)
            if not centers or not polygon:
                continue
            lat, lng = centers[0]
            area_px = math.pi * (width_px * 0.5) * (height_px * 0.5)
            trees.append(
                {
                    "tree_index": index + 1,
                    "stable_id": f"df-{index + 1}",
                    "center_lat": float(lat),
                    "center_lng": float(lng),
                    "area_px": round(float(area_px), 2),
                    "area_m2": round(area_m2, 3) if area_m2 is not None else None,
                    "diameter_m": round(diameter_m, 3) if diameter_m is not None else None,
                    "confidence": round(float(box["score"]) * 100.0, 1),
                    "sem_key": "verde",
                    "polygon_json": polygon,
                    "is_manual": False,
                    "metrics_json": {
                        "source": "deepforest",
                        "from_calibration": False,
                        "detector": DEEPFOREST_VERSION,
                        "bbox_px": [xmin, ymin, xmax, ymax],
                        "z": 0.0,
                    },
                }
            )

        # reindex
        for i, tree in enumerate(trees, start=1):
            tree["tree_index"] = i
            tree["stable_id"] = f"df-{i}"

        # semáforo
        areas = [float(t["area_px"]) for t in trees]
        mean_area = float(np.mean(areas)) if areas else 0.0
        std_area = float(np.std(areas)) if areas else 0.0
        for tree in trees:
            z = (float(tree["area_px"]) - mean_area) / (std_area + 1e-6) if areas else 0.0
            metrics = dict(tree.get("metrics_json") or {})
            metrics["z"] = round(z, 4)
            tree["metrics_json"] = metrics
            if z <= -1.0:
                tree["sem_key"] = "rojo"
            elif z <= -0.35:
                tree["sem_key"] = "amarillo"
            elif z >= 1.0:
                tree["sem_key"] = "azul"
            else:
                tree["sem_key"] = "verde"

        total_pixels = float(dataset.width * dataset.height)
        ortho_ha = (
            (total_pixels * gsd_m * gsd_m) / 10000.0 if gsd_m and gsd_m > 0 else None
        )
        dens = float(options.get("target_trees_per_ha") or 0) or None
        expected = int(round(dens * ortho_ha)) if dens and ortho_ha else None
        cover_area = float(sum(float(t.get("area_px") or 0) for t in trees))
        cover_pct = 100.0 * cover_area / total_pixels if total_pixels else 0.0

        stats = {
            "count": len(trees),
            "resultTrees": len(trees),
            "coverPct": round(min(100.0, cover_pct), 3),
            "meanArea": round(mean_area, 3),
            "stdArea": round(std_area, 3),
            "gsdM": gsd_m,
            "widthPx": dataset.width,
            "heightPx": dataset.height,
            "tileSize": patch_size,
            "overlap": int(round(patch_size * patch_overlap)),
            "tilesProcessed": total,
            "detectorVersion": DEEPFOREST_VERSION,
            "detectorMode": "deepforest",
            "professional": True,
            "validationStatus": "requires_review",
            "calibrationSamples": 0,
            "calibrated": False,
            "expectedSpacingM": None,
            "targetTreesPerHa": dens,
            "expectedTrees": expected,
            "orthoAreaHa": round(ortho_ha, 4) if ortho_ha else None,
            "scoreThresh": score_thresh,
            "iouThreshold": iou_threshold,
        }
        if trees:
            latitudes = [float(t["center_lat"]) for t in trees]
            longitudes = [float(t["center_lng"]) for t in trees]
            stats["treeBbox"] = [
                float(min(longitudes)),
                float(min(latitudes)),
                float(max(longitudes)),
                float(max(latitudes)),
            ]
        report(95, "DeepForest listo")
        return trees, stats


def _nms_boxes(boxes: list[dict], iou_thresh: float) -> list[dict]:
    if not boxes:
        return []
    ordered = sorted(boxes, key=lambda b: b["score"], reverse=True)
    kept: list[dict] = []

    def iou(a: dict, b: dict) -> float:
        ax1, ay1, ax2, ay2 = a["xmin"], a["ymin"], a["xmax"], a["ymax"]
        bx1, by1, bx2, by2 = b["xmin"], b["ymin"], b["xmax"], b["ymax"]
        ix1, iy1 = max(ax1, bx1), max(ay1, by1)
        ix2, iy2 = min(ax2, bx2), min(ay2, by2)
        iw, ih = max(0.0, ix2 - ix1), max(0.0, iy2 - iy1)
        inter = iw * ih
        if inter <= 0:
            return 0.0
        area_a = max(0.0, ax2 - ax1) * max(0.0, ay2 - ay1)
        area_b = max(0.0, bx2 - bx1) * max(0.0, by2 - by1)
        union = area_a + area_b - inter
        return inter / union if union > 0 else 0.0

    for box in ordered:
        if any(iou(box, k) > iou_thresh for k in kept):
            continue
        kept.append(box)
    return kept
