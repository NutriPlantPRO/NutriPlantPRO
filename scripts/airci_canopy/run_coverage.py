#!/usr/bin/env python3
"""Cobertura de dosel (Fase A) → JSON AirCI Importar Cursor.

Uso:
  python run_coverage.py /ruta/ortho.tif --predio predio.geojson --out /ruta/salida
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from coverage_engine import analyze_coverage
from run_local import _load_predio_polygon


def main() -> int:
    parser = argparse.ArgumentParser(description="AirCI cobertura de dosel → JSON")
    parser.add_argument("tif", type=Path)
    parser.add_argument("--out", type=Path, default=None)
    parser.add_argument("--predio", type=Path, default=None)
    parser.add_argument("--max-dim", type=int, default=3500)
    parser.add_argument(
        "--score-percentile",
        type=float,
        default=56.0,
        help="Percentil del contraste local suelo↔copa (más alto = menos cobertura)",
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
    if not predio_ring:
        print("Se necesita --predio (GeoJSON) para cobertura fiable.", file=sys.stderr)
        return 1

    def progress(pct: int, phase: str) -> None:
        print(f"[{pct:3d}%] {phase}", flush=True)

    print(f"Cobertura: {tif}", flush=True)
    print(f"Predio: {predio_path} ({len(predio_ring)} vértices)", flush=True)

    preview_path = out_dir / "airci-coverage-preview.jpg"
    stats, polygons = analyze_coverage(
        str(tif),
        predio_ring=predio_ring,
        options={
            "max_dim": args.max_dim,
            "score_percentile": args.score_percentile,
            "preview_path": str(preview_path),
        },
        progress=progress,
    )
    stats["source"] = "cursor_local"
    stats["predioFile"] = str(predio_path)

    payload = {
        "format": "airci_cursor_result_v1",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source": "cursor_local",
        "mode": "coverage",
        "ortho": {"path": str(tif), "filename": tif.name},
        "predio": {
            "path": str(predio_path),
            "vertices": len(predio_ring),
            "areaHa": stats.get("predioAreaHa"),
        },
        "stats": stats,
        "trees": [],
        "coverage": {
            "method": stats.get("coverageMethod"),
            "coverPct": stats.get("coverPct"),
            "barePct": stats.get("barePct"),
            "polygons": polygons,
        },
    }

    json_path = out_dir / "airci-coverage-result.json"
    with json_path.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False)
    # No pisar airci-canopy-result-light.json (ese es inventario de copas).

    features = []
    for i, poly in enumerate(polygons, start=1):
        ring = poly.get("latlngs") or []
        coords = [[lng, lat] for lat, lng in ring]
        if coords and coords[0] != coords[-1]:
            coords.append(coords[0])
        if len(coords) < 4:
            continue
        features.append(
            {
                "type": "Feature",
                "properties": {"id": i, "area_m2": poly.get("areaM2"), "kind": "coverage"},
                "geometry": {"type": "Polygon", "coordinates": [coords]},
            }
        )
    geo_path = out_dir / "airci-coverage.geojson"
    with geo_path.open("w", encoding="utf-8") as fh:
        json.dump({"type": "FeatureCollection", "features": features}, fh)

    summary = {
        "coverPct": stats.get("coverPct"),
        "barePct": stats.get("barePct"),
        "predioAreaHa": stats.get("predioAreaHa"),
        "canopyAreaHa": stats.get("canopyAreaHa"),
        "polygonCount": stats.get("polygonCount"),
        "json": str(json_path),
        "geojson": str(geo_path),
        "preview": str(preview_path) if preview_path.exists() else None,
    }
    print(json.dumps(summary, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
