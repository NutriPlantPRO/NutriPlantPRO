-- ============================================================
-- Seguimiento con ionómetro: tablas del usuario (no del proyecto)
-- ============================================================
-- Ejecuta en Supabase → SQL Editor. Añade la columna a profiles.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ionometro_seguimientos JSONB DEFAULT '{"version":1,"tables":[]}';

COMMENT ON COLUMN public.profiles.ionometro_seguimientos IS 'Seguimientos de ionómetro del usuario (varias tablas con título). Sobrevive al borrar proyectos.';
