-- =============================================================================
-- PLAN PRO — Invest PRO: listas personalizadas (+ migración desde watchlist)
-- =============================================================================
-- Ejecutar en Supabase SQL Editor DESPUÉS de supabase-plan-pro-invest-watchlist.sql
-- Idempotente.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Listas (Mi portafolio + las que cree el admin)
CREATE TABLE IF NOT EXISTS public.plan_pro_invest_lists (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name        text NOT NULL,
  is_default  boolean NOT NULL DEFAULT false,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plan_pro_invest_lists_name_nonempty CHECK (length(trim(name)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS plan_pro_invest_lists_user_name_uq
  ON public.plan_pro_invest_lists (user_id, lower(trim(name)));

CREATE INDEX IF NOT EXISTS idx_plan_pro_invest_lists_user
  ON public.plan_pro_invest_lists (user_id, sort_order ASC, created_at ASC);

COMMENT ON TABLE public.plan_pro_invest_lists IS
  'Plan PRO Invest: listas de interés (Mi portafolio + listas custom).';

ALTER TABLE public.plan_pro_invest_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_pro_invest_lists FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_pro_invest_lists_select_own" ON public.plan_pro_invest_lists;
DROP POLICY IF EXISTS "plan_pro_invest_lists_insert_own" ON public.plan_pro_invest_lists;
DROP POLICY IF EXISTS "plan_pro_invest_lists_update_own" ON public.plan_pro_invest_lists;
DROP POLICY IF EXISTS "plan_pro_invest_lists_delete_own" ON public.plan_pro_invest_lists;

CREATE POLICY "plan_pro_invest_lists_select_own"
  ON public.plan_pro_invest_lists FOR SELECT
  USING (public.is_admin_user() AND user_id = auth.uid());

CREATE POLICY "plan_pro_invest_lists_insert_own"
  ON public.plan_pro_invest_lists FOR INSERT
  WITH CHECK (public.is_admin_user() AND user_id = auth.uid());

CREATE POLICY "plan_pro_invest_lists_update_own"
  ON public.plan_pro_invest_lists FOR UPDATE
  USING (public.is_admin_user() AND user_id = auth.uid())
  WITH CHECK (public.is_admin_user() AND user_id = auth.uid());

CREATE POLICY "plan_pro_invest_lists_delete_own"
  ON public.plan_pro_invest_lists FOR DELETE
  USING (public.is_admin_user() AND user_id = auth.uid());

-- Items: agregar list_id (nullable primero para migrar)
ALTER TABLE public.plan_pro_invest_watchlist
  ADD COLUMN IF NOT EXISTS list_id uuid REFERENCES public.plan_pro_invest_lists (id) ON DELETE CASCADE;

-- Crear "Mi portafolio" por cada user que ya tenga items sin lista
INSERT INTO public.plan_pro_invest_lists (user_id, name, is_default, sort_order)
SELECT DISTINCT w.user_id, 'Mi portafolio', true, 0
FROM public.plan_pro_invest_watchlist w
WHERE NOT EXISTS (
  SELECT 1 FROM public.plan_pro_invest_lists l
  WHERE l.user_id = w.user_id AND l.is_default = true
);

-- Asignar items huérfanos a la lista default del usuario
UPDATE public.plan_pro_invest_watchlist w
SET list_id = l.id
FROM public.plan_pro_invest_lists l
WHERE w.list_id IS NULL
  AND l.user_id = w.user_id
  AND l.is_default = true;

-- Usuarios admin sin items: asegurar lista default al usarla desde la app;
-- opcional seed vacío no requerido aquí.

-- Cambiar unicidad: un símbolo puede estar en varias listas
ALTER TABLE public.plan_pro_invest_watchlist
  DROP CONSTRAINT IF EXISTS plan_pro_invest_watchlist_user_symbol_uq;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'plan_pro_invest_watchlist_list_symbol_uq'
  ) THEN
    ALTER TABLE public.plan_pro_invest_watchlist
      ADD CONSTRAINT plan_pro_invest_watchlist_list_symbol_uq UNIQUE (list_id, symbol);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_plan_pro_invest_watchlist_list
  ON public.plan_pro_invest_watchlist (list_id, sort_order ASC, created_at DESC);

COMMENT ON TABLE public.plan_pro_invest_watchlist IS
  'Plan PRO Invest: ítems por lista (list_id). Un símbolo puede repetirse en distintas listas.';
