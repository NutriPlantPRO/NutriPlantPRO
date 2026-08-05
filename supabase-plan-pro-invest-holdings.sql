-- =============================================================================
-- PLAN PRO — Invest PRO holdings (portafolio Schwab / capturas)
-- =============================================================================
-- Dónde: Supabase → SQL Editor → New query → Run.
-- Requisito: public.is_admin_user() debe existir.
-- Idempotente: se puede ejecutar más de una vez.
--
-- Objetivo (target_shares) y comentarios: solo los edita el admin en UI.
-- El escaneo de capturas actualiza precios/cantidades, no esas 2 columnas.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.plan_pro_invest_holdings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  symbol            text NOT NULL,
  asset_name        text,
  asset_type        text,
  quantity          double precision,
  price             double precision,
  price_change      double precision,
  price_change_pct  double precision,
  market_value      double precision,
  day_change        double precision,
  day_change_pct    double precision,
  cost_basis        double precision,
  gain_loss         double precision,
  gain_loss_pct     double precision,
  as_of_date        text,
  target_shares     text NOT NULL DEFAULT '',
  comments          text NOT NULL DEFAULT '',
  sort_order        integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plan_pro_invest_holdings_symbol_nonempty CHECK (length(trim(symbol)) > 0),
  CONSTRAINT plan_pro_invest_holdings_user_symbol_uq UNIQUE (user_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_plan_pro_invest_holdings_user
  ON public.plan_pro_invest_holdings (user_id, sort_order ASC, market_value DESC NULLS LAST);

COMMENT ON TABLE public.plan_pro_invest_holdings IS
  'Plan PRO Invest: posiciones de portafolio (Schwab vía capturas). target_shares/comments solo manual.';

ALTER TABLE public.plan_pro_invest_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_pro_invest_holdings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_pro_invest_holdings_select_own"
  ON public.plan_pro_invest_holdings;
DROP POLICY IF EXISTS "plan_pro_invest_holdings_insert_own"
  ON public.plan_pro_invest_holdings;
DROP POLICY IF EXISTS "plan_pro_invest_holdings_update_own"
  ON public.plan_pro_invest_holdings;
DROP POLICY IF EXISTS "plan_pro_invest_holdings_delete_own"
  ON public.plan_pro_invest_holdings;

CREATE POLICY "plan_pro_invest_holdings_select_own"
  ON public.plan_pro_invest_holdings FOR SELECT
  USING (public.is_admin_user() AND user_id = auth.uid());

CREATE POLICY "plan_pro_invest_holdings_insert_own"
  ON public.plan_pro_invest_holdings FOR INSERT
  WITH CHECK (public.is_admin_user() AND user_id = auth.uid());

CREATE POLICY "plan_pro_invest_holdings_update_own"
  ON public.plan_pro_invest_holdings FOR UPDATE
  USING (public.is_admin_user() AND user_id = auth.uid())
  WITH CHECK (public.is_admin_user() AND user_id = auth.uid());

CREATE POLICY "plan_pro_invest_holdings_delete_own"
  ON public.plan_pro_invest_holdings FOR DELETE
  USING (public.is_admin_user() AND user_id = auth.uid());
