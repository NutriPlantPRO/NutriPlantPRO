#!/usr/bin/env python3
"""
Pilot NDVI/NDMI desde Sentinel-2 L2A (Copernicus / Planetary Computer) — sin Google.

Uso local:
  pip install -r scripts/radar_cdse/requirements.txt
  python scripts/radar_cdse/generate.py --polygon '[[19.43,-99.13],[19.44,-99.12],[19.43,-99.11]]'

Variables opcionales (CDSE):
  CDSE_CLIENT_ID, CDSE_CLIENT_SECRET

Salida: JSON en stdout con ndvi_data_url / ndmi_data_url (base64 PNG).
"""

from __future__ import annotations

import argparse
import base64
import io
import json
import os
import sys
from datetime import datetime, timedelta, timezone

import numpy as np
import requests
from PIL import Image

PC_STAC = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
PC_SIGN = "https://planetarycomputer.microsoft.com/api/sas/v1/sign"
CDSE_STAC = "https://stac.dataspace.copernicus.eu/v1/search"
CDSE_TOKEN = (
    "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
)

NDVI_VIS = {"min": 0.10, "max": 0.92, "palette": [
    "7f1d1d", "b91c1c", "ea580c", "f59e0b", "fde68a", "bef264", "65a30d", "15803d", "064e3b"
]}
NDMI_VIS = {"min": -0.25, "max": 0.55, "palette": [
    "7c2d12", "ea580c", "f59e0b", "fde68a", "bbf7d0", "22c55e", "0f766e", "0369a1"
]}


def bbox_from_polygon(polygon):
    lats = [p[0] for p in polygon]
    lngs = [p[1] for p in polygon]
    return [min(lngs), min(lats), max(lngs), max(lats)]


def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def colorize(index, vis, width, height):
    stops = [hex_to_rgb(c) for c in vis["palette"]]
    vmin, vmax = vis["min"], vis["max"]
    rgba = np.zeros((height, width, 4), dtype=np.uint8)
    for y in range(height):
        for x in range(width):
            v = index[y, x]
            if not np.isfinite(v):
                continue
            t = (float(v) - vmin) / (vmax - vmin)
            t = max(0.0, min(1.0, t))
            pos = t * (len(stops) - 1)
            i = min(int(pos), len(stops) - 2)
            f = pos - i
            r = stops[i][0] + (stops[i + 1][0] - stops[i][0]) * f
            g = stops[i][1] + (stops[i + 1][1] - stops[i][1]) * f
            b = stops[i][2] + (stops[i + 1][2] - stops[i][2]) * f
            rgba[y, x] = (int(r), int(g), int(b), 230)
    buf = io.BytesIO()
    Image.fromarray(rgba, mode="RGBA").save(buf, format="PNG")
    return buf.getvalue()


def sign_pc(href):
    signed = requests.get(
        PC_SIGN, params={"href": href}, timeout=60
    )
    if signed.ok:
        data = signed.json()
        if data.get("href"):
            return data["href"]
    tok = requests.get(
        "https://planetarycomputer.microsoft.com/api/sas/v1/token/sentinel-2-l2a",
        timeout=60,
    )
    if tok.ok:
        token = tok.json().get("token")
        if token:
            sep = "&" if "?" in href else "?"
            return href + sep + token
    signed.raise_for_status()


def cdse_token():
    cid = os.environ.get("CDSE_CLIENT_ID", "").strip()
    sec = os.environ.get("CDSE_CLIENT_SECRET", "").strip()
    if not cid or not sec:
        return None
    r = requests.post(
        CDSE_TOKEN,
        data={
            "grant_type": "client_credentials",
            "client_id": cid,
            "client_secret": sec,
        },
        timeout=60,
    )
    r.raise_for_status()
    return r.json()["access_token"]


def stac_search(url, body, headers=None):
    r = requests.post(url, json=body, headers=headers or {}, timeout=90)
    r.raise_for_status()
    return r.json()


