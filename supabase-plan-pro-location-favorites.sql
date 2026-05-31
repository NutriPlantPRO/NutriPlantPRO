-- =============================================================================
-- PLAN PRO — favoritos de ubicación para el selector de mapa
-- =============================================================================
-- Dónde: Supabase → SQL Editor → New query → Run.
-- Requisito: public.is_admin_user() debe existir.
-- Idempotente: se puede ejecutar más de una vez.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.plan_pro_location_favorites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title       text NOT NULL,
  lat         double precision NOT NULL,
  lng         double precision NOT NULL,
  maps_url    text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_pro_location_favorites_owner
  ON public.plan_pro_location_favorites (owner_id, updated_at DESC);

DROP TRIGGER IF EXISTS tr_plan_pro_location_favorites_updated
  ON public.plan_pro_location_favorites;

CREATE TRIGGER tr_plan_pro_location_favorites_updated
  BEFORE UPDATE ON public.plan_pro_location_favorites
  FOR EACH ROW EXECUTE PROCEDURE public.plan_pro_set_updated_at();

ALTER TABLE public.plan_pro_location_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_pro_location_favorites FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_pro_location_favorites_select_admin"
  ON public.plan_pro_location_favorites;
DROP POLICY IF EXISTS "plan_pro_location_favorites_insert_admin"
  ON public.plan_pro_location_favorites;
DROP POLICY IF EXISTS "plan_pro_location_favorites_update_admin"
  ON public.plan_pro_location_favorites;
DROP POLICY IF EXISTS "plan_pro_location_favorites_delete_admin"
  ON public.plan_pro_location_favorites;

CREATE POLICY "plan_pro_location_favorites_select_admin"
  ON public.plan_pro_location_favorites FOR SELECT
  USING (public.is_admin_user() AND owner_id = auth.uid());

CREATE POLICY "plan_pro_location_favorites_insert_admin"
  ON public.plan_pro_location_favorites FOR INSERT
  WITH CHECK (public.is_admin_user() AND owner_id = auth.uid());

CREATE POLICY "plan_pro_location_favorites_update_admin"
  ON public.plan_pro_location_favorites FOR UPDATE
  USING (public.is_admin_user() AND owner_id = auth.uid())
  WITH CHECK (public.is_admin_user() AND owner_id = auth.uid());

CREATE POLICY "plan_pro_location_favorites_delete_admin"
  ON public.plan_pro_location_favorites FOR DELETE
  USING (public.is_admin_user() AND owner_id = auth.uid());
