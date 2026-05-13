-- Plan PRO: color opcional por rama (categoría). Ejecutar en Supabase SQL Editor si la tabla ya existe sin esta columna.
ALTER TABLE public.plan_pro_categories
  ADD COLUMN IF NOT EXISTS color_hex text;

COMMENT ON COLUMN public.plan_pro_categories.color_hex IS 'Opcional #RRGGBB; si es NULL, Plan PRO usa el tono automático por raíz.';
