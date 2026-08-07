# AirCI Canopy Worker

Worker por tiles para GeoTIFF grandes. Está preparado para Google Cloud Run y
escala a cero cuando no trabaja.

## Antes de desplegar

1. Ejecuta `supabase-airci-professional.sql` en Supabase.
2. Crea un secreto largo; el mismo valor va en Cloud Run y Netlify:
   `AIRCI_WORKER_SECRET`.
3. El worker también requiere:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

## Despliegue en Cloud Run

Desde esta carpeta:

```bash
gcloud run deploy airci-canopy-worker \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --cpu 2 \
  --memory 4Gi \
  --timeout 840 \
  --concurrency 1 \
  --max-instances 2 \
  --set-env-vars SUPABASE_URL=TU_URL \
  --set-secrets SUPABASE_SERVICE_ROLE_KEY=airci-supabase-key:latest,AIRCI_WORKER_SECRET=airci-worker-secret:latest
```

`--allow-unauthenticated` permite que Netlify alcance el servicio; `/process`
sigue protegido por `X-AirCI-Worker-Secret`. No expongas ese secreto al navegador.

En Netlify configura:

- `AIRCI_WORKER_URL`: URL del servicio, sin `/process`.
- `AIRCI_WORKER_SECRET`: mismo secreto.

## Validación local

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python worker.py
```

Salud:

```bash
curl http://localhost:8080/health
```

El detector `classical_v1` es una línea base que debe validarse con zonas
contadas manualmente. Su salida se marca `requires_review`; no debe venderse
como precisión garantizada hasta completar esa validación.
