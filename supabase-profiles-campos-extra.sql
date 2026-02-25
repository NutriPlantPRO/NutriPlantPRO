-- ============================================================
-- Agregar campos extra a profiles (teléfono, profesión, etc.)
-- ============================================================
-- Para que el panel admin pueda mostrar y guardar la info con la que
-- el usuario se registró. Ejecuta en Supabase → SQL Editor.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS profession TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT;

-- Opcional: si quieres guardar más datos del registro
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS crops TEXT[];
