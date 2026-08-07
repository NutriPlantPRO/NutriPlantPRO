-- Catálogo privado de soluciones nutritivas por usuario.
-- Ejecutar en Supabase → SQL Editor.
-- profiles ya tiene RLS por auth.uid(), por lo que no requiere políticas nuevas.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS custom_hydro_solutions JSONB NOT NULL DEFAULT '{"items":[]}';

COMMENT ON COLUMN public.profiles.custom_hydro_solutions IS
  'Catálogo privado de recetas de solución nutritiva: {items:[{id,name,meq,ppm,createdAt,updatedAt}]}';
