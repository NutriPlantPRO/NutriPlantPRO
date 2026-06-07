-- =============================================================================
-- Plan PRO — Nutri PRO: nota breve por archivo (localización + GPT Socio)
-- =============================================================================
-- Ejecutar en Supabase → SQL Editor (después de plan_pro_nutri_files).
-- =============================================================================

ALTER TABLE public.plan_pro_nutri_files
  ADD COLUMN IF NOT EXISTS description text;

COMMENT ON COLUMN public.plan_pro_nutri_files.description IS
  'Nota breve del usuario para localizar el archivo (búsqueda UI, nutri_pro_search y nutri_pro_ask).';
