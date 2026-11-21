#!/usr/bin/env python3
"""Fine-tune DeepForest con annotations.csv del label_tool.

Uso (después de etiquetar):
  .venv/bin/python labeling/finetune_deepforest.py \\
    --set "/ruta/label-set-campo1" \\
    --epochs 5 \\
    --out "/ruta/label-set-campo1/model"
"""

from __future__ import annotations

import argparse
from pathlib import Path


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--set", type=Path, required=True, help="Carpeta con images/ + annotations.csv")
    ap.add_argument("--epochs", type=int, default=5)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()

    root = args.set.expanduser().resolve()
    csv_path = root / "annotations.csv"
    if not csv_path.is_file():
        raise SystemExit(f"Falta {csv_path} — exporta desde label_tool.html")
    images = root / "images"
    if not images.is_dir():
        raise SystemExit(f"Falta {images}")

    # DeepForest espera rutas relativas/absolutas válidas en el CSV.
    # Asegura que image_path apunte dentro del set.
    text = csv_path.read_text(encoding="utf-8").strip().splitlines()
    if len(text) < 2:
        raise SystemExit("annotations.csv casi vacío — etiqueta más copas")
    print(f"Annotations: {len(text) - 1} cajas")

    from deepforest import main as df_main

    model = df_main.deepforest()
    model.load_model(model_name="weecology/deepforest-tree", revision="main")

    # API DeepForest 1.5: create_dataset / train
    model.config["train"]["csv_file"] = str(csv_path)
    model.config["train"]["root_dir"] = str(root)
    model.config["train"]["epochs"] = int(args.epochs)
    model.config["batch_size"] = 2

    args.out.mkdir(parents=True, exist_ok=True)
    print("Entrenando… (MPS/CPU). Puede tardar varios minutos.")
    model.create_trainer()
    model.trainer.fit(model)
    out_path = args.out / "airci-campo1.pt"
    # DeepForest 1.5: save_model / checkpoint Lightning
    try:
        model.save_model(str(out_path))
    except Exception:
        ckpt = args.out / "airci-campo1.ckpt"
        model.trainer.save_checkpoint(str(ckpt))
        out_path = ckpt
    print(f"Modelo guardado: {out_path}")
    print("Luego: corre predict con este checkpoint y re-exporta JSON AirCI.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
