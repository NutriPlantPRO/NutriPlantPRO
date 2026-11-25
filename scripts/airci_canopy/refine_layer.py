#!/usr/bin/env python3
"""Afina una capa AirCI ya buena SIN re-detectar todo.

- Backup del JSON
- Fusiona dobles (centros muy cerca + solape de polígonos)
- Recalcula franjas/cobertura si hay predio
- Escribe result / light / geojson nuevos

Uso:
  python refine_layer.py /ruta/airci-canopy-result-light.json \\
    --predio /ruta/airci-predio.geojson \\
    --out /ruta/salida
"""

from __future__ import annotations

import argparse
import json
import math
import shutil
from datetime import datetime, timezone
from pathlib import Path

import numpy as np


def _haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(min(1.0, math.sqrt(a)))


def _ring_to_poly(latlngs: list):
    from shapely.geometry import Polygon

    if not latlngs or len(latlngs) < 3:
        return None
    coords = [(float(p[1]), float(p[0])) for p in latlngs if isinstance(p, (list, tuple)) and len(p) >= 2]
    if len(coords) < 3:
        return None
    if coords[0] != coords[-1]:
        coords.append(coords[0])
    try:
        poly = Polygon(coords)
        if not poly.is_valid:
            poly = poly.buffer(0)
        if poly.is_empty or poly.area <= 0:
            return None
        return poly
    except Exception:
        return None


def _poly_to_latlngs(poly) -> list[list[float]]:
    if poly is None or poly.is_empty:
        return []
    if poly.geom_type == "MultiPolygon":
        poly = max(poly.geoms, key=lambda g: g.area)
    xs, ys = poly.exterior.coords.xy
    # shapely: x=lng, y=lat
    return [[float(lat), float(lng)] for lng, lat in zip(xs, ys)]


def _poly_area_m2(poly, lat0: float) -> float:
    """Aprox local metros² desde lon/lat."""
    m_lat = 111320.0
    m_lng = 111320.0 * math.cos(math.radians(lat0))
    # reproject exterior to meters
    from shapely.geometry import Polygon

    coords = []
    for lng, lat in poly.exterior.coords:
        coords.append((lng * m_lng, lat * m_lat))
    try:
        return float(Polygon(coords).area)
    except Exception:
        return float(poly.area) * (m_lat * m_lng)


def _iou(a, b) -> float:
    if a is None or b is None:
        return 0.0
    try:
        inter = a.intersection(b).area
        union = a.union(b).area
        if union <= 0:
            return 0.0
        return float(inter / union)
    except Exception:
        return 0.0


