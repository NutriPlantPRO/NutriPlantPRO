"""Servicio HTTP AirCI Professional para Google Cloud Run."""

from __future__ import annotations

import os
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from flask import Flask, jsonify, request
from supabase import Client, create_client

from detector import DETECTOR_VERSION, DetectorError, analyze_geotiff


app = Flask(__name__)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def supabase_client() -> Client:
    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not url or not key:
        raise RuntimeError("Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.")
    return create_client(url, key)


def authorize_job(job_id: str) -> Client | None:
    """Valida el JWT y limita la ejecución a trabajos del usuario autenticado."""
    authorization = request.headers.get("Authorization", "")
    access_token = authorization.removeprefix("Bearer ").strip()
    if not access_token or not job_id:
        return None
    try:
        client = supabase_client()
        user_response = client.auth.get_user(access_token)
        user = getattr(user_response, "user", None)
        user_id = getattr(user, "id", None)
        if not user_id:
            return None
        job_response = (
            client.table("airci_detect_jobs")
            .select("id")
            .eq("id", job_id)
            .eq("owner_id", user_id)
            .limit(1)
            .execute()
        )
        return client if job_response.data else None
    except Exception:
        return None


def update_job(client: Client, job_id: str, **fields) -> None:
    fields["updated_at"] = utc_now()
    client.table("airci_detect_jobs").update(fields).eq("id", job_id).execute()


def _format_error(error: Exception | str) -> str:
    if isinstance(error, DetectorError):
        return f"{error.code}: {error}"[:4000]
    return str(error)[:4000]


def fail_job(client: Client | None, job_id: str, error: Exception | str) -> None:
    if not client:
        return
    try:
        update_job(
            client,
            job_id,
            status="error",
            phase="Error",
            error_message=_format_error(error),
            finished_at=utc_now(),
        )
    except Exception:
        app.logger.exception("No se pudo registrar error del job %s", job_id)


def download_ortho(client: Client, storage_path: str, destination: Path) -> int:
    signed = client.storage.from_("airci-orthos").create_signed_url(storage_path, 3600)
    signed_url = signed.get("signedURL") or signed.get("signedUrl") or signed.get("signed_url")
    if not signed_url:
        raise RuntimeError("Supabase no devolvió URL firmada para el GeoTIFF.")
    byte_count = 0
    with requests.get(signed_url, stream=True, timeout=(30, 900)) as response:
        response.raise_for_status()
        with destination.open("wb") as output:
            for chunk in response.iter_content(chunk_size=4 * 1024 * 1024):
                if not chunk:
                    continue
                output.write(chunk)
                byte_count += len(chunk)
    return byte_count


def save_result(
    client: Client,
    job: dict,
    trees: list[dict],
    stats: dict,
    elapsed_seconds: float,
    deadline_monotonic: float,
) -> str:
    flight_id = job["flight_id"]
    owner_id = job["owner_id"]
    site_id = job["site_id"]

    result_row = {
        "site_id": site_id,
        "flight_id": flight_id,
        "owner_id": owner_id,
        "tree_count": len(trees),
        "cover_pct": stats.get("coverPct"),
        "mean_area_px": stats.get("meanArea"),
        "std_area_px": stats.get("stdArea"),
        "stats_json": stats,
        "trees_json": [],
        "detector_version": DETECTOR_VERSION,
        "source": "cloud_worker",
        "status": "done",
        "is_current": False,
        "processing_ms": int(elapsed_seconds * 1000),
        "job_id": job["id"],
        "updated_at": utc_now(),
    }
    inserted = client.table("airci_canopy_results").insert(result_row).execute()
    if not inserted.data:
        raise RuntimeError("Supabase no devolvió el resultado creado.")
    result_id = inserted.data[0]["id"]

    try:
        batch_size = 500
        for start in range(0, len(trees), batch_size):
            if time.monotonic() > deadline_monotonic:
                raise TimeoutError("Presupuesto/tiempo agotado mientras se guardaban árboles.")
            rows = []
            for tree in trees[start : start + batch_size]:
                row = dict(tree)
                row.update(
                    {
                        "result_id": result_id,
                        "site_id": site_id,
                        "flight_id": flight_id,
                        "owner_id": owner_id,
                    }
                )
                rows.append(row)
            if rows:
                client.table("airci_canopy_trees").insert(rows).execute()
            progress = 90 + int(8 * min(start + batch_size, len(trees)) / max(len(trees), 1))
            update_job(
                client,
                job["id"],
                progress=progress,
                phase=f"Guardando árboles {min(start + batch_size, len(trees))}/{len(trees)}",
            )
        client.rpc("airci_promote_canopy_result", {"p_result_id": result_id}).execute()
    except Exception:
        # El resultado anterior sigue current; borrar staging parcial.
        client.table("airci_canopy_results").delete().eq("id", result_id).execute()
        raise
    return result_id


