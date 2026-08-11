-- ============================================================
-- NutriPlant PRO — cobros PayPal reales (ciclos), no estimación por meses
-- Ejecutar en Supabase SQL Editor
-- ============================================================
-- Cada PAYMENT.SALE.COMPLETED del webhook inserta una fila y suma 1 a paypal_paid_cycles.
-- El resumen de admin usa esos cobros (histórico y por año).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS paypal_paid_cycles INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.profiles.paypal_paid_cycles IS
  'Número de cobros PayPal registrados (PAYMENT.SALE.COMPLETED). No estimar por fechas.';

-- Backfill: quien ya tiene last_payment y aún no tiene contador → 1 cobro conocido
UPDATE public.profiles
SET paypal_paid_cycles = 1
WHERE last_payment_date IS NOT NULL
  AND COALESCE(paypal_paid_cycles, 0) = 0
  AND COALESCE(is_admin, false) = false;

CREATE TABLE IF NOT EXISTS public.paypal_payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id TEXT NOT NULL,
  profile_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  paypal_subscription_id TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  amount_usd NUMERIC(12, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT paypal_payment_events_sale_id_unique UNIQUE (sale_id)
);

CREATE INDEX IF NOT EXISTS idx_paypal_payment_events_profile_paid
  ON public.paypal_payment_events (profile_id, paid_at DESC);

CREATE INDEX IF NOT EXISTS idx_paypal_payment_events_paid_at
  ON public.paypal_payment_events (paid_at DESC);

COMMENT ON TABLE public.paypal_payment_events IS
  'Historial de cobros PayPal (idempotente por sale_id). Fuente del ingreso por año.';

-- RLS: solo service role / backend (mismo patrón que otras tablas internas)
ALTER TABLE public.paypal_payment_events ENABLE ROW LEVEL SECURITY;

-- Si ya hubo renovaciones antes de este SQL, el backfill deja 1.
-- Ajusta a mano los que ya renovaron, ej.:
--   UPDATE public.profiles SET paypal_paid_cycles = 2 WHERE email = 'usuario@ejemplo.com';
