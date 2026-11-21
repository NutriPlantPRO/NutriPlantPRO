# AirCI — Contexto de trabajo (vivo)

Documento interno para chats / agentes. **Actualizar** cuando cambie algo importante (huerta, modelo, umbral, decisión).  
No sustituye arquitectura (`AIRCI-CANOPY-DETECTION-ARCHITECTURE.md`) ni status legacy (`AIRCI-STATUS.md`).

Última actualización: 2026-11-21 (Fase A cobertura lista)

---

## Prioridad de producto (evitar ajuste infinito)

Orden acordado (no al revés):

1. **Fase A — Cobertura de dosel** (% árbol/vegetación vs suelo dentro del predio). Máscara estable + `coverPct` / `barePct`. Entregable útil sin contar cada árbol.
2. **Fase B — Inventario de copas** (DeepForest / fine-tune) solo cuando la cobertura ya sea confiable y el productor pida conteo/ID.
3. Densidad 404/ha = referencia blanda para Fase B, no meta de Fase A.

Si una sesión cae en “otro umbral más de cajas”, parar y volver a Fase A.

---

## Principios

1. **No chasing infinito de copas.** Mejor una máscara de cobertura buena que 1400 elipses a medias.
2. Copas individuales: reales, no blobs; densidad = referencia blanda (nunca forzar conteo).
3. Motor copas (cuando toque): **DeepForest** (+ FT por huerta). Classical = respaldo / apoyo a máscara.
4. Umbrales son **por huerta / corrida**, no globales.
5. Trabajo pesado en **Cursor/Mac** → JSON → **Importar Cursor**. Radar = async Netlify.

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

### Última detección (fine-tuned)

- Weights: `airci-campo1.pt`
- `score-thresh`: **0.10** (solo esta corrida Campo 1)
- Clip predio: **1411** árboles · **~317/ha** · cover ~30 %
- Gap vs 404: ~22 % bajo → mejorar con más etiquetas / umbral, no con relleno artificial

### Etiquetado / fine-tune

- Scripts: `scripts/airci_canopy/labeling/` (ver `README.md` ahí)
- Annots útiles train: ~274 cajas (tiles 0–25 filtrados); total CSV puede ser mayor
- Guardar modelo: DeepForest 1.5 → `save_model` / checkpoint Lightning (**no** `.save()`)
- Predict: `run_local.py --engine deepforest --weights … --predio … [--trees-per-ha 404] [--score-thresh 0.10]`

---

## Código clave (repo)

- `scripts/airci_canopy/run_local.py` — CLI detect → JSON AirCI
- `scripts/airci_canopy/deepforest_engine.py` — ventanas + NMS + geo; acepta `weights`
- `scripts/airci_canopy/labeling/finetune_deepforest.py` — fine-tune
- `admin/airci.{html,js,css}` — UI Importar Cursor, overlays, Radar
- `netlify/functions/airci-radar.js` + `airci-radar-background.js` — Radar async

---

## Decisiones abiertas / siguientes

- [x] Pivot: **cobertura primero**, inventario de copas después
- [x] Motor `coverage_engine.py` + `run_coverage.py` + capa **Cobertura dosel** en AirCI
- [ ] Validar visual Campo 1 (¿38 % se ve creíble?) y afinar percentil si hace falta
- [ ] Pausar fine-tune de cajas salvo huecos claros tras cobertura OK
- [ ] Deploy Netlify (cobertura + restore orto nube)
- [ ] No asumir mismo checkpoint/umbral en otras huertas
- [x] Reabrir orto desde nube (Cursor-first baja TIFF aunque sea >80 MB)

### Cobertura Campo 1 (última)

- JSON: `…/Campo 1 (13Nov26)/airci-coverage-result.json`
- **coverPct ~38.5 %** · bare ~61.5 % · ~1.71 ha dosel · 293 polígonos
- Comando: `scripts/airci_canopy/.venv/bin/python run_coverage.py <tif> --predio … --out …`

---

## Bitácora corta

- **2026-11-21** — Fase A hecha: cobertura máscara en ~2 s; Import Cursor acepta JSON sin copas; capa UI. Socio pidió ágil/profesional vs ajuste infinito de cajas.
- **2026-11-21** — Socio: “nunca terminaremos” con ajustes de copas. Acuerdo: **Fase A cobertura** antes de seguir etiqutando/umbrales.
- **2026-11-21** — Fine-tune Campo 1 OK; primer save falló (`AttributeError: save`); corregido `save_model`. Detect FT → 1313@0.15 luego 1411@0.10 + target 404 blando.
- **2026-11** — Abandono calibración clásica a mano; pivot a DeepForest + etiquetado.

---

## Cómo enriquecer

Al final de una sesión útil, añadir 2–5 líneas en **Bitácora** y actualizar tablas/principios si cambió la verdad operativa.
