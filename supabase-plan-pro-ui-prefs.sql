-- =============================================================================
-- Plan PRO — preferencias de UI (árbol de ramas expandido/colapsado, etc.)
-- =============================================================================
-- Ejecutar en Supabase SQL Editor (una vez).
-- Sincroniza entre equipos el estado de las ramas en Notebook PRO.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.plan_pro_ui_prefs (
  owner_id    uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  prefs_json  jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_pro_ui_prefs_updated
  ON public.plan_pro_ui_prefs (updated_at DESC);

DROP TRIGGER IF EXISTS tr_plan_pro_ui_prefs_updated ON public.plan_pro_ui_prefs;
CREATE TRIGGER tr_plan_pro_ui_prefs_updated
  BEFORE UPDATE ON public.plan_pro_ui_prefs
  FOR EACH ROW EXECUTE PROCEDURE public.plan_pro_set_updated_at();

COMMENT ON TABLE public.plan_pro_ui_prefs IS 'Plan PRO: prefs de UI por admin (ej. tree_collapsed en prefs_json).';

ALTER TABLE public.plan_pro_ui_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_pro_ui_prefs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_pro_ui_prefs_select_admin" ON public.plan_pro_ui_prefs;
DROP POLICY IF EXISTS "plan_pro_ui_prefs_insert_admin" ON public.plan_pro_ui_prefs;
DROP POLICY IF EXISTS "plan_pro_ui_prefs_update_admin" ON public.plan_pro_ui_prefs;
DROP POLICY IF EXISTS "plan_pro_ui_prefs_delete_admin" ON public.plan_pro_ui_prefs;

CREATE POLICY "plan_pro_ui_prefs_select_admin"
  ON public.plan_pro_ui_prefs FOR SELECT
  USING (public.is_admin_user());

CREATE POLICY "plan_pro_ui_prefs_insert_admin"
  ON public.plan_pro_ui_prefs FOR INSERT
  WITH CHECK (public.is_admin_user() AND owner_id = auth.uid());

CREATE POLICY "plan_pro_ui_prefs_update_admin"
  ON public.plan_pro_ui_prefs FOR UPDATE
  USING (public.is_admin_user() AND owner_id = auth.uid())
  WITH CHECK (public.is_admin_user() AND owner_id = auth.uid());

CREATE POLICY "plan_pro_ui_prefs_delete_admin"
  ON public.plan_pro_ui_prefs FOR DELETE
  USING (public.is_admin_user() AND owner_id = auth.uid());
