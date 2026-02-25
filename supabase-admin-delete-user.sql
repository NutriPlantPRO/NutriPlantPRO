-- ============================================================
-- Permitir que el admin elimine usuarios/proyectos/reportes desde el panel (también en la nube)
-- ============================================================
-- Al eliminar un usuario en el panel, se borrará su perfil en Supabase (CASCADE borra proyectos y reportes).
-- Al eliminar un proyecto en el panel, se borrarán sus reportes y el proyecto en Supabase.
-- Requiere la función public.is_admin_user(): si falla, ejecuta antes supabase-fix-rls-recursion.sql.
--
-- Ejecuta en Supabase → SQL Editor.
-- ============================================================

-- Admins pueden borrar cualquier perfil EXCEPTO el suyo (no te eliminas a ti mismo)
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.is_admin_user() AND id != auth.uid());

-- Admins pueden borrar cualquier proyecto (p. ej. al limpiar huérfanos)
DROP POLICY IF EXISTS "Admins can delete projects" ON public.projects;
CREATE POLICY "Admins can delete projects"
  ON public.projects FOR DELETE
  USING (public.is_admin_user());

-- Admins pueden borrar cualquier reporte (p. ej. al eliminar un proyecto, se borran sus reportes)
DROP POLICY IF EXISTS "Admins can delete all reports" ON public.reports;
CREATE POLICY "Admins can delete all reports"
  ON public.reports FOR DELETE
  USING (public.is_admin_user());