def find_scene(bbox, lookback_days, provider):
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=lookback_days)
    dt = f"{start.isoformat().replace('+00:00', 'Z')}/{end.isoformat().replace('+00:00', 'Z')}"
    if provider == "cdse":
        token = cdse_token()
        if not token:
            provider = "planetary"
        else:
            data = stac_search(
                CDSE_STAC,
                {
                    "collections": ["sentinel-2-l2a"],
                    "bbox": bbox,
                    "datetime": dt,
                    "filter": {"op": "<", "args": [{"property": "eo:cloud_cover"}, 40]},
                    "filter-lang": "cql2-json",
                    "limit": 5,
                },
                {"Authorization": f"Bearer {token}"},
            )
            feats = data.get("features") or []
            if feats:
                return provider, feats[0], token
    data = stac_search(
        PC_STAC,
        {
            "collections": ["sentinel-2-l2a"],
            "bbox": bbox,
            "datetime": dt,
            "query": {"eo:cloud_cover": {"lt": 40}},
            "sort": [{"field": "eo:cloud_cover", "direction": "asc"}],
            "limit": 5,
        },
    )
    feats = data.get("features") or []
    if not feats:
        raise RuntimeError("Sin escenas Sentinel-2 L2A en el periodo")
    return "planetary", feats[0], None


def pick_asset(assets, names):
    for n in names:
        a = assets.get(n)
        if a and a.get("href"):
            return a["href"]
    return None


def read_band_window(url, bbox, out_w, out_h):
    try:
        import rasterio
        from rasterio.windows import from_bounds
        from rasterio.warp import transform_bounds
    except ImportError as e:
        raise RuntimeError(
            "Instala rasterio: pip install rasterio (requiere GDAL en el sistema)"
        ) from e

    west, south, east, north = bbox
    with rasterio.open(url) as src:
        dst_crs = src.crs
        b = transform_bounds("EPSG:4326", dst_crs, west, south, east, north)
        window = from_bounds(*b, transform=src.transform)
        data = src.read(
            1,
            window=window,
            out_shape=(out_h, out_w),
            resampling=rasterio.enums.Resampling.bilinear,
        ).astype("float32")
        nodata = src.nodata
    if nodata is not None:
        data[data == nodata] = np.nan
    data[data > 1.5] /= 10000.0
    return data


def main():
    ap = argparse.ArgumentParser(description="Pilot NDVI/NDMI Sentinel-2")
    ap.add_argument("--polygon", required=True, help="JSON [[lat,lng],...]")
    ap.add_argument("--lookback-days", type=int, default=120)
    ap.add_argument("--provider", choices=["planetary", "cdse", "auto"], default="auto")
    ap.add_argument("--max-dim", type=int, default=1024)
    args = ap.parse_args()

    polygon = json.loads(args.polygon)
    if len(polygon) < 3:
        raise SystemExit("polygon inválido")

    bbox = bbox_from_polygon(polygon)
    provider = args.provider
    if provider == "auto":
        provider = "cdse" if os.environ.get("CDSE_CLIENT_ID") else "planetary"

    prov, item, _token = find_scene(bbox, args.lookback_days, provider)
    assets = item.get("assets") or {}
    b04 = pick_asset(assets, ["B04", "b04", "red"])
    b08 = pick_asset(assets, ["B08", "b08", "nir"])
    b11 = pick_asset(assets, ["B11", "b11", "swir16"])
    if not all([b04, b08, b11]):
        raise SystemExit("Escena sin bandas B04/B08/B11")

    if prov == "planetary":
        b04, b08, b11 = sign_pc(b04), sign_pc(b08), sign_pc(b11)

    lat_span = max(1e-6, bbox[3] - bbox[1])
    lng_span = max(1e-6, bbox[2] - bbox[0])
    aspect = lng_span / lat_span
    max_dim = max(256, min(1536, args.max_dim))
    if aspect >= 1:
        out_w, out_h = max_dim, max(64, int(max_dim / aspect))
    else:
        out_h, out_w = max_dim, max(64, int(max_dim * aspect))

    red = read_band_window(b04, bbox, out_w, out_h)
    nir = read_band_window(b08, bbox, out_w, out_h)
    swir = read_band_window(b11, bbox, out_w, out_h)

    ndvi = (nir - red) / (nir + red)
    ndmi = (nir - swir) / (nir + swir)
    ndvi[~np.isfinite(ndvi)] = np.nan
    ndmi[~np.isfinite(ndmi)] = np.nan

    ndvi_png = colorize(ndvi, NDVI_VIS, out_w, out_h)
    ndmi_png = colorize(ndmi, NDMI_VIS, out_w, out_h)

    out = {
        "ok": True,
        "pilot": True,
        "provider": prov,
        "scene_id": item.get("id"),
        "datetime": (item.get("properties") or {}).get("datetime"),
        "ndvi_data_url": "data:image/png;base64," + base64.b64encode(ndvi_png).decode(),
        "ndmi_data_url": "data:image/png;base64," + base64.b64encode(ndmi_png).decode(),
    }
    print(json.dumps(out))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}))
        sys.exit(1)
