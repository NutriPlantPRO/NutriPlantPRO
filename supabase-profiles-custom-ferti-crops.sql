-- ============================================================
-- Catálogo de cultivos personalizados (fertirriego) por usuario
-- ============================================================
-- Ejecuta en Supabase → SQL Editor. Añade la columna a profiles.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS custom_ferti_crops JSONB DEFAULT '{}';

COMMENT ON COLUMN public.profiles.custom_ferti_crops IS 'Catálogo de cultivos personalizados del usuario en fertirriego (objeto cropId -> { name, extraction })';
