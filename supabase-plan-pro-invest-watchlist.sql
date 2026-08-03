-- =============================================================================
-- PLAN PRO — Invest PRO watchlist (favoritos de mercados)
-- =============================================================================
-- Dónde: Supabase → SQL Editor → New query → Run.
-- Requisito: public.is_admin_user() debe existir.
-- Idempotente: se puede ejecutar más de una vez.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.plan_pro_invest_watchlist (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  symbol       text NOT NULL,
  asset_name   text,
  asset_type   text,
  exchange     text,
  currency     text,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plan_pro_invest_watchlist_symbol_nonempty CHECK (length(trim(symbol)) > 0),
  CONSTRAINT plan_pro_invest_watchlist_user_symbol_uq UNIQUE (user_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_plan_pro_invest_watchlist_user
  ON public.plan_pro_invest_watchlist (user_id, sort_order ASC, created_at DESC);

COMMENT ON TABLE public.plan_pro_invest_watchlist IS
  'Plan PRO Invest: watchlist / Mi portafolio por admin autenticado.';

ALTER TABLE public.plan_pro_invest_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_pro_invest_watchlist FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_pro_invest_watchlist_select_own"
  ON public.plan_pro_invest_watchlist;
DROP POLICY IF EXISTS "plan_pro_invest_watchlist_insert_own"
  ON public.plan_pro_invest_watchlist;
DROP POLICY IF EXISTS "plan_pro_invest_watchlist_update_own"
  ON public.plan_pro_invest_watchlist;
DROP POLICY IF EXISTS "plan_pro_invest_watchlist_delete_own"
  ON public.plan_pro_invest_watchlist;

CREATE POLICY "plan_pro_invest_watchlist_select_own"
  ON public.plan_pro_invest_watchlist FOR SELECT
  USING (public.is_admin_user() AND user_id = auth.uid());

CREATE POLICY "plan_pro_invest_watchlist_insert_own"
  ON public.plan_pro_invest_watchlist FOR INSERT
  WITH CHECK (public.is_admin_user() AND user_id = auth.uid());

CREATE POLICY "plan_pro_invest_watchlist_update_own"
  ON public.plan_pro_invest_watchlist FOR UPDATE
  USING (public.is_admin_user() AND user_id = auth.uid())
  WITH CHECK (public.is_admin_user() AND user_id = auth.uid());

CREATE POLICY "plan_pro_invest_watchlist_delete_own"
  ON public.plan_pro_invest_watchlist FOR DELETE
  USING (public.is_admin_user() AND user_id = auth.uid());
