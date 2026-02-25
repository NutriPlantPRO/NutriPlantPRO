-- ============================================================
-- Catálogo de fertilizantes solubles personalizados (fertirriego) por usuario
-- ============================================================
-- Ejecuta en Supabase → SQL Editor. Añade la columna a profiles.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS custom_ferti_materials JSONB DEFAULT '{"items":[]}';

COMMENT ON COLUMN public.profiles.custom_ferti_materials IS 'Catálogo de fertilizantes solubles personalizados del usuario en fertirriego (objeto con items: array de materiales)';
