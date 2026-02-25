-- ============================================================
-- NutriPlant PRO - Campos para sincronización PayPal webhook
-- ============================================================
-- Ejecutar en Supabase SQL Editor

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_activated_at TIMESTAMPTZ;

-- Índice único parcial para evitar duplicar el mismo subscription_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_paypal_subscription_id_unique
  ON public.profiles (paypal_subscription_id)
  WHERE paypal_subscription_id IS NOT NULL;

