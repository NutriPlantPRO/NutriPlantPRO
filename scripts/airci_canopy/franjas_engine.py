"""Franjas de dosel a partir de contornos de copa.

Flujo: contornos → quitar traslapes → rechazar suelo → unir hileras sin rellenar calles
→ % cobertura → m² → m³.
"""

from __future__ import annotations

import math
from typing import Any

import numpy as np
from shapely.geometry import Polygon, mapping
from shapely.ops import unary_union
from shapely.validation import make_valid


def _local_frame(lat0: float, lng0: float) -> tuple[float, float]:
    m_lat = 111320.0
    m_lng = 111320.0 * math.cos(math.radians(lat0))
    return m_lat, m_lng


def _ring_to_xy(
    ring: list[list[float]] | list[tuple[float, float]],
    lat0: float,
    lng0: float,
) -> list[tuple[float, float]]:
    m_lat, m_lng = _local_frame(lat0, lng0)
    pts: list[tuple[float, float]] = []
    for pt in ring:
        if not isinstance(pt, (list, tuple)) or len(pt) < 2:
            continue
        lat, lng = float(pt[0]), float(pt[1])
        pts.append(((lng - lng0) * m_lng, (lat - lat0) * m_lat))
    return pts


def _xy_to_ring(
    xs_ys: list[tuple[float, float]],
    lat0: float,
    lng0: float,
) -> list[list[float]]:
    m_lat, m_lng = _local_frame(lat0, lng0)
    out: list[list[float]] = []
    for x, y in xs_ys:
        lat = lat0 + y / m_lat
        lng = lng0 + x / m_lng
        out.append([lat, lng])
    return out


def _as_polygon(geom) -> Polygon | None:
    if geom is None or geom.is_empty:
        return None
    if not geom.is_valid:
        geom = make_valid(geom)
    if geom.is_empty:
        return None
    if geom.geom_type == "Polygon":
        return geom if geom.area > 0 else None
    if geom.geom_type == "MultiPolygon":
        parts = [g for g in geom.geoms if g.area > 0]
        if not parts:
            return None
        return max(parts, key=lambda g: g.area)
    if geom.geom_type == "GeometryCollection":
        polys = []
        for g in geom.geoms:
            p = _as_polygon(g)
            if p is not None:
                polys.append(p)
        if not polys:
            return None
        return max(polys, key=lambda g: g.area)
    return None


def _poly_from_latlng(ring: list, lat0: float, lng0: float) -> Polygon | None:
    pts = _ring_to_xy(ring, lat0, lng0)
    if len(pts) < 3:
        return None
    if pts[0] != pts[-1]:
        pts = pts + [pts[0]]
    try:
        geom = Polygon(pts)
    except Exception:
        return None
    return _as_polygon(geom)


