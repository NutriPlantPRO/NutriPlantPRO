"""Contorno de copa con SAM guiado por caja DeepForest.

Criterio de borde: segmentación por modelo (box prompt), no ExG/color de suelo.
"""

from __future__ import annotations

import math
from typing import Any

import cv2
import numpy as np
import rasterio
from rasterio.windows import Window

_SAM_MODEL = None
_SAM_WEIGHTS = None


def load_sam(weights: str = "mobile_sam.pt"):
    """Carga SAM una vez (reutilizable en toda la corrida)."""
    global _SAM_MODEL, _SAM_WEIGHTS
    if _SAM_MODEL is not None and _SAM_WEIGHTS == weights:
        return _SAM_MODEL
    from ultralytics import SAM

    _SAM_MODEL = SAM(weights)
    _SAM_WEIGHTS = weights
    return _SAM_MODEL


def _to_u8_rgb(tile: np.ndarray) -> np.ndarray:
    bands = []
    for i in range(min(3, tile.shape[0])):
        arr = tile[i].astype(np.float32)
        finite = np.isfinite(arr)
        if not np.any(finite):
            bands.append(np.zeros(arr.shape, np.uint8))
            continue
        sample = arr[finite]
        lo, hi = np.percentile(sample, [1, 99])
        if hi <= lo:
            bands.append(np.zeros(arr.shape, np.uint8))
            continue
        out = np.clip((arr - lo) * 255.0 / (hi - lo), 0, 255).astype(np.uint8)
        bands.append(out)
    while len(bands) < 3:
        bands.append(bands[-1].copy())
    return np.dstack(bands)


def contour_from_sam_box(
    dataset: rasterio.io.DatasetReader,
    xmin: float,
    ymin: float,
    xmax: float,
    ymax: float,
    *,
    model: Any = None,
    weights: str = "mobile_sam.pt",
    pad_frac: float = 0.15,
) -> tuple[list[tuple[float, float]], float] | None:
    """Devuelve anillo en píxeles del raster + área px, o None si falla."""
    sam = model or load_sam(weights)
    bw = max(1.0, xmax - xmin)
    bh = max(1.0, ymax - ymin)
    pad = max(8, int(round(pad_frac * max(bw, bh))))
    x0 = max(0, int(math.floor(xmin)) - pad)
    y0 = max(0, int(math.floor(ymin)) - pad)
    x1 = min(dataset.width, int(math.ceil(xmax)) + pad)
    y1 = min(dataset.height, int(math.ceil(ymax)) + pad)
    w = x1 - x0
    h = y1 - y0
    if w < 16 or h < 16:
        return None

    window = Window(x0, y0, w, h)
    tile = dataset.read(
        indexes=list(range(1, min(dataset.count, 3) + 1)),
        window=window,
        boundless=False,
    )
    rgb = _to_u8_rgb(tile)

    # bbox en coords del crop
    bx0 = float(xmin - x0)
    by0 = float(ymin - y0)
    bx1 = float(xmax - x0)
    by1 = float(ymax - y0)
    # clip
    bx0 = max(0.0, min(w - 2.0, bx0))
    by0 = max(0.0, min(h - 2.0, by0))
    bx1 = max(bx0 + 2.0, min(float(w), bx1))
    by1 = max(by0 + 2.0, min(float(h), by1))

    try:
        results = sam.predict(
            source=rgb,
            bboxes=[[bx0, by0, bx1, by1]],
            verbose=False,
        )
    except Exception:
        return None

    if not results:
        return None
    r0 = results[0]
    if r0.masks is None:
        return None

    # Máscara binaria de la mejor (primera) predicción
    masks = r0.masks.data
    if masks is None or len(masks) == 0:
        return None
    mask = masks[0].detach().cpu().numpy()
    if mask.shape[0] != h or mask.shape[1] != w:
        mask = cv2.resize(mask.astype(np.float32), (w, h), interpolation=cv2.INTER_LINEAR)
    mask_u8 = (mask > 0.5).astype(np.uint8) * 255
    if cv2.countNonZero(mask_u8) < 20:
        return None

    # Quedarse con el componente que más solapa el centro de la caja
    cx = (bx0 + bx1) * 0.5
    cy = (by0 + by1) * 0.5
    nlab, labels, stats, cents = cv2.connectedComponentsWithStats(mask_u8, connectivity=8)
    best = -1
    best_score = 1e18
    min_a = max(20, int(0.05 * (bx1 - bx0) * (by1 - by0)))
    for i in range(1, nlab):
        area = int(stats[i, cv2.CC_STAT_AREA])
        if area < min_a:
            continue
        dx = float(cents[i][0]) - cx
        dy = float(cents[i][1]) - cy
        score = (dx * dx + dy * dy) / max(area, 1)
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
    approx = cv2.approxPolyDP(cnt, max(0.8, 0.004 * peri), True)
    if len(approx) < 3:
        approx = cnt
    ring: list[tuple[float, float]] = []
    for p in approx.reshape(-1, 2):
        ring.append((float(p[0] + x0), float(p[1] + y0)))
    if len(ring) >= 3 and ring[0] != ring[-1]:
        ring.append(ring[0])
    area_px = float(cv2.contourArea(cnt))
    if len(ring) < 4 or area_px < min_a:
        return None
    return ring, area_px