def merge_duplicate_trees_clean(
    trees: list[dict],
    *,
    max_center_m: float = 1.7,
    min_iou: float = 0.12,
    min_overlap_frac: float = 0.28,
) -> tuple[list[dict], int]:
    from shapely.geometry import Point
    from shapely.ops import unary_union

    n = len(trees)
    polys = [_ring_to_poly(t.get("latlngs") or []) for t in trees]
    centers: list[tuple[float, float] | None] = []
    areas: list[float] = []
    for i, t in enumerate(trees):
        c = t.get("center") or []
        if isinstance(c, (list, tuple)) and len(c) >= 2:
            centers.append((float(c[0]), float(c[1])))
        else:
            centers.append(None)
        a = float(t.get("areaM2") or 0)
        if a <= 0 and polys[i] is not None and centers[i] is not None:
            a = _poly_area_m2(polys[i], centers[i][0])
        areas.append(a)

    parent = list(range(n))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def unite(a: int, b: int) -> None:
        ra, rb = find(a), find(b)
        if ra == rb:
            return
        if areas[ra] >= areas[rb]:
            parent[rb] = ra
        else:
            parent[ra] = rb

    merge_events = 0
    for i in range(n):
        if centers[i] is None or polys[i] is None:
            continue
        for j in range(i + 1, n):
            if centers[j] is None or polys[j] is None:
                continue
            d = _haversine_m(centers[i][0], centers[i][1], centers[j][0], centers[j][1])
            if d > max_center_m:
                continue
            iou = _iou(polys[i], polys[j])
            try:
                inter = polys[i].intersection(polys[j]).area
                smaller = min(polys[i].area, polys[j].area)
                overlap_frac = float(inter / smaller) if smaller > 0 else 0.0
            except Exception:
                overlap_frac = 0.0
            inside = False
            try:
                inside = polys[i].contains(Point(centers[j][1], centers[j][0])) or polys[j].contains(
                    Point(centers[i][1], centers[i][0])
                )
            except Exception:
                pass
            # Fragmento chico cuyo centro cae en la copa grande (= un árbol partido)
            absorb = False
            ai, aj = areas[i], areas[j]
            if inside and d <= 2.6 and min(ai, aj) > 0:
                if min(ai, aj) <= 0.5 * max(ai, aj):
                    absorb = True
            if (
                iou >= min_iou
                or overlap_frac >= min_overlap_frac
                or (d <= 1.2 and inside)
                or absorb
            ):
                if find(i) != find(j):
                    unite(i, j)
                    merge_events += 1

    groups: dict[int, list[int]] = {}
    for i in range(n):
        groups.setdefault(find(i), []).append(i)

    out: list[dict] = []
    for _root, idxs in groups.items():
        if len(idxs) == 1:
            out.append(dict(trees[idxs[0]]))
            continue
        idxs_sorted = sorted(idxs, key=lambda k: areas[k], reverse=True)
        keep = dict(trees[idxs_sorted[0]])
        parts = [polys[k] for k in idxs_sorted if polys[k] is not None]
        merged = unary_union(parts)
        if merged.geom_type == "MultiPolygon":
            merged = max(merged.geoms, key=lambda g: g.area)
        try:
            merged = merged.buffer(0)
        except Exception:
            pass
        latlngs = _poly_to_latlngs(merged)
        if len(latlngs) < 4:
            out.append(keep)
            continue
        lat0 = float(np.mean([p[0] for p in latlngs[:-1]]))
        lng0 = float(np.mean([p[1] for p in latlngs[:-1]]))
        area_m2 = _poly_area_m2(merged, lat0)
        keep["latlngs"] = latlngs
        keep["center"] = [lat0, lng0]
        keep["areaM2"] = round(area_m2, 3)
        keep["source"] = "cursor_refine_merge"
        out.append(keep)

    out_sorted = sorted(
        out,
        key=lambda t: (
            -float((t.get("center") or [0, 0])[0]),
            float((t.get("center") or [0, 0])[1]),
        ),
    )
    for i, t in enumerate(out_sorted, start=1):
        t["id"] = i
        t["stableId"] = f"copa-{i}"
    return out_sorted, merge_events


def _load_predio_ring(path: Path | None) -> list[tuple[float, float]] | None:
    if path is None or not path.is_file():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    geom = None
    if isinstance(data, dict):
        if data.get("type") == "FeatureCollection":
            feats = data.get("features") or []
            if feats:
                geom = feats[0].get("geometry")
        elif data.get("type") == "Feature":
            geom = data.get("geometry")
        elif data.get("type") in {"Polygon", "MultiPolygon"}:
            geom = data
    if not isinstance(geom, dict):
        return None
    coords = None
    if geom.get("type") == "Polygon":
        rings = geom.get("coordinates") or []
        coords = rings[0] if rings else None
    elif geom.get("type") == "MultiPolygon":
        polys = geom.get("coordinates") or []
        coords = polys[0][0] if polys and polys[0] else None
    if not coords:
        return None
    ring = [(float(pt[1]), float(pt[0])) for pt in coords if isinstance(pt, (list, tuple)) and len(pt) >= 2]
    return ring if len(ring) >= 3 else None


