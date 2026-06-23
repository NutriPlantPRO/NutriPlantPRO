# Radar CDSE pilot (pre-venta, sin Google)

## Selección de escena (pilot)

Prioriza la foto **más reciente** con pocas nubes:

1. Últimos **7 días**, nubes **< 25%**
2. Si no hay → **21 días**, nubes **< 25%**
3. Si no hay → **45 días**, nubes **< 35%**

Una sola escena (no mediana como Google).

## Botón pilot en Ubicación

Icono **🛰** casi transparente, a la derecha de **Quitar capa** (solo uso interno / pruebas).
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
