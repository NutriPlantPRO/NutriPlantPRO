# Radar CDSE pilot (pre-venta, sin Google)

## Activar botón oculto en Ubicación

En el navegador (consola) o con URL:

```js
localStorage.setItem('np_radar_pilot', '1');
location.reload();
```

O abre el dashboard con: `?radar_pilot=1`

Verás un botón pequeño **🧪 Pilot** junto a Radar del cultivo. No afecta créditos ni el botón **Generar / actualizar** actual.

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
