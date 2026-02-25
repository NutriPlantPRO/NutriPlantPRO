-- ============================================================
-- Catálogo de materiales granulares personalizados por usuario
-- ============================================================
-- Ejecuta en Supabase → SQL Editor. Añade la columna a profiles.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS custom_granular_materials JSONB DEFAULT '{}';

COMMENT ON COLUMN public.profiles.custom_granular_materials IS 'Catálogo de materias primas/fertilizantes granulares personalizados del usuario (objeto nombre -> composición N, P2O5, K2O, etc.)';
