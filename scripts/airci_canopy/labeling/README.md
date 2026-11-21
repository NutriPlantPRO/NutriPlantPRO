# AirCI — etiquetado ~80 copas → fine-tune

## 1) Preparar set (ya lo puedes correr)

```bash
cd "scripts/airci_canopy"
NO_ALBUMENTATIONS_UPDATE=1 MPLCONFIGDIR=/tmp/mpl .venv/bin/python labeling/prepare_label_tiles.py \
  --tif "/Users/jesusavila/Desktop/AirCI/Ojo Zarco/Campo 1 (13Nov26)/Task-of-2026-11-19T190356705Z-orthophoto.tif" \
  --predio "/Users/jesusavila/Desktop/AirCI/Ojo Zarco/Campo 1 (13Nov26)/airci-predio.geojson" \
  --seeds "/Users/jesusavila/Desktop/AirCI/Ojo Zarco/Campo 1 (13Nov26)/airci-canopy-result-light.json" \
  --out "/Users/jesusavila/Desktop/AirCI/Ojo Zarco/Campo 1 (13Nov26)/label-set-campo1"
```

## 2) Etiquetar

Abre `label_tool.html` en Chrome → **Cargar carpeta set** → elige `label-set-campo1`.

- Corrige cajas (borra basura, ajusta, añade faltantes).
- Meta: **~80 buenas**.
- **Exportar annotations.csv** y guárdalo dentro de `label-set-campo1/`.

## 3) Fine-tune

```bash
NO_ALBUMENTATIONS_UPDATE=1 MPLCONFIGDIR=/tmp/mpl .venv/bin/python labeling/finetune_deepforest.py \
  --set "/Users/jesusavila/Desktop/AirCI/Ojo Zarco/Campo 1 (13Nov26)/label-set-campo1" \
  --epochs 5 \
  --out "/Users/jesusavila/Desktop/AirCI/Ojo Zarco/Campo 1 (13Nov26)/label-set-campo1/model"
```
