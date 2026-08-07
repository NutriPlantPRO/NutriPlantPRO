# AirCI — Estado real (2026-08-07)

## Objetivo
Ortomosaico → copas confiables → métricas → decisión en huerta.

## Arquitectura
**Cerrada:** `docs/AIRCI-CANOPY-DETECTION-ARCHITECTURE.md`  
**Backlog:** `docs/AIRCI-BACKLOG-GRID-V1.md`

## Hecho en código
- Tubería: UI, GeoTIFF, Cloud Run, calibración, edición, Supabase
- **Cerebro `grid_v1` (`airci-grid-v1.0.0`):**
  - `pattern_from_calibration` → `seed_grid` → `confirm_seed` → `merge_and_score`
  - `analyze_geotiff` usa `grid_v1` por defecto
  - Selftests E5 en verde (`scripts/airci_canopy/selftest.py`)
  - UI/API encolan `detector_mode: grid_v1`

## Pendiente para declarar “listo”
- [ ] Redeploy Cloud Run (worker con este código)
- [ ] Redeploy Netlify (API/UI)
- [ ] Prueba real ≤ 1 ha contada a mano · error ≤ 10 % (§B7)
- [ ] Anclas con estilo distinto más visible (UI polish)
- [ ] Contorno predio / marco m×m (P1)

## Regla
Prohibido volver a parchear umbral “verde libre” como estrategia.
