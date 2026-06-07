-- Plan PRO · Nutri PRO: color opcional por carpeta.
-- Ejecutar en Supabase SQL Editor si plan_pro_nutri_folders ya existe sin esta columna.
ALTER TABLE public.plan_pro_nutri_folders
  ADD COLUMN IF NOT EXISTS color_hex text;

COMMENT ON COLUMN public.plan_pro_nutri_folders.color_hex IS 'Opcional #RRGGBB; si es NULL, Nutri PRO usa tono automático en el árbol.';
