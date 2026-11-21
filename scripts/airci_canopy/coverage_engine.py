"""Cobertura de dosel en predio (Fase A).

Máscara vegetación/copa vs suelo → coverPct/barePct + polígonos simplificados.
No cuenta árboles. Reutiliza la señal de detector._canopy_evidence.
"""

from __future__ import annotations

import math
from typing import Callable

import cv2
import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.warp import transform as warp_transform
from rasterio import features as rio_features
from shapely.geometry import Polygon

from detector import _meters_per_pixel


COVERAGE_VERSION = "coverage_local_soil_v3_antishadow"


def _predio_area_ha(ring: list[tuple[float, float]]) -> float | None:
    if len(ring) < 3:
        return None
    lat0 = float(np.mean([p[0] for p in ring]))
    m_lat = 111320.0
    m_lng = 111320.0 * math.cos(math.radians(lat0))
    pts = [(p[1] * m_lng, p[0] * m_lat) for p in ring]
    area = 0.0
    n = len(pts)
    for i in range(n):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % n]
        area += x1 * y2 - x2 * y1
    return abs(area) * 0.5 / 10000.0


def _build_predio_mask(
    dataset: rasterio.io.DatasetReader,
    predio_ring: list[tuple[float, float]],
    out_h: int,
    out_w: int,
) -> np.ndarray:
    """Máscara bool H×W: píxeles dentro del predio (anillo lat,lng)."""
    # GeoJSON ring: lng, lat in WGS84 → CRS del raster
    lngs = [p[1] for p in predio_ring]
    lats = [p[0] for p in predio_ring]
    if dataset.crs and str(dataset.crs).upper() not in {"EPSG:4326", "WGS84"}:
        xs, ys = warp_transform("EPSG:4326", dataset.crs, lngs, lats)
    else:
        xs, ys = lngs, lats
    coords = list(zip(xs, ys))
    if coords[0] != coords[-1]:
        coords = coords + [coords[0]]
    geom = {"type": "Polygon", "coordinates": [coords]}
    # Transform escalado para el array downsampled
    from rasterio.transform import Affine

    scale_x = dataset.width / float(out_w)
    scale_y = dataset.height / float(out_h)
    transform = dataset.transform * Affine.scale(scale_x, scale_y)
    inv = rio_features.geometry_mask(
        [geom],
        out_shape=(out_h, out_w),
        transform=transform,
        invert=True,
        all_touched=False,
    )
    return inv.astype(bool)


def _rgb_u8(tile: np.ndarray) -> np.ndarray:
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


def _px_to_wgs84(dataset, cols, rows) -> list[list[float]]:
    xs, ys = rasterio.transform.xy(dataset.transform, rows, cols, offset="center")
    if dataset.crs and str(dataset.crs).upper() not in {"EPSG:4326", "WGS84"}:
        lngs, lats = warp_transform(dataset.crs, "EPSG:4326", list(xs), list(ys))
    else:
        lngs, lats = list(xs), list(ys)
    return [[float(lat), float(lng)] for lat, lng in zip(lats, lngs)]


