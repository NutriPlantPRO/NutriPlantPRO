-- ============================================================
-- NutriPlant PRO - Perfil: columnas que usa Admin y app
-- ============================================================
-- Ejecuta en Supabase → SQL Editor.
-- Añade solo las columnas que falten; no borra datos.
-- ============================================================

-- Suscripción y PayPal (resumen admin, webhook PayPal)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS subscription_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subscription_activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_payment_date TIMESTAMPTZ;

-- Índice para PayPal (evitar duplicar subscription_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_paypal_subscription_id_unique
  ON public.profiles (paypal_subscription_id)
  WHERE paypal_subscription_id IS NOT NULL;

-- Datos que el admin puede ver/editar (registro y perfil)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS profession TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS crops TEXT[],
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Chat (límites y uso)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS chat_blocked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS chat_limit_monthly INT,
  ADD COLUMN IF NOT EXISTS chat_usage_current_month INT,
  ADD COLUMN IF NOT EXISTS chat_usage_month TEXT;

-- Contraseña visible solo para admin (opcional)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_plain TEXT;

-- Comentarios (opcional)
-- Valores: los que usa la app + los que mapea el webhook desde PayPal
-- PayPal → nuestro valor: CREATED/APPROVED→pending, ACTIVATED→active, CANCELLED→cancelled, SUSPENDED→suspended, EXPIRED→expired
COMMENT ON COLUMN public.profiles.subscription_status IS 'active | pending | cancelled | expired | suspended | inactive (PayPal: ACTIVATED, CREATED/APPROVED, CANCELLED, SUSPENDED, EXPIRED)';
COMMENT ON COLUMN public.profiles.subscription_amount IS 'Monto por ciclo (ej. cada 5 meses) en USD';
COMMENT ON COLUMN public.profiles.last_payment_date IS 'Última fecha de pago (PayPal o manual)';
COMMENT ON COLUMN public.profiles.next_payment_date IS 'Próxima fecha de pago';
