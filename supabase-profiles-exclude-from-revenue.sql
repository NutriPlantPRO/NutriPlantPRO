-- Ejecutar en Supabase → SQL Editor (una vez).
-- Marca usuarios que no deben sumarse a ingresos USD en el panel admin (p. ej. activación manual sin PayPal).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS exclude_from_revenue BOOLEAN DEFAULT false NOT NULL;

COMMENT ON COLUMN public.profiles.exclude_from_revenue IS
  'Si true, el admin no incluye a este usuario en totales de ingresos por suscripción (USD). Persiste en nube.';

-- IMPORTANTE: el panel admin actualiza perfiles de *otros* usuarios. Con el esquema base solo existe
-- "Users can update own profile" (id = auth.uid()). Sin esto, el guardado en el panel no escribe en la nube:
--   1) supabase-fix-rls-recursion.sql   → función public.is_admin_user()
--   2) supabase-admin-update-user-project.sql → política "Admins can update all profiles"
-- Alternativa: servidor Python con supabase-server-config.json (service_role) y ruta POST /api/admin/patch-profile.