def main() -> int:
    ap = argparse.ArgumentParser(description="Afina capa AirCI (merge dobles, sin re-detectar)")
    ap.add_argument("json_path", type=Path)
    ap.add_argument("--out", type=Path, default=None)
    ap.add_argument("--predio", type=Path, default=None)
    ap.add_argument("--max-center-m", type=float, default=1.7)
    ap.add_argument("--min-iou", type=float, default=0.12)
    args = ap.parse_args()

    src = args.json_path.expanduser().resolve()
    if not src.is_file():
        print(f"No existe: {src}")
        return 1
    out_dir = (args.out or src.parent).expanduser().resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    payload = json.loads(src.read_text(encoding="utf-8"))
    trees = payload.get("trees") or []
    if not trees:
        print("Sin árboles")
        return 1

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup = out_dir / f"airci-canopy-result-backup-{stamp}.json"
    shutil.copy2(src, backup)
    print(f"Backup: {backup}")

    before = len(trees)
    refined, merge_events = merge_duplicate_trees_clean(
        trees,
        max_center_m=float(args.max_center_m),
        min_iou=float(args.min_iou),
    )
    after = len(refined)
    print(f"Árboles: {before} → {after} (fusiones={merge_events})")

    stats = dict(payload.get("stats") or {})
    stats["count"] = after
    stats["resultTrees"] = after
    stats["refinedAt"] = datetime.now(timezone.utc).isoformat()
    stats["refineMerges"] = merge_events
    stats["refineFrom"] = before

    # semáforo relativo
    areas = [float(t.get("areaM2") or 0) for t in refined]
    mean_a = float(np.mean(areas)) if areas else 0.0
    std_a = float(np.std(areas)) if areas else 0.0
    for t in refined:
        a = float(t.get("areaM2") or 0)
        z = (a - mean_a) / (std_a + 1e-6) if areas else 0.0
        if z <= -1.0:
            key, label, color = "rojo", "Muy bajo", "#dc2626"
        elif z <= -0.35:
            key, label, color = "amarillo", "Por debajo", "#d97706"
        elif z >= 1.0:
            key, label, color = "azul", "Por encima", "#2563eb"
        else:
            key, label, color = "verde", "Promedio", "#16a34a"
        t["sem"] = {"key": key, "label": label, "color": color, "fill": color + "99"}

    coverage_payload = payload.get("coverage")
    predio_path = args.predio.expanduser().resolve() if args.predio else None
    if predio_path is None:
        auto = out_dir / "airci-predio.geojson"
        if not auto.is_file():
            auto = Path(
                "/Users/jesusavila/Desktop/AirCI/Ojo Zarco/Campo 1 (13Nov26)/airci-predio.geojson"
            )
        if auto.is_file():
            predio_path = auto
    predio_ring = _load_predio_ring(predio_path)
    try:
        from franjas_engine import build_franjas_from_crowns

        if refined and predio_ring:
            print("Recalculando franjas…")
            fr = build_franjas_from_crowns(
                refined,
                predio_ring,
                mean_canopy_height_m=float(stats.get("meanCanopyHeightM") or 4.0),
                ortho_path=None,
            )
            if fr.get("ok"):
                stats["coverPct"] = fr["coverPct"]
                stats["barePct"] = fr["barePct"]
                stats["cultivationSurfaceM2"] = fr["cultivationSurfaceM2"]
                stats["canopyVolumeM3"] = fr["canopyVolumeM3"]
                stats["franjaCount"] = fr["franjaCount"]
                stats["coverageMethod"] = fr["method"] + "+refine"
                if fr.get("treesClean"):
                    refined = fr["treesClean"]
                    stats["count"] = len(refined)
                    stats["resultTrees"] = len(refined)
                coverage_payload = {
                    "method": stats["coverageMethod"],
                    "kind": "franjas",
                    "coverPct": fr["coverPct"],
                    "barePct": fr["barePct"],
                    "cultivationSurfaceM2": fr["cultivationSurfaceM2"],
                    "canopyVolumeM3": fr["canopyVolumeM3"],
                    "meanCanopyHeightM": fr["meanCanopyHeightM"],
                    "mergeGapM": fr["mergeGapM"],
                    "polygons": fr["polygons"],
                }
                print(
                    f"Cobertura: {fr['coverPct']:.2f}% · {fr['cultivationSurfaceM2']:.0f} m² · "
                    f"franjas={fr['franjaCount']}"
                )
    except Exception as exc:
        print(f"Franjas omitidas: {exc}")

    out_payload = {
        "format": "airci_cursor_result_v1",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source": "cursor_refine",
        "mode": "crowns_and_franjas" if coverage_payload else "crowns",
        "ortho": payload.get("ortho"),
        "predio": payload.get("predio"),
        "stats": stats,
        "trees": refined,
        "coverage": coverage_payload,
        "refine": {
            "backup": str(backup),
            "before": before,
            "after": len(refined),
            "merges": merge_events,
            "note": "Solo fusión de dobles; el resto se conserva",
        },
    }

    full = out_dir / "airci-canopy-result.json"
    light = out_dir / "airci-canopy-result-light.json"
    full.write_text(json.dumps(out_payload, ensure_ascii=False), encoding="utf-8")
    light.write_text(json.dumps(out_payload, ensure_ascii=False), encoding="utf-8")

    features = []
    for t in refined:
        ring = t.get("latlngs") or []
        coords = [[lng, lat] for lat, lng in ring]
        if coords and coords[0] != coords[-1]:
            coords.append(coords[0])
        if len(coords) < 4:
            continue
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "id": t.get("id"),
                    "area_m2": t.get("areaM2"),
                    "sem": (t.get("sem") or {}).get("key"),
                },
                "geometry": {"type": "Polygon", "coordinates": [coords]},
            }
        )
    geo = out_dir / "airci-canopy.geojson"
    geo.write_text(
        json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"OK → {light}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