def process_job(job_id: str, client: Client | None = None) -> dict:
    temp_path: Path | None = None
    started = time.monotonic()
    try:
        client = client or supabase_client()
        job_response = (
            client.table("airci_detect_jobs").select("*").eq("id", job_id).limit(1).execute()
        )
        if not job_response.data:
            raise RuntimeError("Trabajo AirCI no encontrado.")
        job = job_response.data[0]
        if job.get("status") == "done":
            return {"ok": True, "already_done": True, "result_id": job.get("result_id")}
        if job.get("status") == "cancelled":
            return {"ok": False, "cancelled": True}

        flight_response = (
            client.table("airci_flights")
            .select("id, site_id, owner_id, storage_path, byte_size, gsd_m, crs")
            .eq("id", job["flight_id"])
            .eq("owner_id", job["owner_id"])
            .limit(1)
            .execute()
        )
        if not flight_response.data:
            raise RuntimeError("Vuelo/GeoTIFF no encontrado.")
        flight = flight_response.data[0]

        update_job(
            client,
            job_id,
            status="processing",
            progress=2,
            phase="Preparando análisis",
            detector_version=DETECTOR_VERSION,
            started_at=utc_now(),
            error_message=None,
        )
        client.table("airci_flights").update({"status": "analyzing"}).eq(
            "id", flight["id"]
        ).execute()

        suffix = Path(flight["storage_path"]).suffix or ".tif"
        with tempfile.NamedTemporaryFile(prefix="airci-", suffix=suffix, delete=False) as handle:
            temp_path = Path(handle.name)
        update_job(client, job_id, progress=5, phase="Descargando GeoTIFF")
        downloaded_bytes = download_ortho(client, flight["storage_path"], temp_path)

        options = dict(job.get("options_json") or {})
        if job.get("detector_mode") and not options.get("detector_mode"):
            options["detector_mode"] = job.get("detector_mode")
        options.setdefault("detector_mode", "grid_v1")
        if flight.get("gsd_m"):
            options["gsd_m"] = float(flight["gsd_m"])
        cost_cap_usd = max(0.1, min(float(options.get("cost_cap_usd") or 1.0), 5.0))
        egress_estimate_usd = (downloaded_bytes / (1024**3)) * 0.09
        compute_rate_usd_sec = 2 * 0.000018 + 4 * 0.000002
        compute_budget_usd = cost_cap_usd - egress_estimate_usd
        if compute_budget_usd <= 0:
            raise RuntimeError("El archivo excede el presupuesto configurado antes de procesar.")
        max_runtime_seconds = max(
            60.0, min(780.0, compute_budget_usd / compute_rate_usd_sec)
        )
        deadline_monotonic = started + max_runtime_seconds

        last_progress = {"value": -1, "time": 0.0}

        def report(value: int, phase: str) -> None:
            now = time.monotonic()
            if now > deadline_monotonic:
                raise TimeoutError(
                    "AirCI detuvo el trabajo al alcanzar el presupuesto/tiempo configurado."
                )
            if value == last_progress["value"] and now - last_progress["time"] < 3:
                return
            update_job(client, job_id, progress=value, phase=phase)
            last_progress["value"] = value
            last_progress["time"] = now

        trees, stats = analyze_geotiff(str(temp_path), options, progress=report)
        elapsed = time.monotonic() - started
        stats["downloadedBytes"] = downloaded_bytes
        stats["processingSeconds"] = round(elapsed, 2)
        stats["costCapUsd"] = options.get("cost_cap_usd", 1)

        result_id = save_result(
            client, job, trees, stats, elapsed, deadline_monotonic=deadline_monotonic
        )
        total_elapsed = time.monotonic() - started
        stats["processingSeconds"] = round(total_elapsed, 2)
        client.table("airci_canopy_results").update(
            {
                "processing_ms": int(total_elapsed * 1000),
                "stats_json": stats,
                "updated_at": utc_now(),
            }
        ).eq("id", result_id).execute()
        # Estimación transparente con 2 vCPU + 4 GiB; Google factura según configuración real.
        compute_usd = total_elapsed * (2 * 0.000018 + 4 * 0.000002)
        egress_usd = (downloaded_bytes / (1024**3)) * 0.09
        actual_usd = round(compute_usd + egress_usd, 4)
        update_job(
            client,
            job_id,
            status="done",
            progress=100,
            phase="Análisis terminado",
            result_id=result_id,
            stats_json=stats,
            actual_usd=actual_usd,
            finished_at=utc_now(),
            error_message=None,
        )
        client.table("airci_flights").update({"status": "analyzed"}).eq(
            "id", flight["id"]
        ).execute()
        return {
            "ok": True,
            "job_id": job_id,
            "result_id": result_id,
            "trees": len(trees),
            "actual_usd": actual_usd,
        }
    except Exception as error:
        fail_job(client, job_id, error)
        if client:
            try:
                job_rows = (
                    client.table("airci_detect_jobs")
                    .select("flight_id")
                    .eq("id", job_id)
                    .limit(1)
                    .execute()
                )
                if job_rows.data:
                    client.table("airci_flights").update({"status": "ready"}).eq(
                        "id", job_rows.data[0]["flight_id"]
                    ).execute()
            except Exception:
                pass
        raise
    finally:
        if temp_path:
            temp_path.unlink(missing_ok=True)


@app.get("/health")
def health():
    return jsonify({"ok": True, "service": "airci-canopy-worker", "version": DETECTOR_VERSION})


@app.post("/process")
def process():
    payload = request.get_json(silent=True) or {}
    job_id = str(payload.get("job_id") or "").strip()
    if not job_id:
        return jsonify({"ok": False, "error": "job_id requerido"}), 400
    client = authorize_job(job_id)
    if not client:
        return jsonify({"ok": False, "error": "No autorizado"}), 401
    try:
        return jsonify(process_job(job_id, client))
    except Exception as error:
        app.logger.exception("AirCI job %s", job_id)
        return jsonify({"ok": False, "error": _format_error(error)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "8080")))
