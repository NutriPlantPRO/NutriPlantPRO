-- ============================================================
-- Guardar contraseña visible para el panel admin (solo lectura)
-- ============================================================
-- Solo para que el administrador pueda ver/recuperar contraseñas.
-- Se guarda al registrarse; Supabase Auth sigue siendo quien valida el login.
-- Ejecuta en Supabase → SQL Editor.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_plain TEXT;

COMMENT ON COLUMN public.profiles.password_plain IS 'Copia en texto plano solo para vista admin; se escribe únicamente en el registro.';
