-- ============================================================
-- Catálogo de cultivos personalizados (nutrición granular) por usuario
-- ============================================================
-- Ejecuta en Supabase → SQL Editor. Añade la columna a profiles.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS custom_granular_crops JSONB DEFAULT '{}';

COMMENT ON COLUMN public.profiles.custom_granular_crops IS 'Catálogo de cultivos personalizados del usuario en nutrición granular (objeto cropId -> { name, extraction })';
