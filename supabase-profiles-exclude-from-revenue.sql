-- Ejecutar en Supabase → SQL Editor (una vez).
-- Marca usuarios que no deben sumarse a ingresos USD en el panel admin (p. ej. activación manual sin PayPal).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS exclude_from_revenue BOOLEAN DEFAULT false NOT NULL;

COMMENT ON COLUMN public.profiles.exclude_from_revenue IS
  'Si true, el admin no incluye a este usuario en totales de ingresos por suscripción (USD). Persiste en nube.';
