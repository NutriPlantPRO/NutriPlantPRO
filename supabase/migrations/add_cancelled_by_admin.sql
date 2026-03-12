-- Distinguir cancelación por admin (cortar ya) vs por PayPal (acceso hasta fin de ciclo).
-- Ejecuta esto en Supabase → SQL Editor si la columna no existe.

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS cancelled_by_admin boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN profiles.cancelled_by_admin IS 'true = admin canceló en panel (cortar acceso ya). false/null = canceló en PayPal (acceso hasta next_payment_date).';
