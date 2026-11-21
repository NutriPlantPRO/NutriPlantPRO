#!/usr/bin/env python3
"""Prepara tiles RGB + cajas semilla para etiquetar ~80 copas (fine-tune DeepForest).

Uso:
  .venv/bin/python labeling/prepare_label_tiles.py \\
    --tif "/ruta/orthophoto.tif" \\
    --predio "/ruta/airci-predio.geojson" \\
    --seeds "/ruta/airci-canopy-result-light.json" \\
    --out "/ruta/label-set-campo1"
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import cv2
import numpy as np
import rasterio
from rasterio.windows import Window
from rasterio.warp import transform as warp_transform


def _to_u8(band: np.ndarray) -> np.ndarray:
    arr = band.astype(np.float32)
    finite = np.isfinite(arr)
    if not finite.any():
        return np.zeros(arr.shape, dtype=np.uint8)
    sample = arr[finite]
    lo, hi = np.percentile(sample, [1, 99])
    if hi <= lo:
        lo, hi = float(sample.min()), float(sample.max())
    if hi <= lo:
        return np.zeros(arr.shape, dtype=np.uint8)
    out = np.clip((arr - lo) * 255.0 / (hi - lo), 0, 255)
    out[~finite] = 0
    return out.astype(np.uint8)


def _load_predio_ring(path: Path) -> list[tuple[float, float]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    geom = None
    if data.get("type") == "FeatureCollection":
        geom = (data.get("features") or [{}])[0].get("geometry")
    elif data.get("type") == "Feature":
        geom = data.get("geometry")
    else:
        geom = data
    coords = None
    if geom and geom.get("type") == "Polygon":
        coords = geom["coordinates"][0]
    elif geom and geom.get("type") == "MultiPolygon":
        coords = geom["coordinates"][0][0]
    if not coords:
        raise SystemExit(f"Predio sin polígono: {path}")
    return [(float(lat), float(lng)) for lng, lat in coords]


def _point_in_ring(lat: float, lng: float, ring: list[tuple[float, float]]) -> bool:
    inside = False
    n = len(ring)
    j = n - 1
    for i in range(n):
        lat_i, lng_i = ring[i]
        lat_j, lng_j = ring[j]
        if ((lng_i > lng) != (lng_j > lng)) and (
            lat < (lat_j - lat_i) * (lng - lng_i) / ((lng_j - lng_i) + 1e-18) + lat_i
        ):
            inside = not inside
        j = i
    return inside


def _wgs_to_px(ds, lat: float, lng: float) -> tuple[float, float]:
    xs, ys = warp_transform("EPSG:4326", ds.crs, [lng], [lat])
    col, row = ~ds.transform * (xs[0], ys[0])
    return float(col), float(row)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tif", type=Path, required=True)
    ap.add_argument("--predio", type=Path, required=True)
    ap.add_argument("--seeds", type=Path, default=None, help="JSON AirCI (light) con trees")
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--tile", type=int, default=800)
    ap.add_argument("--stride", type=int, default=600)
    ap.add_argument("--target-boxes", type=int, default=80, help="Objetivo de cajas a revisar")
    args = ap.parse_args()

    tif = args.tif.expanduser().resolve()
    predio = args.predio.expanduser().resolve()
    out = args.out.expanduser().resolve()
    images_dir = out / "images"
    images_dir.mkdir(parents=True, exist_ok=True)

    ring = _load_predio_ring(predio)
    tile = max(400, int(args.tile))
    stride = max(200, int(args.stride))

    seeds: list[dict] = []
    if args.seeds and args.seeds.expanduser().resolve().is_file():
        payload = json.loads(args.seeds.expanduser().resolve().read_text(encoding="utf-8"))
        for t in payload.get("trees") or []:
            center = t.get("center") or []
            if len(center) < 2:
                continue
            lat, lng = float(center[0]), float(center[1])
            if not _point_in_ring(lat, lng, ring):
                continue
            diam_m = float(t.get("diameterM") or 0)
            area_m2 = float(t.get("areaM2") or 0)
            seeds.append(
                {
                    "lat": lat,
                    "lng": lng,
                    "diam_m": diam_m if diam_m > 0 else (2 * math.sqrt(area_m2 / math.pi) if area_m2 > 0 else 3.0),
                    "id": t.get("id"),
                }
            )

    rows_csv: list[str] = ["image_path,xmin,ymin,xmax,ymax,label"]
    tile_index: list[dict] = []
    kept_boxes = 0

    with rasterio.open(tif) as ds:
        # bbox predio en px
        cols, rows = [], []
        for lat, lng in ring:
            c, r = _wgs_to_px(ds, lat, lng)
            cols.append(c)
            rows.append(r)
        min_c = max(0, int(math.floor(min(cols))) - 20)
        max_c = min(ds.width, int(math.ceil(max(cols))) + 20)
        min_r = max(0, int(math.floor(min(rows))) - 20)
        max_r = min(ds.height, int(math.ceil(max(rows))) + 20)

        # GSD approx
        try:
            gsd = float((abs(ds.res[0]) + abs(ds.res[1])) / 2.0)
            if ds.crs and ds.crs.is_geographic:
                # rough meters
                lat0 = float(np.mean([p[0] for p in ring]))
                gsd = abs(ds.res[0]) * 111320.0 * math.cos(math.radians(lat0))
        except Exception:
            gsd = 0.05

        seed_px = []
        for s in seeds:
            c, r = _wgs_to_px(ds, s["lat"], s["lng"])
            rad = max(8.0, (s["diam_m"] * 0.5) / max(gsd, 1e-6))
            seed_px.append({"x": c, "y": r, "r": rad, "id": s["id"], "diam_m": s["diam_m"]})

        # Submuestreo espacial ~1.3× objetivo (para corregir, no etiquetar miles).
        review_n = max(int(args.target_boxes), int(round(args.target_boxes * 1.35)))
        if len(seed_px) > review_n:
            # grid bins over predio bbox
            nb = max(4, int(round(math.sqrt(review_n))))
            bins: dict[tuple[int, int], list] = {}
            for s in seed_px:
                bx = int((s["x"] - min_c) / max(1.0, (max_c - min_c)) * nb)
                by = int((s["y"] - min_r) / max(1.0, (max_r - min_r)) * nb)
                bx = min(nb - 1, max(0, bx))
                by = min(nb - 1, max(0, by))
                bins.setdefault((bx, by), []).append(s)
            picked = []
            # round-robin from bins for spatial diversity
            keys = sorted(bins.keys())
            i = 0
            while len(picked) < review_n and keys:
                key = keys[i % len(keys)]
                bucket = bins[key]
                if bucket:
                    # prefer mid sizes
                    bucket.sort(key=lambda z: abs(float(z["diam_m"]) - 3.0))
                    picked.append(bucket.pop(0))
                if not bucket:
                    keys.remove(key)
                    if not keys:
                        break
                    i = i % len(keys)
                    continue
                i += 1
            seed_px = picked

        # Un tile por semilla (centrado) — set chico y usable.
        tile_id = 0
        used_seed_ids = set()
        for s in seed_px:
            if s["id"] in used_seed_ids:
                continue
            used_seed_ids.add(s["id"])
            half = tile // 2
            x0 = int(round(s["x"] - half))
            y0 = int(round(s["y"] - half))
            x0 = max(0, min(ds.width - tile, x0))
            y0 = max(0, min(ds.height - tile, y0))
            w = min(tile, ds.width - x0)
            h = min(tile, ds.height - y0)
            if w < 200 or h < 200:
                continue

            data = ds.read(indexes=[1, 2, 3], window=Window(x0, y0, w, h))
            rgb = np.dstack([_to_u8(data[0]), _to_u8(data[1]), _to_u8(data[2])])
            name = f"tile_{tile_id:03d}.jpg"
            rel = f"images/{name}"
            cv2.imwrite(
                str(images_dir / name),
                cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR),
                [int(cv2.IMWRITE_JPEG_QUALITY), 92],
            )

            # Solo la caja foco (1 por tile) → etiquetar ~80 es manejable.
            boxes = []
            xmin = s["x"] - s["r"] - x0
            ymin = s["y"] - s["r"] - y0
            xmax = s["x"] + s["r"] - x0
            ymax = s["y"] + s["r"] - y0
            xmin = max(0, min(w - 1, xmin))
            ymin = max(0, min(h - 1, ymin))
            xmax = max(0, min(w - 1, xmax))
            ymax = max(0, min(h - 1, ymax))
            if xmax - xmin >= 6 and ymax - ymin >= 6:
                boxes.append(
                    {
                        "xmin": round(float(xmin), 1),
                        "ymin": round(float(ymin), 1),
                        "xmax": round(float(xmax), 1),
                        "ymax": round(float(ymax), 1),
                        "label": "Tree",
                        "seed_id": s["id"],
                    }
                )
                rows_csv.append(
                    f"{rel},{xmin:.1f},{ymin:.1f},{xmax:.1f},{ymax:.1f},Tree"
                )
                kept_boxes += 1

            tile_index.append(
                {
                    "id": tile_id,
                    "file": rel,
                    "x0": x0,
                    "y0": y0,
                    "width": w,
                    "height": h,
                    "focus_seed": s["id"],
                    "boxes": boxes,
                }
            )
            tile_id += 1

    (out / "annotations_seed.csv").write_text("\n".join(rows_csv) + "\n", encoding="utf-8")
    (out / "tiles.json").write_text(json.dumps(tile_index, ensure_ascii=False, indent=2), encoding="utf-8")
    manifest = {
        "tif": str(tif),
        "predio": str(predio),
        "seeds": str(args.seeds) if args.seeds else None,
        "tiles": len(tile_index),
        "seed_boxes": kept_boxes,
        "target_review": int(args.target_boxes),
        "gsd_m_approx": round(gsd, 5),
        "note": "Corrige/borra/añade cajas en label_tool.html hasta ~80 buenas. Luego exporta annotations.csv",
    }
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))
    print(f"OUT: {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
