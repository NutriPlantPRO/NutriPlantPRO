-- ============================================================
-- Configurar Admin en Supabase - NutriPlant PRO
-- ============================================================
--
-- PASO 1 (manual): Crear el usuario admin en Supabase Auth
--   - Supabase Dashboard → Authentication → Users → "Add user"
--   - Email: admin@nutriplantpro.com
--   - Password: npja1502
--   - Click "Create user"
--
-- PASO 2: Ejecuta este script en Supabase → SQL Editor
--   Esto marcará al admin como administrador para que el panel
--   pueda cargar usuarios y proyectos desde la nube.
--
-- ============================================================

UPDATE public.profiles 
SET is_admin = true, updated_at = now()
WHERE email = 'admin@nutriplantpro.com';

-- Verificar: deberías ver 1 fila actualizada
-- SELECT id, email, name, is_admin FROM public.profiles WHERE email = 'admin@nutriplantpro.com';
