-- =============================================================================
-- Plan PRO — Nutri PRO: orden manual de archivos (arrastrar y soltar)
-- =============================================================================
-- Ejecutar en Supabase → SQL Editor (después de plan_pro_nutri_files).
-- =============================================================================

ALTER TABLE public.plan_pro_nutri_files
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_plan_pro_nutri_files_folder_sort
  ON public.plan_pro_nutri_files (folder_id, sort_order);

COMMENT ON COLUMN public.plan_pro_nutri_files.sort_order IS
  'Orden manual dentro de la carpeta (arrastrar en UI; 0 = sin orden fijo).';
