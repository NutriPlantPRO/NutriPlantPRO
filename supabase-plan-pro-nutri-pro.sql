-- =============================================================================
-- Plan PRO — Nutri PRO (carpetas + metadatos de archivos técnicos)
-- =============================================================================
-- Ejecutar en Supabase → SQL Editor (después de is_admin_user y plan_pro tables).
-- Los binarios viven en Storage (supabase-plan-pro-nutri-pro-storage.sql).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.plan_pro_nutri_folders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  parent_id       uuid REFERENCES public.plan_pro_nutri_folders (id) ON DELETE CASCADE,
  title           text NOT NULL,
  color_hex       text,
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_pro_nutri_folders_owner
  ON public.plan_pro_nutri_folders (owner_id);
CREATE INDEX IF NOT EXISTS idx_plan_pro_nutri_folders_parent
  ON public.plan_pro_nutri_folders (parent_id);

DROP TRIGGER IF EXISTS tr_plan_pro_nutri_folders_updated ON public.plan_pro_nutri_folders;
CREATE TRIGGER tr_plan_pro_nutri_folders_updated
  BEFORE UPDATE ON public.plan_pro_nutri_folders
  FOR EACH ROW EXECUTE PROCEDURE public.plan_pro_set_updated_at();

CREATE TABLE IF NOT EXISTS public.plan_pro_nutri_files (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  folder_id       uuid REFERENCES public.plan_pro_nutri_folders (id) ON DELETE SET NULL,
  title           text NOT NULL,
  original_name   text NOT NULL,
  storage_path    text NOT NULL,
  mime_type       text,
  size_bytes      bigint NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_pro_nutri_files_owner
  ON public.plan_pro_nutri_files (owner_id);
CREATE INDEX IF NOT EXISTS idx_plan_pro_nutri_files_folder
  ON public.plan_pro_nutri_files (folder_id);

DROP TRIGGER IF EXISTS tr_plan_pro_nutri_files_updated ON public.plan_pro_nutri_files;
CREATE TRIGGER tr_plan_pro_nutri_files_updated
  BEFORE UPDATE ON public.plan_pro_nutri_files
  FOR EACH ROW EXECUTE PROCEDURE public.plan_pro_set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS: solo admin (misma regla que Plan PRO)
-- -----------------------------------------------------------------------------
ALTER TABLE public.plan_pro_nutri_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_pro_nutri_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_pro_nutri_folders FORCE ROW LEVEL SECURITY;
ALTER TABLE public.plan_pro_nutri_files FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_pro_nutri_folders_select_admin" ON public.plan_pro_nutri_folders;
DROP POLICY IF EXISTS "plan_pro_nutri_folders_insert_admin" ON public.plan_pro_nutri_folders;
DROP POLICY IF EXISTS "plan_pro_nutri_folders_update_admin" ON public.plan_pro_nutri_folders;
DROP POLICY IF EXISTS "plan_pro_nutri_folders_delete_admin" ON public.plan_pro_nutri_folders;

CREATE POLICY "plan_pro_nutri_folders_select_admin"
  ON public.plan_pro_nutri_folders FOR SELECT USING (public.is_admin_user());
CREATE POLICY "plan_pro_nutri_folders_insert_admin"
  ON public.plan_pro_nutri_folders FOR INSERT WITH CHECK (public.is_admin_user());
CREATE POLICY "plan_pro_nutri_folders_update_admin"
  ON public.plan_pro_nutri_folders FOR UPDATE
  USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY "plan_pro_nutri_folders_delete_admin"
  ON public.plan_pro_nutri_folders FOR DELETE USING (public.is_admin_user());

DROP POLICY IF EXISTS "plan_pro_nutri_files_select_admin" ON public.plan_pro_nutri_files;
DROP POLICY IF EXISTS "plan_pro_nutri_files_insert_admin" ON public.plan_pro_nutri_files;
DROP POLICY IF EXISTS "plan_pro_nutri_files_update_admin" ON public.plan_pro_nutri_files;
DROP POLICY IF EXISTS "plan_pro_nutri_files_delete_admin" ON public.plan_pro_nutri_files;

CREATE POLICY "plan_pro_nutri_files_select_admin"
  ON public.plan_pro_nutri_files FOR SELECT USING (public.is_admin_user());
CREATE POLICY "plan_pro_nutri_files_insert_admin"
  ON public.plan_pro_nutri_files FOR INSERT WITH CHECK (public.is_admin_user());
CREATE POLICY "plan_pro_nutri_files_update_admin"
  ON public.plan_pro_nutri_files FOR UPDATE
  USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY "plan_pro_nutri_files_delete_admin"
  ON public.plan_pro_nutri_files FOR DELETE USING (public.is_admin_user());

COMMENT ON TABLE public.plan_pro_nutri_folders IS 'Nutri PRO: carpetas de conocimiento técnico (Plan PRO admin).';
COMMENT ON TABLE public.plan_pro_nutri_files IS 'Nutri PRO: metadatos de archivos; binario en bucket plan-pro-nutri-pro.';
