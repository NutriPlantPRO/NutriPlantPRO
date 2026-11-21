#!/usr/bin/env python3
"""Copas → franjas → % cobertura / m² / m³. Actualiza JSON Importar Cursor.

Uso:
  python run_franjas.py "/ruta/airci-canopy-result-light.json"
  python run_franjas.py "...light.json" --predio airci-predio.geojson --height-m 4
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from franjas_engine import build_franjas_from_crowns
from run_local import _load_predio_polygon


def main() -> int:
    parser = argparse.ArgumentParser(description="AirCI franjas desde contornos de copa")
    parser.add_argument("json_path", type=Path, help="airci-canopy-result-light.json")
    parser.add_argument("--predio", type=Path, default=None)
    parser.add_argument("--out", type=Path, default=None, help="Si falta, reescribe el JSON")
    parser.add_argument("--height-m", type=float, default=4.0, help="Altura media de copa → m³")
    parser.add_argument("--merge-gap-m", type=float, default=None)
    parser.add_argument("--ortho", type=Path, default=None, help="GeoTIFF para rechazar suelo")
    parser.add_argument(
        "--keep-original-trees",
        action="store_true",
        help="No reescribir trees con copas sin traslape",
    )
    args = parser.parse_args()

    path = args.json_path.expanduser().resolve()
    if not path.is_file():
        print(f"No existe: {path}", file=sys.stderr)
        return 1

    payload = json.loads(path.read_text(encoding="utf-8"))
    trees = payload.get("trees") or []
    if not trees:
        print("El JSON no trae contornos de copa (trees).", file=sys.stderr)
        return 1

    ortho_obj = payload.get("ortho") if isinstance(payload.get("ortho"), dict) else {}
    ortho_path = args.ortho.expanduser().resolve() if args.ortho else None
    if ortho_path is None and ortho_obj.get("path"):
        cand_o = Path(str(ortho_obj["path"]))
        if cand_o.is_file():
            ortho_path = cand_o
    if ortho_path is None:
        for cand_o in path.parent.glob("*.tif"):
            ortho_path = cand_o
            break

    predio_path = args.predio.expanduser().resolve() if args.predio else None
    if predio_path is None:
        # predio embebido o junto al JSON / orto
        cand = []
        predio_obj = payload.get("predio") if isinstance(payload.get("predio"), dict) else {}
        if predio_obj.get("path"):
            cand.append(Path(str(predio_obj["path"])))
        cand.append(path.parent / "airci-predio.geojson")
        if ortho_obj.get("path"):
            cand.append(Path(str(ortho_obj["path"])).parent / "airci-predio.geojson")
        for c in cand:
            if c and c.is_file():
                predio_path = c
                break

    predio_ring = _load_predio_polygon(predio_path) if predio_path and predio_path.is_file() else None
    if not predio_ring:
        print("Se necesita --predio para % cobertura fiable.", file=sys.stderr)
        return 1

    print(f"Orto (anti-suelo): {ortho_path or '—'}", flush=True)
    result = build_franjas_from_crowns(
        trees,
        predio_ring,
        merge_gap_m=args.merge_gap_m,
        mean_canopy_height_m=args.height_m,
        ortho_path=str(ortho_path) if ortho_path else None,
    )
    if not result.get("ok"):
        print(result.get("error") or "falló franjas", file=sys.stderr)
        return 2

    stats = dict(payload.get("stats") or {})
    stats["coverPct"] = result["coverPct"]
    stats["barePct"] = result["barePct"]
    stats["canopyAreaM2"] = result["cultivationSurfaceM2"]
    stats["cultivationSurfaceM2"] = result["cultivationSurfaceM2"]
    stats["bareAreaM2"] = (
        round(float(result["predioAreaHa"]) * 10000.0 - float(result["cultivationSurfaceM2"]), 1)
        if result.get("predioAreaHa")
        else None
    )
    stats["canopyVolumeM3"] = result["canopyVolumeM3"]
    stats["meanCanopyHeightM"] = result["meanCanopyHeightM"]
    stats["coverageMethod"] = result["method"]
    stats["franjaCount"] = result["franjaCount"]
    stats["crownsDroppedSoil"] = result.get("crownsDroppedSoil")
    if result.get("predioAreaHa") is not None:
        stats["predioAreaHa"] = result["predioAreaHa"]

    payload["stats"] = stats
    payload["coverage"] = {
        "method": result["method"],
        "kind": "franjas",
        "coverPct": result["coverPct"],
        "barePct": result["barePct"],
        "cultivationSurfaceM2": result["cultivationSurfaceM2"],
        "canopyVolumeM3": result["canopyVolumeM3"],
        "meanCanopyHeightM": result["meanCanopyHeightM"],
        "mergeGapM": result["mergeGapM"],
        "polygons": result["polygons"],
    }
    if not args.keep_original_trees and result.get("treesClean"):
        payload["trees"] = result["treesClean"]
        stats["count"] = len(result["treesClean"])
        stats["resultTrees"] = stats["count"]
        payload["stats"] = stats
    payload["mode"] = "crowns_and_franjas"
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()

    out = (args.out or path).expanduser().resolve()
    out.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")

    # GeoJSON de franjas
    feats = []
    for poly in result["polygons"]:
        ring = poly.get("latlngs") or []
        coords = [[lng, lat] for lat, lng in ring]
        if coords and coords[0] != coords[-1]:
            coords.append(coords[0])
        if len(coords) < 4:
            continue
        feats.append(
            {
                "type": "Feature",
                "properties": {
                    "id": poly.get("id"),
                    "area_m2": poly.get("areaM2"),
                    "kind": "franja",
                },
                "geometry": {"type": "Polygon", "coordinates": [coords]},
            }
        )
    geo_path = out.parent / "airci-franjas.geojson"
    geo_path.write_text(
        json.dumps({"type": "FeatureCollection", "features": feats}, ensure_ascii=False),
        encoding="utf-8",
    )

    summary = {
        "franjaCount": result["franjaCount"],
        "coverPct": result["coverPct"],
        "cultivationSurfaceM2": result["cultivationSurfaceM2"],
        "canopyVolumeM3": result["canopyVolumeM3"],
        "meanCanopyHeightM": result["meanCanopyHeightM"],
        "mergeGapM": result["mergeGapM"],
        "crownsDroppedSoil": result.get("crownsDroppedSoil"),
        "crownsKept": result.get("crownCountUsed"),
        "json": str(out),
        "geojson": str(geo_path),
    }
    print(json.dumps(summary, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
