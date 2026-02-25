-- ============================================================
-- Catálogo de fertilizantes solubles personalizados (hidroponía) por usuario
-- ============================================================
-- Ejecuta en Supabase → SQL Editor. Añade la columna a profiles.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS custom_hydro_materials JSONB DEFAULT '{"items":[]}';

COMMENT ON COLUMN public.profiles.custom_hydro_materials IS 'Catálogo de fertilizantes solubles personalizados del usuario en hidroponía (concentración elemental %), objeto con items: array';
