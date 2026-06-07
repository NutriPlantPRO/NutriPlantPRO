-- =============================================================================
-- Plan PRO — Nutri PRO: texto extraído de archivos (Fase 2 IA)
-- =============================================================================
-- Ejecutar en Supabase → SQL Editor (después de plan_pro_nutri_files).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.plan_pro_nutri_file_extracts (
  file_id         uuid PRIMARY KEY REFERENCES public.plan_pro_nutri_files (id) ON DELETE CASCADE,
  owner_id        uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'pending',
  format_kind     text,
  text_plain      text,
  meta_json       jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message   text,
  extracted_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plan_pro_nutri_file_extracts_status_chk
    CHECK (status IN ('pending', 'processing', 'done', 'skipped', 'error'))
);

CREATE INDEX IF NOT EXISTS idx_plan_pro_nutri_file_extracts_owner
  ON public.plan_pro_nutri_file_extracts (owner_id);
CREATE INDEX IF NOT EXISTS idx_plan_pro_nutri_file_extracts_status
  ON public.plan_pro_nutri_file_extracts (status);

DROP TRIGGER IF EXISTS tr_plan_pro_nutri_file_extracts_updated ON public.plan_pro_nutri_file_extracts;
CREATE TRIGGER tr_plan_pro_nutri_file_extracts_updated
  BEFORE UPDATE ON public.plan_pro_nutri_file_extracts
  FOR EACH ROW EXECUTE PROCEDURE public.plan_pro_set_updated_at();

ALTER TABLE public.plan_pro_nutri_file_extracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_pro_nutri_file_extracts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_pro_nutri_extracts_select_admin" ON public.plan_pro_nutri_file_extracts;
DROP POLICY IF EXISTS "plan_pro_nutri_extracts_insert_admin" ON public.plan_pro_nutri_file_extracts;
DROP POLICY IF EXISTS "plan_pro_nutri_extracts_update_admin" ON public.plan_pro_nutri_file_extracts;
DROP POLICY IF EXISTS "plan_pro_nutri_extracts_delete_admin" ON public.plan_pro_nutri_file_extracts;

CREATE POLICY "plan_pro_nutri_extracts_select_admin"
  ON public.plan_pro_nutri_file_extracts FOR SELECT USING (public.is_admin_user());
CREATE POLICY "plan_pro_nutri_extracts_insert_admin"
  ON public.plan_pro_nutri_file_extracts FOR INSERT WITH CHECK (public.is_admin_user());
CREATE POLICY "plan_pro_nutri_extracts_update_admin"
  ON public.plan_pro_nutri_file_extracts FOR UPDATE
  USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY "plan_pro_nutri_extracts_delete_admin"
  ON public.plan_pro_nutri_file_extracts FOR DELETE USING (public.is_admin_user());

COMMENT ON TABLE public.plan_pro_nutri_file_extracts IS
  'Nutri PRO Fase 2: texto extraído de PDF/Office/texto para búsqueda IA.';
