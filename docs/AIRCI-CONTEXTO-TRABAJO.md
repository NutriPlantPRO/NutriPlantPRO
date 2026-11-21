# AirCI — Contexto de trabajo (vivo)

Documento interno para chats / agentes. **Actualizar** cuando cambie algo importante (huerta, modelo, umbral, decisión).  
No sustituye arquitectura (`AIRCI-CANOPY-DETECTION-ARCHITECTURE.md`) ni status legacy (`AIRCI-STATUS.md`).

Última actualización: 2026-11-21

---

## Principios

1. **Copas reales**, no blobs. Densidad de huerta = referencia blanda, nunca forzar conteo inventando/borrando.
2. Motor actual preferido: **DeepForest** (pretrained o fine-tuned). Classical/OpenCV = respaldo.
3. Umbrales (`score-thresh`, etc.) son **por huerta / corrida**, no globales del producto.
4. Trabajo pesado (detect, fine-tune) en **Cursor/Mac** → JSON → **Importar Cursor** en AirCI. Radar satelital = async Netlify (`airci-radar-background`).

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

- [ ] Revisar preview Campo 1 en AirCI (FP vs huecos)
- [ ] Más etiquetas si faltan copas; subir umbral si hay basura
- [ ] No asumir mismo checkpoint/umbral en otras huertas
- [ ] (Opcional) perfil por huerta: dens. ref + weights + score default

---

## Bitácora corta

- **2026-11-21** — Fine-tune Campo 1 OK; primer save falló (`AttributeError: save`); corregido `save_model`. Detect FT → 1313@0.15 luego 1411@0.10 + target 404 blando. Radar AirCI async desplegado antes.
- **2026-11** — Abandono calibración clásica a mano; pivot a DeepForest + etiquetado.

---

## Cómo enriquecer

Al final de una sesión útil, añadir 2–5 líneas en **Bitácora** y actualizar tablas/principios si cambió la verdad operativa.