def analyze_coverage(
    path: str,
    predio_ring: list[tuple[float, float]] | None = None,
    options: dict | None = None,
    progress: Callable[[int, str], None] | None = None,
) -> tuple[dict, list[dict]]:
    """Devuelve (stats, polygons) donde polygons son anillos [lat,lng]."""

    options = options or {}

    def report(pct: int, phase: str) -> None:
        if progress:
            progress(max(0, min(100, int(pct))), phase)

    max_dim = int(options.get("max_dim") or 3500)
    # Percentil del contraste local (suelo claro vecino − píxel): más alto = menos cobertura.
    score_pct = float(options.get("score_percentile") or 56.0)
    min_poly_m2 = float(options.get("min_poly_m2") or 1.5)
    simplify_m = float(options.get("simplify_m") or 0.35)
    preview_path = options.get("preview_path")

    report(5, "Abriendo GeoTIFF (cobertura)")
    with rasterio.open(path) as dataset:
        if dataset.count < 1:
            raise ValueError("El GeoTIFF no tiene bandas.")
        gsd_m = None
        try:
            gsd_m = _meters_per_pixel(dataset, options.get("gsd_m"))
        except Exception:
            gsd_m = options.get("gsd_m")

        scale = max(dataset.width, dataset.height) / float(max_dim)
        scale = max(1.0, scale)
        out_w = max(64, int(round(dataset.width / scale)))
        out_h = max(64, int(round(dataset.height / scale)))
        gsd_out = (gsd_m * scale) if gsd_m else (0.05 * scale)

        report(15, f"Leyendo RGB {out_w}×{out_h}")
        data = dataset.read(
            indexes=list(range(1, min(dataset.count, 3) + 1)),
            out_shape=(min(dataset.count, 3), out_h, out_w),
            resampling=Resampling.bilinear,
        )
        rgb = _rgb_u8(data)

        report(35, "Contraste local suelo↔copa (anti-sombra)")
        red = rgb[:, :, 0].astype(np.float32)
        green = rgb[:, :, 1].astype(np.float32)
        blue = rgb[:, :, 2].astype(np.float32)
        lum = 0.30 * red + 0.59 * green + 0.11 * blue
        tot = np.maximum(red + green + blue, 1.0)
        # Verdor cromático: follaje > sombra gris proyectada
        gchr = (green / tot) - 0.5 * ((red / tot) + (blue / tot))
        exg = (2.0 * green - red - blue) / tot
        hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
        sat = hsv[:, :, 1].astype(np.float32)
        value = hsv[:, :, 2].astype(np.float32)
        texture = np.abs(lum - cv2.blur(lum, (5, 5)))
        texture_w = np.abs(lum - cv2.blur(lum, (11, 11)))

        # Suelo claro local ≈ dilatación de luminancia (~3 m de vecindario).
        nb = max(21, int(round(3.2 / max(gsd_out, 1e-3))) | 1)
        if nb % 2 == 0:
            nb += 1
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (nb, nb))
        local_bright = cv2.blur(
            cv2.dilate(lum.astype(np.uint8), kernel).astype(np.float32),
            (9, 9),
        )
        contrast = local_bright - lum

        if predio_ring and len(predio_ring) >= 3:
            report(50, "Máscara de predio")
            predio_mask = _build_predio_mask(dataset, predio_ring, out_h, out_w)
        else:
            predio_mask = lum > 10.0

        # Sombra proyectada: oscura, gris (poco verde), plana.
        # No confundir con copa oscura (más verde / más textura de follaje).
        shadow = (
            (value < 28.0)
            | ((value < 48.0) & (sat < 38.0) & (gchr < 0.012) & (texture < 4.0))
            | ((value < 55.0) & (exg < 0.02) & (texture_w < 3.5) & (gchr < 0.018))
        )
        # Dilatar un poco la sombra para no “comer” el borde del suelo sombreado
        shadow_u8 = (shadow.astype(np.uint8) * 255)
        shadow_u8 = cv2.morphologyEx(
            shadow_u8,
            cv2.MORPH_CLOSE,
            cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)),
            iterations=1,
        )
        shadow = shadow_u8 > 0

        valid = predio_mask & (lum > 4.0)
        if not valid.any():
            raise ValueError("Predio sin píxeles válidos en el orto.")

        report(65, "Umbral de cobertura (anti-sombra)")
        sample = contrast[valid & (~shadow)]
        if sample.size == 0:
            sample = contrast[valid]
        thr = float(np.percentile(sample.astype(np.float32), score_pct))
        # Candidato por contraste vs suelo local
        by_contrast = (contrast >= thr) & valid & (~shadow)
        # Follaje: algo de verde O textura de copa (evita sombra plana)
        foliage_ok = (gchr > 0.014) | (exg > 0.04) | ((texture > 2.8) & (gchr > 0.008))
        # Copas muy oscuras pero verdes
        dark_green = (value < 90.0) & (gchr > 0.02) & (sat > 25.0) & valid & (~shadow)
        binary = (by_contrast & foliage_ok) | dark_green
        binary = binary & (~shadow)

        open_px = max(3, int(round(0.30 / max(gsd_out, 1e-3))) | 1)
        close_px = max(3, int(round(0.55 / max(gsd_out, 1e-3))) | 1)
        if open_px % 2 == 0:
            open_px += 1
        if close_px % 2 == 0:
            close_px += 1
        binary_u8 = binary.astype(np.uint8) * 255
        binary_u8 = cv2.morphologyEx(
            binary_u8,
            cv2.MORPH_OPEN,
            cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (open_px, open_px)),
            iterations=1,
        )
        binary_u8 = cv2.morphologyEx(
            binary_u8,
            cv2.MORPH_CLOSE,
            cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (close_px, close_px)),
            iterations=1,
        )
        min_area_px = max(8, int(0.25 / max(gsd_out * gsd_out, 1e-6)))
        n_lab, labels, stats_cc, _ = cv2.connectedComponentsWithStats(binary_u8, connectivity=8)
        clean = np.zeros_like(binary_u8)
        for i in range(1, n_lab):
            if stats_cc[i, cv2.CC_STAT_AREA] >= min_area_px:
                clean[labels == i] = 255
        binary_u8 = clean
        binary = binary_u8 > 0

        predio_px = int(valid.sum())
        canopy_px = int((binary & valid).sum())
        cover_pct = 100.0 * canopy_px / predio_px if predio_px else 0.0
        bare_pct = max(0.0, 100.0 - cover_pct)

        if preview_path:
            try:
                from pathlib import Path as _Path

                tint = rgb.astype(np.float32).copy()
                tint[binary] = tint[binary] * np.array([0.30, 0.80, 0.35]) + np.array(
                    [25.0, 170.0, 45.0]
                ) * 0.50
                # Sombras rechazadas en violeta (auditoría)
                tint[shadow & predio_mask & (~binary)] = tint[
                    shadow & predio_mask & (~binary)
                ] * 0.35 + np.array([120.0, 40.0, 180.0]) * 0.65
                tint = np.clip(tint, 0, 255).astype(np.uint8)
                tint[~predio_mask] = (tint[~predio_mask] * 0.22).astype(np.uint8)
                edge = predio_mask.astype(np.uint8) * 255
                cnts, _ = cv2.findContours(edge, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                cv2.drawContours(tint, cnts, -1, (0, 80, 255), 2)
                cv2.putText(
                    tint,
                    f"cobertura {cover_pct:.1f}%  verde=copa  violeta=sombra rechazada",
                    (16, 40),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.85,
                    (255, 255, 255),
                    2,
                )
                cv2.imwrite(
                    str(preview_path),
                    cv2.cvtColor(tint, cv2.COLOR_RGB2BGR),
                    [int(cv2.IMWRITE_JPEG_QUALITY), 88],
                )
                # Capa de contraste (qué “ve” el algoritmo)
                cnorm = np.zeros_like(lum, dtype=np.uint8)
                if valid.any():
                    c_lo = float(np.percentile(contrast[valid], 2))
                    c_hi = float(np.percentile(contrast[valid], 98))
                    cnorm = np.clip(
                        (contrast - c_lo) * (255.0 / max(c_hi - c_lo, 1e-3)), 0, 255
                    ).astype(np.uint8)
                contrast_vis = cv2.applyColorMap(cnorm, cv2.COLORMAP_TURBO)
                contrast_vis = cv2.cvtColor(contrast_vis, cv2.COLOR_BGR2RGB)
                contrast_vis[~predio_mask] = (contrast_vis[~predio_mask] * 0.15).astype(np.uint8)
                cv2.drawContours(contrast_vis, cnts, -1, (255, 255, 255), 2)
                cv2.putText(
                    contrast_vis,
                    "capa contraste suelo↔copa",
                    (16, 40),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1.0,
                    (255, 255, 255),
                    2,
                )
                cpath = _Path(str(preview_path)).with_name("airci-coverage-contrast.jpg")
                cv2.imwrite(
                    str(cpath),
                    cv2.cvtColor(contrast_vis, cv2.COLOR_RGB2BGR),
                    [int(cv2.IMWRITE_JPEG_QUALITY), 88],
                )
            except Exception:
                pass

        report(80, "Contornos de cobertura")
        contours, _ = cv2.findContours(binary_u8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        px_area_m2 = (gsd_out * gsd_out) if gsd_out else None
        polygons: list[dict] = []
        shapely_polys = []

        # transform de coords: pixel downsampled → full → geo
        # col_full = col_ds * scale, etc. Use dataset.transform on full coords
        for cnt in contours:
            if cnt is None or len(cnt) < 3:
                continue
            area_px = float(cv2.contourArea(cnt))
            if px_area_m2 is not None:
                area_m2 = area_px * px_area_m2
                if area_m2 < min_poly_m2:
                    continue
            elif area_px < 40:
                continue
            # simplify in pixel space
            peri = cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, max(1.5, 0.004 * peri), True)
            if len(approx) < 3:
                continue
            cols = []
            rows = []
            for p in approx.reshape(-1, 2):
                cols.append(float(p[0]) * scale)
                rows.append(float(p[1]) * scale)
            # close ring
            cols.append(cols[0])
            rows.append(rows[0])
            ring_ll = _px_to_wgs84(dataset, cols, rows)  # [[lat,lng],...]
            if len(ring_ll) < 4:
                continue
            # shapely for optional merge/simplify in meters-ish
            try:
                lat0 = float(np.mean([p[0] for p in ring_ll]))
                m_lat = 111320.0
                m_lng = 111320.0 * math.cos(math.radians(lat0))
                xy = [(p[1] * m_lng, p[0] * m_lat) for p in ring_ll]
                poly = Polygon(xy)
                if not poly.is_valid or poly.area <= 0:
                    continue
                if simplify_m > 0:
                    poly = poly.simplify(simplify_m, preserve_topology=True)
                if poly.is_empty or poly.area <= 0:
                    continue
                shapely_polys.append(poly)
                # back to latlng
                if poly.geom_type == "Polygon":
                    coords = list(poly.exterior.coords)
                else:
                    continue
                ring_out = [[y / m_lat, x / m_lng] for x, y in coords]
                polygons.append(
                    {
                        "latlngs": ring_out,
                        "areaM2": round(float(poly.area), 2) if px_area_m2 else None,
                    }
                )
            except Exception:
                polygons.append(
                    {
                        "latlngs": ring_ll,
                        "areaM2": round(area_px * px_area_m2, 2) if px_area_m2 else None,
                    }
                )

        predio_ha = _predio_area_ha(predio_ring) if predio_ring else None
        canopy_ha = None
        if predio_ha is not None:
            canopy_ha = predio_ha * (cover_pct / 100.0)

        stats = {
            "coverPct": round(cover_pct, 3),
            "barePct": round(bare_pct, 3),
            "predioAreaHa": round(predio_ha, 4) if predio_ha else None,
            "canopyAreaHa": round(canopy_ha, 4) if canopy_ha is not None else None,
            "canopyAreaM2": round(canopy_ha * 10000.0, 1) if canopy_ha is not None else None,
            "gsdM": gsd_m,
            "gsdCm": round(float(gsd_m) * 100.0, 2) if gsd_m else None,
            "widthPx": dataset.width,
            "heightPx": dataset.height,
            "analysisWidthPx": out_w,
            "analysisHeightPx": out_h,
            "detectorVersion": COVERAGE_VERSION,
            "detectorMode": "coverage",
            "coverageMethod": COVERAGE_VERSION,
            "scorePercentile": score_pct,
            "threshold": round(thr, 2),
            "predioPixels": predio_px,
            "canopyPixels": canopy_px,
            "polygonCount": len(polygons),
            "count": 0,
            "resultTrees": 0,
            "clippedToPredio": bool(predio_ring),
            "validationStatus": "coverage_v3",
            "professional": True,
            "hasScale": gsd_m is not None,
            "neighborhoodM": round(3.2, 2),
            "antiShadow": True,
        }
        report(95, "Cobertura lista")
        return stats, polygons
