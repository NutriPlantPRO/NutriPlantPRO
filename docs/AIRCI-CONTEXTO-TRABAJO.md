# AirCI — Contexto de trabajo (vivo)

Documento interno para chats / agentes. **Actualizar** cuando cambie algo importante (huerta, modelo, umbral, decisión).  
No sustituye arquitectura (`AIRCI-CANOPY-DETECTION-ARCHITECTURE.md`) ni status legacy (`AIRCI-STATUS.md`).

Última actualización: 2026-11-21 (copas + franjas → cobertura / m² / m³)

---

## Prioridad de producto (evitar ajuste infinito)

Orden acordado (como el ejemplo ChatGPT):

1. **Árbol sí/no** = modelo etiquetado (DeepForest FT), no color de suelo.
2. **Contorno de copa** = segmentación aprendida / SAM sobre caja — **no** ExG ni “café vs verde”.
3. **Franjas** → **% cobertura** → **m²** → **m³**.
4. Densidad productor = dato de campo; **no es el KPI**.

Socio: delineado tipo ChatGPT. Conteo fuera.  
Socio: **“tú solo te encajonaste con el color”** — corte a heurísticas de color; no más afinaciones internas infinitas.

---

## Principios

1. **PROHIBIDO** peinar color (ExG/sat/suelo café-gris) como verdad de árbol/copa.
2. Criterio = **etiquetas + modelo**. Cajas = DF FT. Contorno = **SAM por caja** (`--contour sam`), no color.
3. **No liderar con conteo ni gap de densidad.**
4. Umbrales/checkpoints **por huerta**.
5. Trabajo pesado en **Cursor/Mac** → JSON → **Importar Cursor**.
6. Capas nombradas ChatGPT: `airci_save_layer` / `supabase-airci-layers.sql`.

---

## Huerta activa: Ojo Zarco — Campo 1 (13 Nov 2026)

| Qué | Dónde |
|-----|--------|
| Carpeta | `~/Desktop/AirCI/Ojo Zarco/Campo 1 (13Nov26)/` |
| Orto | `Task-of-2026-11-19T190356705Z-orthophoto.tif` (GSD ~5 cm) |
| Predio | `airci-predio.geojson` (~4.45 ha) |
| Resultado import | `airci-canopy-result-light.json` (+ preview `.jpg`, geojson) |
| Label set | `label-set-campo1/` (`annotations.csv`, tiles) |
| Checkpoint FT | `label-set-campo1/model/airci-campo1.pt` |

### Densidad

- Referencia productor: **~404 árboles/ha** (aproximada; no exacta).
- Uso: `targetTreesPerHa` / `expectedTrees` en stats (~1797 esperados en predio).
- **No** usar `estimatedTreesPerHa` del espaciado NN (se infla; ignorar para decisiones).

### Última corrida producto (copas + franjas)

- Refine **foliage_mask** (sin GrabCut/elipse): verdor+sat dentro de caja DF, corta sombra/suelo
- ~1196 copas en predio · área mediana ~3.2 m² · cover ~**15 %** · ~**6 560 m²**
- Franjas v4 ancladas a contornos · JSON light listo Importar Cursor
- Siguiente juicio visual: ¿el verde pega a la hoja o sigue corto/largo?

### Etiquetado / fine-tune

- Scripts: `scripts/airci_canopy/labeling/` (ver `README.md` ahí)
- Annots útiles train: ~274 cajas (tiles 0–25 filtrados); total CSV puede ser mayor
- Guardar modelo: DeepForest 1.5 → `save_model` / checkpoint Lightning (**no** `.save()`)
- Predict: `run_local.py --engine deepforest --weights … --predio … [--trees-per-ha 404] [--score-thresh 0.10]`

---

## Código clave (repo)

- `scripts/airci_canopy/run_local.py` — detect → contornos → franjas → JSON AirCI
- `scripts/airci_canopy/deepforest_engine.py` — DF + refine contorno in-box
- `scripts/airci_canopy/franjas_engine.py` + `run_franjas.py` — copas → franjas → cover% / m² / m³
- `scripts/airci_canopy/labeling/finetune_deepforest.py` — fine-tune
- `admin/airci.{html,js,css}` — Importar Cursor, capas Franjas/cobertura + Copas
- `netlify/functions/airci-radar.js` + `airci-radar-background.js` — Radar async

---

## Decisiones abiertas / siguientes

- [x] Contornos refine in-box
- [x] Franjas desde contornos → cover% / m² / m³ (altura default 4 m)
- [ ] Validar visual Campo 1: ¿franjas se ven como el ejemplo ChatGPT?
- [ ] Ajustar altura media de copa por huerta (hoy 4 m → m³)
- [ ] Deploy Netlify (UI franjas + métricas)
- [ ] No asumir mismo checkpoint/umbral en otras huertas
- [x] Reabrir orto desde nube (Cursor-first baja TIFF aunque sea >80 MB)

### Cobertura Campo 1 (última)

- JSON: `…/Campo 1 (13Nov26)/airci-coverage-result.json`
- Motor: `coverage_local_soil_v3_antishadow` (contraste suelo↔copa + rechazo sombra)
- **coverPct ~35.7 %** · bare ~64.3 % · preview + `airci-coverage-contrast.jpg`
- Comando: `scripts/airci_canopy/.venv/bin/python run_coverage.py <tif> --predio … --out …`
- Principio: **cobertura primero**; no confundir sombra proyectada con dosel.

---

## Bitácora corta

- **2026-11-21** — Siguiente = SAM por caja DF (`sam_contour.py`, `--contour sam`). No más afinar color.
- **2026-11-21** — Socio: “tú solo te encajonaste con el color”. Corte a heurísticas de color.
- **2026-11-21** — Socio: afinar con contornos de árboles. Franjas=unión de copas (v4).
- **2026-11-21** — Socio: “falta afinar” (escalones + sombra). v3: blur/contorno suave + rechazo sombra.
- **2026-11-21** — Socio: suelo marcado + polígonos encima. Fix: scrub anti-suelo; copas sin traslape.
- **2026-11-21** — Socio: copas + franjas como ChatGPT → cover% → m²/m³. `franjas_engine` + Import Cursor; KPI = superficie de cultivo.
- **2026-11-21** — Socio: “sigues terco con el conteo”. UI Densidad = solo ref productor; KPI = contorno / franja.
- **2026-11-21** — Socio: olvidar jabón “30 s”; acción = contornos reales. Implementado `_refine_crown_ring_in_bbox` (GrabCut+verdo local); Campo 1 re-corrido.
- **2026-11-21** — Fase A hecha: cobertura máscara en ~2 s; Import Cursor acepta JSON sin copas; capa UI. Socio pidió ágil/profesional vs ajuste infinito de cajas.
- **2026-11-21** — Socio: “nunca terminaremos” con ajustes de copas. Acuerdo: **Fase A cobertura** antes de seguir etiqutando/umbrales.
- **2026-11-21** — Fine-tune Campo 1 OK; primer save falló (`AttributeError: save`); corregido `save_model`. Detect FT → 1313@0.15 luego 1411@0.10 + target 404 blando.
- **2026-11** — Abandono calibración clásica a mano; pivot a DeepForest + etiquetado.

---

## Cómo enriquecer

Al final de una sesión útil, añadir 2–5 líneas en **Bitácora** y actualizar tablas/principios si cambió la verdad operativa.
