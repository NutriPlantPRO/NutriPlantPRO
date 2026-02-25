-- ============================================================
-- Enmiendas personalizadas por usuario en la nube (catálogo)
-- ============================================================
-- Ejecuta en Supabase → SQL Editor. Añade la columna a profiles.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS custom_amendments JSONB DEFAULT '[]';

-- Comentario opcional para documentar
COMMENT ON COLUMN public.profiles.custom_amendments IS 'Catálogo de enmiendas personalizadas del usuario (array de objetos: id, name, formula, k, ca, mg, so4, etc.)';
