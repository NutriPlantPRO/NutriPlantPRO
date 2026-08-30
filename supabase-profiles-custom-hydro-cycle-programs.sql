-- Programas del ciclo (multi-etapa) por usuario.
-- Ejecutar en Supabase → SQL Editor.
-- profiles ya tiene RLS por auth.uid().

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS custom_hydro_cycle_programs JSONB NOT NULL DEFAULT '{"items":[]}';

COMMENT ON COLUMN public.profiles.custom_hydro_cycle_programs IS
  'Catálogo de programas del ciclo: {items:[{id,name,stages,activeStageId,updatedAt}]}';
