#!/usr/bin/env python3
"""Corre detección AirCI en un GeoTIFF local (Cursor / Mac) y exporta JSON para AirCI.

Uso:
  python run_local.py /ruta/al/orthophoto.tif
  python run_local.py /ruta/al/orthophoto.tif --out /ruta/salida
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from detector import analyze_geotiff

try:
    from deepforest_engine import analyze_geotiff_deepforest
except Exception:  # pragma: no cover - opcional si no hay torch/deepforest
    analyze_geotiff_deepforest = None  # type: ignore


SEM_LABELS = {
    "rojo": ("Muy bajo", "#dc2626"),
    "amarillo": ("Por debajo", "#d97706"),
    "verde": ("Promedio", "#16a34a"),
    "azul": ("Por encima", "#2563eb"),
}


def _haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(min(1.0, math.sqrt(a)))


def estimate_spacing_m(trees: list[dict], max_pairs: int = 2500) -> float | None:
    centers = []
    for tree in trees:
        lat = float(tree.get("center_lat") or 0)
        lng = float(tree.get("center_lng") or 0)
        if abs(lat) <= 90 and abs(lng) <= 180:
            centers.append((lat, lng))
    if len(centers) < 8:
        return None
    # Submuestrear si hay miles
    if len(centers) > 1200:
        step = max(1, len(centers) // 1200)
        centers = centers[::step]
    nn: list[float] = []
    n = len(centers)
    limit = min(n, max_pairs)
    for i in range(limit):
        lat, lng = centers[i]
        best = float("inf")
        for j in range(n):
            if i == j:
                continue
            d = _haversine_m(lat, lng, centers[j][0], centers[j][1])
            if 0.4 < d < 40 and d < best:
                best = d
        if math.isfinite(best) and best < 1e7:
            nn.append(best)
    if len(nn) < 5:
        return None
    return float(np.median(nn))


def planted_area_ha(trees: list[dict]) -> float | None:
    if len(trees) < 3:
        return None
    lats = [float(t["center_lat"]) for t in trees]
    lngs = [float(t["center_lng"]) for t in trees]
    lat0 = float(np.mean(lats))
    lng0 = float(np.mean(lngs))
    m_lat = 111320.0
    m_lng = 111320.0 * math.cos(math.radians(lat0))
    # bbox con margen pequeño
    w = (max(lngs) - min(lngs)) * m_lng
    h = (max(lats) - min(lats)) * m_lat
    if w <= 0 or h <= 0:
        return None
    return (w * h) / 10000.0


def trees_to_ui(trees: list[dict], mean_area: float) -> list[dict]:
    out = []
    for tree in trees:
        key = str(tree.get("sem_key") or "verde")
        label, color = SEM_LABELS.get(key, SEM_LABELS["verde"])
        area_px = float(tree.get("area_px") or 0)
        metrics = tree.get("metrics_json") if isinstance(tree.get("metrics_json"), dict) else {}
        pct = ((area_px - mean_area) / mean_area * 100.0) if mean_area > 0 else None
        out.append(
            {
                "id": tree.get("tree_index"),
                "stableId": tree.get("stable_id") or tree.get("tree_index"),
                "areaPx": round(area_px, 2),
                "areaM2": tree.get("area_m2"),
                "diameterM": tree.get("diameter_m"),
                "confidence": tree.get("confidence"),
                "center": [float(tree["center_lat"]), float(tree["center_lng"])],
                "latlngs": tree.get("polygon_json") or [],
                "sem": {
                    "key": key,
                    "label": label,
                    "color": color,
                    "fill": color + "99",
                },
                "z": metrics.get("z"),
                "isManual": bool(tree.get("is_manual")),
                "pctVsMean": round(pct, 2) if pct is not None else None,
                "source": str(tree.get("metrics_json", {}).get("source") or "cursor_local")
                if isinstance(tree.get("metrics_json"), dict)
                else "cursor_local",
            }
        )
    return out


def write_preview(path: Path, trees: list[dict], out_png: Path) -> None:
    """Preview rápido RGB + contornos (downsample)."""
    try:
        import cv2
        import rasterio
        from rasterio.enums import Resampling
        from rasterio.warp import transform as warp_transform
    except Exception:
        return

    with rasterio.open(path) as ds:
        scale = max(ds.width, ds.height) / 1600.0
        scale = max(1.0, scale)
        out_w = max(1, int(round(ds.width / scale)))
        out_h = max(1, int(round(ds.height / scale)))
        data = ds.read(
            indexes=[1, 2, 3],
            out_shape=(3, out_h, out_w),
            resampling=Resampling.bilinear,
        )
        rgb = np.dstack([data[0], data[1], data[2]])
        if rgb.dtype != np.uint8:
            rgb = np.clip(rgb, 0, 255).astype(np.uint8)
        img = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
        transform = ds.transform
        for tree in trees:
            ring = tree.get("polygon_json") or []
            if len(ring) < 3:
                continue
            pts = []
            for lat, lng in ring:
                xs, ys = warp_transform("EPSG:4326", ds.crs, [lng], [lat])
                col, row = ~transform * (xs[0], ys[0])
                pts.append([int(round(col / scale)), int(round(row / scale))])
            arr = np.asarray(pts, dtype=np.int32)
            key = str(tree.get("sem_key") or "verde")
            color = {
                "rojo": (38, 38, 220),
                "amarillo": (6, 119, 217),
                "verde": (70, 160, 22),
                "azul": (230, 99, 37),
            }.get(key, (70, 160, 22))
            cv2.polylines(img, [arr], True, color, 1, cv2.LINE_AA)
        out_png.parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(out_png), img)


def _load_predio_polygon(path: Path) -> list[tuple[float, float]] | None:
    """GeoJSON predio → anillo (lat, lng). Acepta FeatureCollection/Feature/Polygon."""
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None
    geom = None
    if isinstance(data, dict):
        if data.get("type") == "FeatureCollection":
            feats = data.get("features") or []
            if feats and isinstance(feats[0], dict):
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
    if not coords or len(coords) < 3:
        return None
    ring: list[tuple[float, float]] = []
    for pt in coords:
        if not isinstance(pt, (list, tuple)) or len(pt) < 2:
            continue
        lng, lat = float(pt[0]), float(pt[1])
        ring.append((lat, lng))
    return ring if len(ring) >= 3 else None


def _point_in_ring(lat: float, lng: float, ring: list[tuple[float, float]]) -> bool:
    """Ray casting; ring en (lat, lng)."""
    inside = False
    n = len(ring)
    j = n - 1
    for i in range(n):
        lat_i, lng_i = ring[i]
        lat_j, lng_j = ring[j]
        if ((lng_i > lng) != (lng_j > lng)) and (
            lat < (lat_j - lat_i) * (lng - lng_i) / (lng_j - lng_i + 1e-18) + lat_i
        ):
            inside = not inside
        j = i
    return inside


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


def main() -> int:
    parser = argparse.ArgumentParser(description="AirCI detección local → JSON para AirCI")
    parser.add_argument("tif", type=Path, help="Ruta al GeoTIFF")
    parser.add_argument("--out", type=Path, default=None, help="Carpeta de salida")
    parser.add_argument(
        "--engine",
        choices=("deepforest", "classical"),
        default="deepforest",
        help="deepforest = modelo pretrained (recomendado, sin calibrar a mano). classical = OpenCV.",
    )
    parser.add_argument("--min-canopy-m", type=float, default=1.5)
    parser.add_argument("--max-canopy-m", type=float, default=10.0)
    parser.add_argument(
        "--spacing-m",
        type=float,
        default=4.2,
        help="Espaciado para NMS (m) en motor classical.",
    )
    parser.add_argument("--trees-per-ha", type=float, default=0.0)
    parser.add_argument("--patch-size", type=int, default=0, help="DeepForest patch px (0=auto ~40m)")
    parser.add_argument("--score-thresh", type=float, default=0.12, help="DeepForest score mínimo")
    parser.add_argument(
        "--predio",
        type=Path,
        default=None,
        help="GeoJSON del predio: recorta árboles cuyo centro quede fuera.",
    )
    args = parser.parse_args()

    tif = args.tif.expanduser().resolve()
    if not tif.is_file():
        print(f"No existe: {tif}", file=sys.stderr)
        return 1

    out_dir = (args.out or (tif.parent / "airci-cursor-out")).expanduser().resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    predio_path = args.predio.expanduser().resolve() if args.predio else None
    if predio_path is None:
        auto = tif.parent / "airci-predio.geojson"
        if auto.is_file():
            predio_path = auto
    predio_ring = _load_predio_polygon(predio_path) if predio_path and predio_path.is_file() else None

    def progress(pct: int, phase: str) -> None:
        print(f"[{pct:3d}%] {phase}", flush=True)

    options = {
        "detector_mode": "classical_v1",
        "min_canopy_m": args.min_canopy_m,
        "max_canopy_m": args.max_canopy_m,
        "expected_spacing_m": float(args.spacing_m or 0),
        "tile_size": 2048,
        "overlap": 320,
        "patch_size": int(args.patch_size or 0),
        "score_thresh": float(args.score_thresh),
        "iou_threshold": 0.3,
        "patch_overlap": 0.25,
    }
    if 20 <= float(args.trees_per_ha or 0) <= 5000:
        options["target_trees_per_ha"] = float(args.trees_per_ha)

    print(f"Analizando: {tif}", flush=True)
    print(f"Motor: {args.engine}", flush=True)
    if predio_ring:
        print(f"Predio: {predio_path} ({len(predio_ring)} vértices)", flush=True)

    if args.engine == "deepforest":
        if analyze_geotiff_deepforest is None:
            print(
                "DeepForest no está instalado en este Python. "
                "Usa scripts/airci_canopy/.venv o --engine classical.",
                file=sys.stderr,
            )
            return 2
        trees, stats = analyze_geotiff_deepforest(str(tif), options, progress=progress)
    else:
        trees, stats = analyze_geotiff(str(tif), options, progress=progress)

    if predio_ring:
        before = len(trees)
        trees = [
            t
            for t in trees
            if _point_in_ring(float(t["center_lat"]), float(t["center_lng"]), predio_ring)
        ]
        for i, tree in enumerate(trees, start=1):
            tree["tree_index"] = i
            if not tree.get("stable_id"):
                tree["stable_id"] = str(i)
        print(f"Clip predio: {before} → {len(trees)} árboles", flush=True)

    spacing = estimate_spacing_m(trees)
    plant_ha = planted_area_ha(trees)
    dens_est = None
    if spacing and spacing > 0:
        dens_est = 10000.0 / (spacing * spacing)
    dens_from_bbox = None
    if plant_ha and plant_ha > 0 and trees:
        dens_from_bbox = len(trees) / plant_ha

    stats = dict(stats or {})
    stats["estimatedSpacingM"] = round(spacing, 3) if spacing else None
    stats["estimatedTreesPerHa"] = round(dens_est, 1) if dens_est else None
    stats["plantedBboxHa"] = round(plant_ha, 4) if plant_ha else None
    stats["treesPerHaPlantedBbox"] = round(dens_from_bbox, 1) if dens_from_bbox else None
    stats["source"] = "cursor_local"
    stats["hasScale"] = stats.get("gsdM") is not None
    if stats.get("gsdM") is not None and stats.get("gsdCm") is None:
        stats["gsdCm"] = round(float(stats["gsdM"]) * 100.0, 2)
    predio_ha = _predio_area_ha(predio_ring) if predio_ring else None
    if predio_ha and predio_ha > 0:
        stats["predioAreaHa"] = round(predio_ha, 4)
        stats["treesPerHa"] = round(len(trees) / predio_ha, 1)
        stats["clippedToPredio"] = True
        stats["predioFile"] = str(predio_path) if predio_path else None
        if stats.get("targetTreesPerHa"):
            stats["expectedTrees"] = int(round(float(stats["targetTreesPerHa"]) * predio_ha))
    # Recalcular cover / área media sobre inventario clipado
    mean_area = float(np.mean([float(t.get("area_px") or 0) for t in trees])) if trees else 0.0
    std_area = float(np.std([float(t.get("area_px") or 0) for t in trees])) if trees else 0.0
    stats["count"] = len(trees)
    stats["resultTrees"] = len(trees)
    stats["meanArea"] = round(mean_area, 3)
    stats["stdArea"] = round(std_area, 3)
    gsd_m = stats.get("gsdM")
    if gsd_m and trees:
        areas_m2 = [float(t.get("area_m2") or 0) for t in trees]
        stats["meanAreaM2"] = round(float(np.mean(areas_m2)), 3)
        stats["canopyAreaM2"] = round(float(sum(areas_m2)), 1)
        if predio_ha and predio_ha > 0:
            cover = 100.0 * float(sum(areas_m2)) / (predio_ha * 10000.0)
            stats["coverPct"] = round(min(100.0, cover), 3)
            stats["barePct"] = round(max(0.0, 100.0 - cover), 3)
    elif stats.get("coverPct") is not None and stats.get("barePct") is None:
        stats["barePct"] = max(0.0, 100.0 - float(stats["coverPct"]))

    # Semáforo relativo al set clipado
    if trees and mean_area > 0 and std_area >= 0:
        for tree in trees:
            z = (float(tree.get("area_px") or 0) - mean_area) / (std_area + 1e-6)
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

    ui_trees = trees_to_ui(trees, mean_area)
    predio_payload = None
    if predio_ring:
        predio_payload = {
            "path": str(predio_path) if predio_path else None,
            "vertices": len(predio_ring),
            "areaHa": stats.get("predioAreaHa"),
        }
    payload = {
        "format": "airci_cursor_result_v1",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source": "cursor_local",
        "ortho": {
            "path": str(tif),
            "filename": tif.name,
        },
        "predio": predio_payload,
        "stats": stats,
        "trees": ui_trees,
        "trees_raw": trees,
    }

    json_path = out_dir / "airci-canopy-result.json"
    with json_path.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False)

    light_path = out_dir / "airci-canopy-result-light.json"
    light_payload = {k: v for k, v in payload.items() if k != "trees_raw"}
    with light_path.open("w", encoding="utf-8") as fh:
        json.dump(light_payload, fh, ensure_ascii=False)

    # GeoJSON ligero (centros + polígonos)
    features = []
    for tree in trees:
        ring = tree.get("polygon_json") or []
        coords = [[lng, lat] for lat, lng in ring]
        if coords and coords[0] != coords[-1]:
            coords.append(coords[0])
        if len(coords) < 4:
            continue
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "id": tree.get("tree_index"),
                    "area_m2": tree.get("area_m2"),
                    "diameter_m": tree.get("diameter_m"),
                    "sem": tree.get("sem_key"),
                },
                "geometry": {"type": "Polygon", "coordinates": [coords]},
            }
        )
    geo_path = out_dir / "airci-canopy.geojson"
    with geo_path.open("w", encoding="utf-8") as fh:
        json.dump({"type": "FeatureCollection", "features": features}, fh)

    preview_path = out_dir / "airci-canopy-preview.jpg"
    write_preview(tif, trees, preview_path)

    summary = {
        "count": stats.get("count"),
        "coverPct": stats.get("coverPct"),
        "gsdCm": stats.get("gsdCm"),
        "treesPerHa": stats.get("treesPerHa"),
        "predioAreaHa": stats.get("predioAreaHa"),
        "estimatedSpacingM": stats.get("estimatedSpacingM"),
        "estimatedTreesPerHa": stats.get("estimatedTreesPerHa"),
        "plantedBboxHa": stats.get("plantedBboxHa"),
        "detectorVersion": stats.get("detectorVersion"),
        "json": str(json_path),
        "light": str(light_path),
        "geojson": str(geo_path),
        "preview": str(preview_path) if preview_path.exists() else None,
    }
    print(json.dumps(summary, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
