# Radar CDSE pilot (pre-venta, sin Google)

## Procesamiento (pilot 🛰)

1. **Hasta 4 escenas** Sentinel-2 L2A en los **últimos 30 días** (≤40% nubes a nivel escena)
2. **Máscara SCL** — descarta nubes, sombras, agua y nieve píxel a píxel
3. **Mediana por píxel** — igual concepto que Google, pero ventana corta (30 d, no 120 d)
4. **2048 px** — misma resolución de salida que el Radar GEE
5. Recorte al **polígono** del predio (transparente fuera)

Si no hay escenas en 30 d, cae al fallback de **1 escena reciente** (7 → 21 → 45 d).

Icono **🛰** a la derecha de **Quitar capa** (solo pruebas internas).
No gasta créditos ni usa el botón **Generar / actualizar** de Google.

## Netlify (backend pilot)

Variables de entorno:

| Variable | Valor |
|----------|--------|
| `RADAR_CDSE_PILOT_ENABLED` | `true` |
| `RADAR_PILOT_PROVIDER` | `planetary` (default, gratis) o `cdse` |
| `CDSE_CLIENT_ID` / `CDSE_CLIENT_SECRET` | Solo si usas `cdse` |

Endpoint: `POST /api/radar-cdse-pilot`

## Script Python local (opcional)

```bash
pip install -r scripts/radar_cdse/requirements.txt
python scripts/radar_cdse/generate.py --polygon '[[19.43,-99.13],[19.44,-99.12],[19.43,-99.11]]'
```

## Cuando el pilot esté validado

Sustituir el motor de `radar-ndvi.js` (GEE) por este pipeline y reutilizar el botón **Generar / actualizar** normal.