def _estimate_nn_m(centers_xy: list[tuple[float, float]]) -> float:
    if len(centers_xy) < 8:
        return 3.2
    nn: list[float] = []
    arr = np.asarray(centers_xy, dtype=np.float64)
    n = len(arr)
    step = max(1, n // 900)
    for i in range(0, n, step):
        d = np.sqrt(np.sum((arr - arr[i]) ** 2, axis=1))
        d[i] = np.inf
        best = float(np.min(d))
        if 0.8 < best < 25:
            nn.append(best)
    if len(nn) < 5:
        return 3.2
    return float(np.median(nn))


def _poly_to_latlng_dict(part: Polygon, lat0: float, lng0: float, pid: str) -> dict | None:
    if part.is_empty or part.exterior is None:
        return None
    coords = list(part.exterior.coords)
    ring_ll = _xy_to_ring([(float(x), float(y)) for x, y in coords], lat0, lng0)
    if len(ring_ll) >= 3 and ring_ll[0] != ring_ll[-1]:
        ring_ll = ring_ll + [ring_ll[0]]
    clean = ring_ll[:-1] if len(ring_ll) > 3 and ring_ll[0] == ring_ll[-1] else ring_ll
    if len(clean) < 3:
        return None
    return {
        "id": pid,
        "latlngs": clean,
        "areaM2": round(float(part.area), 2),
    }


def resolve_crown_overlaps(
    crown_polys: list[Polygon],
    scores: list[float] | None = None,
    *,
    cell_m: float = 0.12,
) -> list[Polygon]:
    """Sin traslapes: raster de etiquetas (gana mayor score/área) → vectorizar."""
    if not crown_polys:
        return []
    try:
        from rasterio import features as rio_features
        from rasterio.transform import from_origin
    except Exception:
        # fallback shapely
        order = sorted(
            range(len(crown_polys)),
            key=lambda i: (
                float(scores[i]) if scores and len(scores) == len(crown_polys) else 0.0,
                float(crown_polys[i].area),
            ),
            reverse=True,
        )
        claimed = None
        out: list[Polygon] = []
        for i in order:
            poly = _as_polygon(crown_polys[i].buffer(0))
            if poly is None:
                continue
            if claimed is not None:
                poly = _as_polygon(poly.difference(claimed))
                if poly is None or poly.area < 1.5:
                    continue
            out.append(poly)
            claimed = poly if claimed is None else _as_polygon(unary_union([claimed, poly])) or claimed
        return out

    minx = min(p.bounds[0] for p in crown_polys) - 1.0
    miny = min(p.bounds[1] for p in crown_polys) - 1.0
    maxx = max(p.bounds[2] for p in crown_polys) + 1.0
    maxy = max(p.bounds[3] for p in crown_polys) + 1.0
    w = max(8, int(math.ceil((maxx - minx) / cell_m)))
    h = max(8, int(math.ceil((maxy - miny) / cell_m)))
    # y hacia arriba en metros locales
    transform = from_origin(minx, maxy, cell_m, cell_m)

    order = list(range(len(crown_polys)))
    if scores and len(scores) == len(crown_polys):
        order.sort(key=lambda i: (float(scores[i]), float(crown_polys[i].area)), reverse=True)
    else:
        order.sort(key=lambda i: float(crown_polys[i].area), reverse=True)

    labels = np.zeros((h, w), dtype=np.int32)
    # pintar de menor a mayor prioridad para que el mejor quede encima
    for i in reversed(order):
        geom = mapping(crown_polys[i])
        rio_features.rasterize(
            [(geom, i + 1)],
            out=labels,
            transform=transform,
            fill=0,
            merge_alg=getattr(__import__("rasterio.enums", fromlist=["MergeAlg"]).MergeAlg, "replace", None)
            or None,
            all_touched=False,
            dtype=np.int32,
        )

    # si merge_alg falló / API vieja: volver a pintar en orden inverso con máscara
    if int(labels.max()) == 0:
        for i in reversed(order):
            geom = mapping(crown_polys[i])
            burned = rio_features.rasterize(
                [(geom, i + 1)],
                out_shape=(h, w),
                transform=transform,
                fill=0,
                all_touched=False,
                dtype=np.int32,
            )
            labels = np.where(burned > 0, burned, labels)

    out: list[Polygon] = []
    for i in order:
        mask = labels == (i + 1)
        if not np.any(mask):
            continue
        shapes = list(
            rio_features.shapes(
                mask.astype(np.uint8),
                mask=mask,
                transform=transform,
            )
        )
        parts: list[Polygon] = []
        for geom, val in shapes:
            if int(val) != 1:
                continue
            coords = geom.get("coordinates", [[]])[0]
            # shapes da (x,y) en el transform (= metros locales)
            poly = _as_polygon(Polygon([(float(x), float(y)) for x, y in coords]))
            if poly is not None and poly.area >= 1.5:
                parts.append(poly)
        if not parts:
            continue
        merged = _as_polygon(unary_union(parts))
        if merged is not None and merged.area >= 1.5:
            out.append(merged)
    return out


def _soil_fraction_in_poly(
    dataset,
    poly: Polygon,
    lat0: float,
    lng0: float,
    transform,
) -> float:
    """Fracción de píxeles tipo suelo/calle dentro del polígono (0–1)."""
    import rasterio
    from rasterio import features as rio_features

    m_lat, m_lng = _local_frame(lat0, lng0)
    # bbox en metros → px
    minx, miny, maxx, maxy = poly.bounds
    # xy metros locales → lng/lat → CRS dataset
    corners_ll = _xy_to_ring(
        [(minx, miny), (maxx, miny), (maxx, maxy), (minx, maxy)],
        lat0,
        lng0,
    )
    lngs = [p[1] for p in corners_ll]
    lats = [p[0] for p in corners_ll]
    if dataset.crs and str(dataset.crs).upper() not in {"EPSG:4326", "WGS84"}:
        from rasterio.warp import transform as warp_transform

        xs, ys = warp_transform("EPSG:4326", dataset.crs, lngs, lats)
    else:
        xs, ys = lngs, lats
    rows, cols = rasterio.transform.rowcol(transform, xs, ys)
    r0 = max(0, int(min(rows)) - 2)
    c0 = max(0, int(min(cols)) - 2)
    r1 = min(dataset.height, int(max(rows)) + 3)
    c1 = min(dataset.width, int(max(cols)) + 3)
    if r1 - r0 < 4 or c1 - c0 < 4:
        return 0.0

    from rasterio.windows import Window

    window = Window(c0, r0, c1 - c0, r1 - r0)
    tile = dataset.read(indexes=[1, 2, 3], window=window, boundless=False)
    ext = list(poly.exterior.coords)
    pix = []
    for x, y in ext:
        lat = lat0 + y / m_lat
        lng = lng0 + x / m_lng
        if dataset.crs and str(dataset.crs).upper() not in {"EPSG:4326", "WGS84"}:
            from rasterio.warp import transform as warp_transform

            xx, yy = warp_transform("EPSG:4326", dataset.crs, [lng], [lat])
            col, row = ~transform * (xx[0], yy[0])
        else:
            col, row = ~transform * (lng, lat)
        pix.append((float(col - c0), float(row - r0)))
    h, w = tile.shape[1], tile.shape[2]
    mask = rio_features.geometry_mask(
        [{"type": "Polygon", "coordinates": [[(p[0], p[1]) for p in pix]]}],
        out_shape=(h, w),
        transform=rasterio.Affine(1, 0, 0, 0, 1, 0),
        invert=True,
        all_touched=True,
    )
    if not np.any(mask):
        return 0.0  # no evidencia → no tirar la copa

    r = tile[0].astype(np.float32)
    g = tile[1].astype(np.float32)
    b = tile[2].astype(np.float32)
    if float(np.nanmax(r)) > 255:
        r = r / 256.0
        g = g / 256.0
        b = b / 256.0
    tot = np.maximum(r + g + b, 1.0)
    gchr = (g / tot) - 0.5 * ((r / tot) + (b / tot))
    lum = 0.30 * r + 0.59 * g + 0.11 * b
    # suelo/calle: claro + poco verdor (copa de aguacate suele ser más oscura/verde)
    lum_cut = float(np.percentile(lum[mask], 55))
    soil = mask & (gchr < 0.012) & (lum >= lum_cut)
    soil = soil | (mask & (gchr < 0.006) & (lum > 55))
    return float(np.count_nonzero(soil)) / float(np.count_nonzero(mask))


def filter_soil_crowns(
    crown_polys: list[Polygon],
    ortho_path: str | None,
    lat0: float,
    lng0: float,
    *,
    max_soil_frac: float = 0.55,
) -> tuple[list[Polygon], int]:
    """Tira copas que en el orto se ven mayormente suelo/calle."""
    if not ortho_path:
        return crown_polys, 0
    try:
        import rasterio
    except Exception:
        return crown_polys, 0

    kept: list[Polygon] = []
    dropped = 0
    with rasterio.open(ortho_path) as ds:
        for poly in crown_polys:
            try:
                frac = _soil_fraction_in_poly(ds, poly, lat0, lng0, ds.transform)
            except Exception:
                kept.append(poly)
                continue
            if frac >= max_soil_frac:
                dropped += 1
                continue
            kept.append(poly)
    return kept, dropped


def _smooth_poly(poly: Polygon, round_m: float = 0.35, simplify_m: float = 0.12) -> Polygon | None:
    """Quita escalones de máscara: redondeo + simplify."""
    if poly is None or poly.is_empty:
        return None
    try:
        rounded = poly.buffer(round_m).buffer(-round_m)
    except Exception:
        rounded = poly
    if rounded.is_empty:
        rounded = poly
    if simplify_m > 0:
        rounded = rounded.simplify(simplify_m, preserve_topology=True)
    return _as_polygon(rounded)


def scrub_franja_soil(
    franja: Polygon,
    ortho_path: str | None,
    lat0: float,
    lng0: float,
) -> Polygon | None:
    """Recorta suelo/sombra; borde suave (no escalones de píxel)."""
    if not ortho_path or franja is None or franja.is_empty:
        return _smooth_poly(franja) if franja is not None else None
    try:
        import cv2
        import rasterio
        from rasterio import features as rio_features
        from rasterio.windows import Window
        from rasterio.warp import transform as warp_transform
    except Exception:
        return _smooth_poly(franja)

    m_lat, m_lng = _local_frame(lat0, lng0)
    minx, miny, maxx, maxy = franja.bounds
    pad = 1.2
    corners = _xy_to_ring(
        [(minx - pad, miny - pad), (maxx + pad, miny - pad), (maxx + pad, maxy + pad), (minx - pad, maxy + pad)],
        lat0,
        lng0,
    )
    with rasterio.open(ortho_path) as ds:
        lngs = [p[1] for p in corners]
        lats = [p[0] for p in corners]
        if ds.crs and str(ds.crs).upper() not in {"EPSG:4326", "WGS84"}:
            xs, ys = warp_transform("EPSG:4326", ds.crs, lngs, lats)
        else:
            xs, ys = lngs, lats
        rows, cols = rasterio.transform.rowcol(ds.transform, xs, ys)
        r0 = max(0, int(min(rows)))
        c0 = max(0, int(min(cols)))
        r1 = min(ds.height, int(max(rows)) + 1)
        c1 = min(ds.width, int(max(cols)) + 1)
        if r1 - r0 < 8 or c1 - c0 < 8:
            return _smooth_poly(franja)
        full_h, full_w = r1 - r0, c1 - c0
        # Más resolución → menos escalones (~5 cm nativo; techo ~1600 px)
        scale = max(1, int(math.ceil(max(full_h, full_w) / 1600)))
        out_h = max(8, full_h // scale)
        out_w = max(8, full_w // scale)
        window = Window(c0, r0, full_w, full_h)
        tile = ds.read(
            indexes=[1, 2, 3],
            window=window,
            out_shape=(3, out_h, out_w),
            resampling=rasterio.enums.Resampling.bilinear,
        )
        rgb = np.dstack([tile[0], tile[1], tile[2]])
        if float(np.nanmax(rgb)) > 255:
            rgb_u8 = np.clip(rgb / 256.0, 0, 255).astype(np.uint8)
        else:
            rgb_u8 = np.clip(rgb, 0, 255).astype(np.uint8)
        r = rgb_u8[:, :, 0].astype(np.float32)
        g = rgb_u8[:, :, 1].astype(np.float32)
        b = rgb_u8[:, :, 2].astype(np.float32)
        tot = np.maximum(r + g + b, 1.0)
        gchr = (g / tot) - 0.5 * ((r / tot) + (b / tot))
        lum = 0.30 * r + 0.59 * g + 0.11 * b
        hsv = cv2.cvtColor(rgb_u8, cv2.COLOR_RGB2HSV)
        sat = hsv[:, :, 1].astype(np.float32)
        val = hsv[:, :, 2].astype(np.float32)

        # Sombra proyectada sobre suelo: oscura + gris (poco sat) + sin verdor
        # No marcar follaje oscuro de aguacate (suele tener más sat/gchr)
        shadow = (
            ((val < 48) & (sat < 38) & (gchr < 0.016))
            | ((val < 32) & (gchr < 0.020))
            | ((lum < 30) & (sat < 40) & (gchr < 0.018))
        )
        # Suelo/calle claro
        soil = (gchr < 0.012) & (lum > 68) & (sat < 75)
        soil = soil | ((gchr < 0.008) & (lum > 52))

        # Dosel: verdor; excluye sombra/suelo
        canopy = (gchr >= 0.018) & (sat >= 22) & (~shadow) & (~soil)
        canopy = canopy | (
            (gchr >= 0.012) & (sat >= 30) & (val >= 36) & (val <= 185) & (~shadow) & (~soil)
        )

        canopy_u8 = (canopy.astype(np.uint8) * 255)
        k3 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        k5 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        canopy_u8 = cv2.morphologyEx(canopy_u8, cv2.MORPH_OPEN, k3, iterations=1)
        canopy_u8 = cv2.morphologyEx(canopy_u8, cv2.MORPH_CLOSE, k5, iterations=2)
        # Suavizar máscara antes de contornear (anti-escalón)
        canopy_u8 = cv2.GaussianBlur(canopy_u8, (7, 7), 0)
        _, canopy_u8 = cv2.threshold(canopy_u8, 100, 255, cv2.THRESH_BINARY)

        sx = full_w / float(out_w)
        sy = full_h / float(out_h)

        def xy_to_grid(x: float, y: float) -> tuple[float, float]:
            lat = lat0 + y / m_lat
            lng = lng0 + x / m_lng
            if ds.crs and str(ds.crs).upper() not in {"EPSG:4326", "WGS84"}:
                xx, yy = warp_transform("EPSG:4326", ds.crs, [lng], [lat])
                col, row = ~ds.transform * (xx[0], yy[0])
            else:
                col, row = ~ds.transform * (lng, lat)
            return ((col - c0) / sx, (row - r0) / sy)

        pix = [xy_to_grid(float(x), float(y)) for x, y in franja.exterior.coords]
        fr_mask = rio_features.geometry_mask(
            [{"type": "Polygon", "coordinates": [[(p[0], p[1]) for p in pix]]}],
            out_shape=(out_h, out_w),
            transform=rasterio.Affine(1, 0, 0, 0, 1, 0),
            invert=True,
            all_touched=True,
        )
        keep = (fr_mask.astype(np.uint8) * 255) & canopy_u8
        if np.count_nonzero(keep) < 20:
            return None

        # Contornos suaves (approxPolyDP) en vez de shapes escalonados
        contours, _ = cv2.findContours(keep, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        rebuilt: list[Polygon] = []
        for cnt in contours:
            if cv2.contourArea(cnt) < 18:
                continue
            peri = cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, max(1.0, 0.008 * peri), True)
            if len(approx) < 3:
                approx = cnt
            xy_m = []
            for p in approx.reshape(-1, 2):
                gc, gr = float(p[0]), float(p[1])
                col = c0 + gc * sx
                row = r0 + gr * sy
                x_geo, y_geo = ds.transform * (col, row)
                if ds.crs and str(ds.crs).upper() not in {"EPSG:4326", "WGS84"}:
                    lngs2, lats2 = warp_transform(ds.crs, "EPSG:4326", [x_geo], [y_geo])
                    lng, lat = float(lngs2[0]), float(lats2[0])
                else:
                    lng, lat = float(x_geo), float(y_geo)
                xy_m.append(((lng - lng0) * m_lng, (lat - lat0) * m_lat))
            if xy_m and xy_m[0] != xy_m[-1]:
                xy_m.append(xy_m[0])
            p = _as_polygon(Polygon(xy_m))
            p = _smooth_poly(p, round_m=0.40, simplify_m=0.14) if p is not None else None
            if p is not None and p.area >= 2.0:
                rebuilt.append(p)
        if not rebuilt:
            return None
        merged = _as_polygon(unary_union(rebuilt))
        return _smooth_poly(merged, round_m=0.30, simplify_m=0.12) if merged is not None else None


def build_franjas_from_crowns(
    trees: list[dict],
    predio_ring: list[tuple[float, float]] | list[list[float]] | None,
    *,
    merge_gap_m: float | None = None,
    mean_canopy_height_m: float = 4.0,
    simplify_m: float = 0.30,
    ortho_path: str | None = None,
) -> dict[str, Any]:
    """Une contornos (sin traslape, sin suelo) en franjas y calcula cobertura."""
    rings: list = []
    centers: list[tuple[float, float]] = []
    scores: list[float] = []
    for t in trees:
        ring = t.get("latlngs") or t.get("polygon_json") or []
        if len(ring) < 3:
            continue
        rings.append(ring)
        c = t.get("center")
        if isinstance(c, (list, tuple)) and len(c) >= 2:
            centers.append((float(c[0]), float(c[1])))
        else:
            lat = float(t.get("center_lat") or ring[0][0])
            lng = float(t.get("center_lng") or ring[0][1])
            centers.append((lat, lng))
        scores.append(float(t.get("confidence") or t.get("areaM2") or t.get("area_m2") or 1.0))

    if not rings:
        return {
            "ok": False,
            "error": "sin contornos de copa",
            "polygons": [],
            "coverPct": None,
            "treesClean": [],
        }

    lat0 = float(np.mean([c[0] for c in centers]))
    lng0 = float(np.mean([c[1] for c in centers]))

    crown_polys: list[Polygon] = []
    centers_xy: list[tuple[float, float]] = []
    score_kept: list[float] = []
    m_lat, m_lng = _local_frame(lat0, lng0)
    for ring, c, sc in zip(rings, centers, scores):
        poly = _poly_from_latlng(ring, lat0, lng0)
        if poly is None:
            continue
        crown_polys.append(poly)
        centers_xy.append(((c[1] - lng0) * m_lng, (c[0] - lat0) * m_lat))
        score_kept.append(sc)

    if not crown_polys:
        return {"ok": False, "error": "polígonos inválidos", "polygons": [], "coverPct": None, "treesClean": []}

    # 1) Sin traslapes entre copas
    crown_polys = resolve_crown_overlaps(crown_polys, score_kept)

    # 2) Tirar copas que son suelo/calle en el orto
    crown_polys, dropped_soil = filter_soil_crowns(
        crown_polys, ortho_path, lat0, lng0, max_soil_frac=0.72
    )
    if not crown_polys:
        return {"ok": False, "error": "todas las copas parecían suelo", "polygons": [], "coverPct": None, "treesClean": []}

    # Recalcular centros
    centers_xy = [(float(p.centroid.x), float(p.centroid.y)) for p in crown_polys]
    nn = _estimate_nn_m(centers_xy)
    # Puente mínimo: la franja DEBE seguir el contorno de las copas
    gap = float(merge_gap_m) if merge_gap_m is not None else float(np.clip(nn * 0.18, 0.45, 0.95))

    crown_union = unary_union(crown_polys)
    # Cierre muy corto entre copas vecinas; no inventar masa sobre calle/sombra
    closed = crown_union.buffer(gap * 0.45).buffer(-gap * 0.30)
    if closed.is_empty:
        closed = crown_union
    # Ancla dura: no salirse del dosel delineado
    canopy_core = crown_union.buffer(0.25)
    franjas_geom = closed.intersection(canopy_core)
    if franjas_geom.is_empty:
        franjas_geom = crown_union
    if simplify_m > 0:
        franjas_geom = franjas_geom.simplify(min(simplify_m, 0.18), preserve_topology=True)

    parts: list[Polygon] = []
    if franjas_geom.geom_type == "Polygon":
        parts = [franjas_geom]
    elif franjas_geom.geom_type == "MultiPolygon":
        parts = [g for g in franjas_geom.geoms if g.area > 2.0]
    else:
        p = _as_polygon(franjas_geom)
        parts = [p] if p is not None else []

    predio_poly = None
    if predio_ring and len(predio_ring) >= 3:
        predio_poly = _poly_from_latlng(list(predio_ring), lat0, lng0)
        if predio_poly is not None and not predio_poly.is_empty:
            clipped: list[Polygon] = []
            for p in parts:
                inter = _as_polygon(p.intersection(predio_poly))
                if inter is None:
                    continue
                if inter.geom_type == "Polygon" and inter.area > 2.0:
                    clipped.append(inter)
                elif hasattr(inter, "geoms"):
                    for g in inter.geoms:
                        gg = _as_polygon(g)
                        if gg is not None and gg.area > 2.0:
                            clipped.append(gg)
            parts = clipped

    # La franja ES la unión de contornos de árbol (ya anti-sombra en el refine).
    # No re-scrubar el orto aquí: eso aplastaba las copas a blobs/casi nada.

    # Garantizar franjas disjuntas
    if len(parts) > 1:
        u = unary_union(parts)
        if u.geom_type == "Polygon":
            parts = [u]
        elif u.geom_type == "MultiPolygon":
            parts = [g for g in u.geoms if g.area > 3.0]

    # Suavizado leve sin alejarse del borde de la copa
    parts = [
        (_smooth_poly(p, round_m=0.12, simplify_m=0.07) or p)
        for p in parts
    ]
    parts = [p for p in parts if p is not None and p.area > 2.0]

    polygons: list[dict] = []
    for i, part in enumerate(parts, start=1):
        d = _poly_to_latlng_dict(part, lat0, lng0, f"franja-{i}")
        if d:
            polygons.append(d)

    # Copas limpias (sin traslape, borde suave) para reescribir el JSON
    trees_clean: list[dict] = []
    for i, poly in enumerate(crown_polys, start=1):
        poly_s = _smooth_poly(poly, round_m=0.15, simplify_m=0.08) or poly
        d = _poly_to_latlng_dict(poly_s, lat0, lng0, f"copa-{i}")
        if not d:
            continue
        cxy = poly_s.centroid
        lat = lat0 + cxy.y / m_lat
        lng = lng0 + cxy.x / m_lng
        trees_clean.append(
            {
                "id": i,
                "stableId": f"copa-{i}",
                "center": [lat, lng],
                "latlngs": d["latlngs"],
                "areaM2": d["areaM2"],
                "areaPx": None,
                "sem": {"key": "verde", "label": "Promedio", "color": "#16a34a", "fill": "#16a34a99"},
                "source": "cursor_local",
            }
        )

    franja_area = float(sum(p.area for p in parts))
    predio_area = float(predio_poly.area) if predio_poly is not None else None
    if predio_area and predio_area > 0:
        cover_pct = min(100.0, 100.0 * franja_area / predio_area)
        bare_pct = max(0.0, 100.0 - cover_pct)
        predio_ha = predio_area / 10000.0
    else:
        cover_pct = None
        bare_pct = None
        predio_ha = None

    height = max(0.5, float(mean_canopy_height_m or 4.0))
    volume_m3 = franja_area * height

    return {
        "ok": True,
        "method": "franjas_from_tree_contours_v4",
        "mergeGapM": round(gap, 3),
        "franjaCount": len(polygons),
        "polygons": polygons,
        "coverPct": round(cover_pct, 3) if cover_pct is not None else None,
        "barePct": round(bare_pct, 3) if bare_pct is not None else None,
        "cultivationSurfaceM2": round(franja_area, 1),
        "canopyVolumeM3": round(volume_m3, 1),
        "meanCanopyHeightM": height,
        "predioAreaHa": round(predio_ha, 4) if predio_ha is not None else None,
        "crownCountUsed": len(crown_polys),
        "crownsDroppedSoil": dropped_soil,
        "treesClean": trees_clean,
    }
