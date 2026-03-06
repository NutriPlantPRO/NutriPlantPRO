-- ============================================================
-- Permitir que el admin edite usuarios y proyectos (también en la nube)
-- ============================================================
-- Con esto, los cambios que hagas en el panel de admin (editar usuario,
-- editar proyecto) se guardan en Supabase, no solo en este navegador.
-- Requiere que ya hayas ejecutado supabase-fix-rls-recursion.sql
--   (función public.is_admin_user()).
--
-- Ejecuta en Supabase → SQL Editor.
-- ============================================================

-- Admins pueden actualizar cualquier perfil (para editar usuarios desde el panel)
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin_user());

-- Admins pueden actualizar cualquier proyecto (para editar y restaurar desde el panel)
DROP POLICY IF EXISTS "Admins can update all projects" ON public.projects;
CREATE POLICY "Admins can update all projects"
  ON public.projects FOR UPDATE
  USING (public.is_admin_user());

-- Admins pueden insertar proyectos (necesario para upsert al restaurar: INSERT ... ON CONFLICT DO UPDATE)
DROP POLICY IF EXISTS "Admins can insert projects" ON public.projects;
CREATE POLICY "Admins can insert projects"
  ON public.projects FOR INSERT
  WITH CHECK (public.is_admin_user());
