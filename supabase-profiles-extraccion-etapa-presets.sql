-- ============================================================
-- Biblioteca de curvas: extracción nutrimental por etapa (usuario)
-- ============================================================
-- Ejecuta en Supabase → SQL Editor. Añade la columna a profiles.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS extraccion_etapa_presets JSONB DEFAULT '{"version":1,"presets":[]}';

COMMENT ON COLUMN public.profiles.extraccion_etapa_presets IS 'Biblioteca personal de curvas de extracción por etapa (presets con título, kg/ha y %). Sobrevive al borrar proyectos.';
