-- ============================================================
-- FIX: Recursión infinita en políticas RLS de profiles
-- ============================================================
-- El error "infinite recursion detected in policy for relation 'profiles'"
-- ocurre porque la política lee de profiles para decidir si permitir lectura.
--
-- Solución: Función SECURITY DEFINER que verifica admin sin activar RLS.
-- Ejecuta en Supabase → SQL Editor → Run
-- ============================================================

-- 1. Crear función que verifica si el usuario actual es admin (corre sin RLS)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
$$;

-- 2. Eliminar políticas que causan recursión
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all projects" ON public.projects;

-- 3. Recrear usando la función (sin recursión)
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin_user());

CREATE POLICY "Admins can view all projects"
  ON public.projects FOR SELECT
  USING (public.is_admin_user());
