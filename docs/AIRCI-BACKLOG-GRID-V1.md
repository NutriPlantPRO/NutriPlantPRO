# AirCI — Áreas por hacer (`grid_v1`)

**Base:** `docs/AIRCI-CANOPY-DETECTION-ARCHITECTURE.md`  
**Infra:** ya lista (Supabase + Netlify + Cloud Run + UI).  
**Fecha:** 2026-08-07  

Leyenda: `[ ]` pendiente · prioridad P0 = bloquea todo · P1 = pro cercano · P2 = después  

---

## Bloque 1 — Cerebro (Cloud / `detector.py`) — P0

| # | Área | Qué es | Archivo principal |
|---|------|--------|-------------------|
| 1.1 | `pattern_from_calibration` | ✅ | `detector.py` |
| 1.2 | `seed_grid` | ✅ | `detector.py` |
| 1.3 | `confirm_seed` | ✅ | `detector.py` |
| 1.4 | `merge_and_score` | ✅ | `detector.py` |
| 1.5 | Cablear `analyze_geotiff` | ✅ default `grid_v1` | `detector.py` |
| 1.6 | Errores claros | ✅ `DetectorError` + worker | `detector.py` + `worker.py` |
| 1.7 | Selftests | ✅ E5 | `selftest.py` |

**Deploy:** redeploy Cloud Run + Netlify (pendiente).

---

## Bloque 2 — API / job options — P0

| # | Área | Qué es | Archivo |
|---|------|--------|---------|
| 2.1 | `detector_mode: grid_v1` | Pasar modo en `options_json` | `airci-canopy-detect.js` + `airci.js` |
| 2.2 | Densidad / marco opcionales | `target_trees_per_ha`, opcional `planting_frame_m` | API + UI |
| 2.3 | Stats nuevas en respuesta | `expectedTrees`, `missingCount`, `plantingPattern`, `band` | worker ya guarda `stats_json` |

---

## Bloque 3 — UI AirCI — P0 / P1

| # | Área | Prioridad | Qué es |
|---|------|-----------|--------|
| 3.1 | Checklist pre-Analizar | P0 | Orto OK · densidad · 10 confirmadas |
| 3.2 | Anclas distintas en mapa | P0 | Las 10 se ven diferente (“Calibración”) |
| 3.3 | Banner esperados vs detectados | P0 | `detectados / dens×ha` + warning si discrepan mucho |
| 3.4 | Guía repartir las 10 (S/M/L) | P1 | Texto según ha del orto |
| 3.5 | Limpiar capas al re-analizar | P0 | Un solo resultado current, sin fantasmas |
| 3.6 | Export CSV/GeoJSON | P2 | Centros + áreas |

---

## Bloque 4 — Validación real — P0

| # | Área | Qué es |
|---|------|--------|
| 4.1 | Parcela test ≤ 1 ha | Contar a mano N plantas |
| 4.2 | Correr `grid_v1` | Misma densidad + 10 |
| 4.3 | Criterio listo | Error conteo ≤ 10 % + anclas OK |
| 4.4 | Actualizar `AIRCI-STATUS.md` | Marcar detección OK solo si 4.3 pasa |

---

## Bloque 5 — Pro cercano (no bloquea v1) — P1

| # | Área | Qué es |
|---|------|--------|
| 5.1 | Marco m×m en UI | Chequear vs densidad |
| 5.2 | Azimut manual opcional | Si las 10 no alinean bien |
| 5.3 | Contorno del predio | No poner seeds fuera de huerta |
| 5.4 | Badge “motor anterior” | Resultados viejos classical |

---

## Bloque 6 — Después — P2

| # | Área | Qué es |
|---|------|--------|
| 6.1 | IDs entre vuelos (F2.1) | Mismo árbol vuelo A/B |
| 6.2 | Hileras curvas (F2.2) | Contorno / no rectas |
| 6.3 | Fenología / Color Score | Otro épico (plan producto) |

---

## Orden recomendado de ataque

```text
1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.7
        ↓
      2.1 – 2.3
        ↓
      3.1 – 3.3 – 3.5
        ↓
      Deploy Cloud + Netlify
        ↓
      4.1 – 4.4  (prueba real)
        ↓
      5.x si hace falta
```

---

## Lo que NO hay que hacer

- Nueva plataforma / API / Cloud  
- Seguir parcheando umbral “verde libre”  
- Empezar fenología antes de pasar Bloque 4  
