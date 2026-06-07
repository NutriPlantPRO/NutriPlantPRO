-- =============================================================================
-- Plan PRO — Nutri PRO: enlaces guardados (título, descripción, categoría)
-- =============================================================================
-- Ejecutar después de supabase-plan-pro-nutri-pro.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.plan_pro_nutri_links (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  folder_id       uuid REFERENCES public.plan_pro_nutri_folders (id) ON DELETE SET NULL,
  title           text NOT NULL,
  description     text,
  url             text NOT NULL,
  category        text NOT NULL DEFAULT 'otro',
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_pro_nutri_links_owner
  ON public.plan_pro_nutri_links (owner_id);
CREATE INDEX IF NOT EXISTS idx_plan_pro_nutri_links_folder
  ON public.plan_pro_nutri_links (folder_id);
CREATE INDEX IF NOT EXISTS idx_plan_pro_nutri_links_category
  ON public.plan_pro_nutri_links (category);

DROP TRIGGER IF EXISTS tr_plan_pro_nutri_links_updated ON public.plan_pro_nutri_links;
CREATE TRIGGER tr_plan_pro_nutri_links_updated
  BEFORE UPDATE ON public.plan_pro_nutri_links
  FOR EACH ROW EXECUTE PROCEDURE public.plan_pro_set_updated_at();

ALTER TABLE public.plan_pro_nutri_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_pro_nutri_links FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_pro_nutri_links_select_admin" ON public.plan_pro_nutri_links;
DROP POLICY IF EXISTS "plan_pro_nutri_links_insert_admin" ON public.plan_pro_nutri_links;
DROP POLICY IF EXISTS "plan_pro_nutri_links_update_admin" ON public.plan_pro_nutri_links;
DROP POLICY IF EXISTS "plan_pro_nutri_links_delete_admin" ON public.plan_pro_nutri_links;

CREATE POLICY "plan_pro_nutri_links_select_admin"
  ON public.plan_pro_nutri_links FOR SELECT USING (public.is_admin_user());
CREATE POLICY "plan_pro_nutri_links_insert_admin"
  ON public.plan_pro_nutri_links FOR INSERT WITH CHECK (public.is_admin_user());
CREATE POLICY "plan_pro_nutri_links_update_admin"
  ON public.plan_pro_nutri_links FOR UPDATE
  USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY "plan_pro_nutri_links_delete_admin"
  ON public.plan_pro_nutri_links FOR DELETE USING (public.is_admin_user());

COMMENT ON TABLE public.plan_pro_nutri_links IS
  'Nutri PRO: enlaces con título, descripción y categoría (personal, nutrición vegetal, agronomía…).';
