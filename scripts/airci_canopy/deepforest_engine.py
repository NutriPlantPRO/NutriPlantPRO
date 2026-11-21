"""Motor DeepForest (modelo pretrained) → candidatos AirCI.

No inventa el detector: usa weecology/deepforest-tree (RetinaNet sobre RGB aéreo).
Convierte cajas a polígonos geo y filtra por predio / tamaño.
"""

from __future__ import annotations

import math
from typing import Callable

import cv2
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


def _shrink_ellipse_ring(
    xmin: float, ymin: float, xmax: float, ymax: float, scale: float = 0.62, sides: int = 24
) -> list[tuple[float, float]]:
    """Fallback chico (no elipse gorda del bbox completo)."""
    cx = (xmin + xmax) * 0.5
    cy = (ymin + ymax) * 0.5
    rx = max(1.0, (xmax - xmin) * 0.5 * scale)
    ry = max(1.0, (ymax - ymin) * 0.5 * scale)
    ring: list[tuple[float, float]] = []
    for i in range(sides):
        ang = (2.0 * math.pi * i) / sides
        ring.append((cx + math.cos(ang) * rx, cy + math.sin(ang) * ry))
    return ring


def _refine_crown_ring_in_bbox(
    dataset: rasterio.io.DatasetReader,
    xmin: float,
    ymin: float,
    xmax: float,
    ymax: float,
) -> tuple[list[tuple[float, float]], float] | None:
    """IA ubicó el árbol (bbox). Contorno = follaje real dentro de la caja.

    Prioridad: verdor/sat local. Rechaza sombra y suelo. Sin GrabCut libre
    (se comía sombra). Si no hay follaje usable → None (se descarta).
    """
    pad = max(2, int(round(0.05 * max(xmax - xmin, ymax - ymin))))
    x0 = max(0, int(math.floor(xmin)) - pad)
    y0 = max(0, int(math.floor(ymin)) - pad)
    x1 = min(dataset.width, int(math.ceil(xmax)) + pad)
    y1 = min(dataset.height, int(math.ceil(ymax)) + pad)
    w = x1 - x0
    h = y1 - y0
    if w < 12 or h < 12:
        return None

    window = Window(x0, y0, w, h)
    tile = dataset.read(
        indexes=list(range(1, min(dataset.count, 3) + 1)),
        window=window,
        boundless=False,
    )
    rgb = _to_u8_rgb(tile)
    r = rgb[:, :, 0].astype(np.float32)
    g = rgb[:, :, 1].astype(np.float32)
    b = rgb[:, :, 2].astype(np.float32)
    tot = np.maximum(r + g + b, 1.0)
    gchr = (g / tot) - 0.5 * ((r / tot) + (b / tot))
    lum = 0.30 * r + 0.59 * g + 0.11 * b
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    sat = hsv[:, :, 1].astype(np.float32)
    val = hsv[:, :, 2].astype(np.float32)

    # Sombra proyectada / suelo: no son copa
    shadow = (
        ((val < 50) & (sat < 40) & (gchr < 0.018))
        | ((val < 34) & (gchr < 0.022))
        | ((lum < 32) & (sat < 45) & (gchr < 0.020))
    )
    soil = ((gchr < 0.012) & (lum > 62)) | ((gchr < 0.008) & (lum > 48))

    rx0 = max(0, int(math.floor(xmin)) - x0)
    ry0 = max(0, int(math.floor(ymin)) - y0)
    rx1 = min(w, int(math.ceil(xmax)) - x0)
    ry1 = min(h, int(math.ceil(ymax)) - y0)
    if rx1 - rx0 < 8 or ry1 - ry0 < 8:
        return None

    local = np.zeros((h, w), dtype=bool)
    local[ry0:ry1, rx0:rx1] = True
    # Núcleo central (evita bordes de calle dentro del bbox)
    mx0 = rx0 + max(1, (rx1 - rx0) // 10)
    my0 = ry0 + max(1, (ry1 - ry0) // 10)
    mx1 = rx1 - max(1, (rx1 - rx0) // 10)
    my1 = ry1 - max(1, (ry1 - ry0) // 10)
    core = np.zeros((h, w), dtype=bool)
    if mx1 > mx0 and my1 > my0:
        core[my0:my1, mx0:mx1] = True
    else:
        core = local

    clean = local & (~shadow) & (~soil)
    sample = gchr[clean & core]
    if sample.size < 25:
        sample = gchr[clean]
    if sample.size < 12:
        return None

    # Umbral más bajo: cubrir la copa entera, no solo el núcleo brillante
    thr_g = float(np.percentile(sample, 35))
    thr_g = max(0.010, min(thr_g, 0.028))
    thr_sat = float(np.percentile(sat[clean & core], 25)) if np.count_nonzero(clean & core) > 15 else 18.0
    thr_sat = max(16.0, min(thr_sat, 45.0))

    veg = clean & (gchr >= thr_g) & (sat >= thr_sat)
    # Aguacate oscuro / verde apagado
    veg = veg | (
        local
        & (~shadow)
        & (~soil)
        & (gchr >= max(0.008, thr_g - 0.006))
        & (sat >= max(14.0, thr_sat - 6))
        & (val >= 34)
        & (val <= 200)
    )

    fg_u8 = (veg.astype(np.uint8) * 255)
    k3 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    k5 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    fg_u8 = cv2.morphologyEx(fg_u8, cv2.MORPH_OPEN, k3, iterations=1)
    fg_u8 = cv2.morphologyEx(fg_u8, cv2.MORPH_CLOSE, k5, iterations=2)
    # Un poco de dilatación para no quedarnos en el “punto” central
    fg_u8 = cv2.dilate(fg_u8, k3, iterations=1)
    fg_u8 = cv2.GaussianBlur(fg_u8, (5, 5), 0)
    _, fg_u8 = cv2.threshold(fg_u8, 90, 255, cv2.THRESH_BINARY)
    fg_u8 = fg_u8 & (local.astype(np.uint8) * 255)
    fg_u8[shadow | soil] = 0

    cx_c = ((xmin + xmax) * 0.5) - x0
    cy_c = ((ymin + ymax) * 0.5) - y0
    nlab, labels, stats, cents = cv2.connectedComponentsWithStats(fg_u8, connectivity=8)
    best = -1
    best_score = 1e18
    min_a = max(20, int(0.06 * (rx1 - rx0) * (ry1 - ry0)))
    max_a = int(0.98 * (rx1 - rx0) * (ry1 - ry0))
    for i in range(1, nlab):
        area = int(stats[i, cv2.CC_STAT_AREA])
        if area < min_a or area > max_a:
            continue
        dx = float(cents[i][0]) - cx_c
        dy = float(cents[i][1]) - cy_c
        dist = dx * dx + dy * dy
        score = dist / max(area, 1)
        if score < best_score:
            best_score = score
            best = i
    if best < 0:
        return None

    comp = (labels == best).astype(np.uint8) * 255
    contours, _ = cv2.findContours(comp, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not contours:
        return None
    cnt = max(contours, key=cv2.contourArea)
    peri = cv2.arcLength(cnt, True)
    approx = cv2.approxPolyDP(cnt, max(0.7, 0.005 * peri), True)
    if len(approx) < 3:
        approx = cnt
    ring: list[tuple[float, float]] = []
    for p in approx.reshape(-1, 2):
        ring.append((float(p[0] + x0), float(p[1] + y0)))
    if len(ring) >= 3 and ring[0] != ring[-1]:
        ring.append(ring[0])
    area_px = float(cv2.contourArea(cnt))
    if len(ring) < 4 or area_px < min_a * 0.4:
        return None
    return ring, area_px


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


def _load_model(weights: str | None = None):
    from deepforest import main as df_main

    if weights:
        model = df_main.deepforest.load_from_checkpoint(weights)
        return model, f"finetuned:{weights}"
    model = df_main.deepforest()
    model.load_model(model_name="weecology/deepforest-tree", revision="main")
    return model, DEEPFOREST_VERSION


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

    weights = options.get("weights") or options.get("checkpoint") or None
    if weights:
        report(5, f"Cargando DeepForest fine-tuned ({weights})")
    else:
        report(5, "Cargando DeepForest pretrained")
    model, detector_version = _load_model(str(weights) if weights else None)

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

        report(84, "NMS + contorno (SAM / caja)")
        boxes_all = _nms_boxes(boxes_all, iou_threshold)
        # Contorno: sam (default) | foliage (legacy color) | ellipse | none→ellipse_shrink
        contour_mode = str(options.get("contour_mode") or "sam").strip().lower()
        if options.get("refine_contours") is False:
            contour_mode = "ellipse"
        sam_model = None
        if contour_mode == "sam":
            try:
                from sam_contour import load_sam, contour_from_sam_box

                report(85, "Cargando SAM (contorno por caja)")
                sam_model = load_sam(str(options.get("sam_weights") or "mobile_sam.pt"))
            except Exception as exc:
                print(f"SAM no disponible ({exc}); contorno = elipse reducida", flush=True)
                contour_mode = "ellipse"
                contour_from_sam_box = None  # type: ignore
        else:
            contour_from_sam_box = None  # type: ignore

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
            else:
                diameter_m = None
            contour_kind = "ellipse_shrink"
            ring_px: list[tuple[float, float]]
            area_px: float
            if contour_mode == "sam" and sam_model is not None and contour_from_sam_box is not None:
                refined = contour_from_sam_box(
                    dataset,
                    xmin,
                    ymin,
                    xmax,
                    ymax,
                    model=sam_model,
                    weights=str(options.get("sam_weights") or "mobile_sam.pt"),
                )
                if refined is None:
                    # Sin máscara SAM usable → no inventar borde de color
                    continue
                ring_px, area_px = refined
                contour_kind = "sam_box"
            elif contour_mode == "foliage":
                refined = _refine_crown_ring_in_bbox(dataset, xmin, ymin, xmax, ymax)
                if refined is None:
                    continue
                ring_px, area_px = refined
                contour_kind = "foliage_mask"
            else:
                ring_px = _shrink_ellipse_ring(xmin, ymin, xmax, ymax, scale=0.7, sides=24)
                area_px = math.pi * (width_px * 0.5 * 0.7) * (height_px * 0.5 * 0.7)
                contour_kind = "ellipse_shrink"
            if gsd_m and gsd_m > 0:
                area_m2 = float(area_px) * (gsd_m * gsd_m)
                diameter_m = 2.0 * math.sqrt(max(area_m2, 0.0) / math.pi)
            else:
                area_m2 = None
            xs = [p[0] for p in ring_px]
            ys = [p[1] for p in ring_px]
            cx = float(np.mean(xs)) if xs else (xmin + xmax) * 0.5
            cy = float(np.mean(ys)) if ys else (ymin + ymax) * 0.5
            centers = _px_to_wgs84(dataset, [(cx, cy)])
            polygon = _px_to_wgs84(dataset, ring_px[:-1] if len(ring_px) > 3 and ring_px[0] == ring_px[-1] else ring_px)
            if not centers or not polygon:
                continue
            lat, lng = centers[0]
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
                        "detector": detector_version,
                        "contour": contour_kind,
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
            "detectorVersion": detector_version,
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
