-- =============================================================================
-- PLAN PRO / Cerebro Digital — tablas en Supabase (independiente del negocio NutriPlant)
-- =============================================================================
-- Dónde: Supabase → SQL → New query → Run.
-- Requisito: debe existir public.is_admin_user() (ver supabase-fix-rls-recursion.sql
--            o supabase-EJECUTAR-SQL-EDITOR-UN-SOLO-RUN.sql sección B).
-- Acceso app: misma sesión que admin; UI sugerida en el sitio estático:
--   https://nutriplantpro.com/planpro/   (archivo planpro/index.html o planpro.html + reglas Netlify)
-- Idempotente: se puede ejecutar más de una vez.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensión (por si gen_random_uuid no está)
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- Función: touch updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.plan_pro_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 1) Pilares / áreas (JAM, Work, NutriPlant… — títulos editables en app)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plan_pro_areas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  sort_order      integer NOT NULL DEFAULT 0,
  title           text NOT NULL,
  slug            text NOT NULL,
  color_hex       text,
  archived_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plan_pro_areas_owner_slug UNIQUE (owner_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_plan_pro_areas_owner
  ON public.plan_pro_areas (owner_id) WHERE archived_at IS NULL;

DROP TRIGGER IF EXISTS tr_plan_pro_areas_updated ON public.plan_pro_areas;
CREATE TRIGGER tr_plan_pro_areas_updated
  BEFORE UPDATE ON public.plan_pro_areas
  FOR EACH ROW EXECUTE PROCEDURE public.plan_pro_set_updated_at();

-- -----------------------------------------------------------------------------
-- 2) Categorías por pilar
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plan_pro_categories (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id         uuid NOT NULL REFERENCES public.plan_pro_areas (id) ON DELETE CASCADE,
  parent_id       uuid REFERENCES public.plan_pro_categories (id) ON DELETE CASCADE,
  sort_order      integer NOT NULL DEFAULT 0,
  title           text NOT NULL,
  color_hex       text,
  archived_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_pro_categories_area
  ON public.plan_pro_categories (area_id) WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_plan_pro_categories_parent
  ON public.plan_pro_categories (parent_id);

DROP TRIGGER IF EXISTS tr_plan_pro_categories_updated ON public.plan_pro_categories;
CREATE TRIGGER tr_plan_pro_categories_updated
  BEFORE UPDATE ON public.plan_pro_categories
  FOR EACH ROW EXECUTE PROCEDURE public.plan_pro_set_updated_at();

CREATE OR REPLACE FUNCTION public.plan_pro_categories_same_area_parent()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  p_area uuid;
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT area_id INTO p_area FROM public.plan_pro_categories WHERE id = NEW.parent_id;
  IF p_area IS NULL THEN
    RAISE EXCEPTION 'plan_pro_categories: padre % no existe', NEW.parent_id;
  END IF;
  IF p_area <> NEW.area_id THEN
    RAISE EXCEPTION 'plan_pro_categories: el padre debe ser del mismo pilar (area_id)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_plan_pro_categories_same_area ON public.plan_pro_categories;
CREATE TRIGGER tr_plan_pro_categories_same_area
  BEFORE INSERT OR UPDATE OF parent_id, area_id ON public.plan_pro_categories
  FOR EACH ROW EXECUTE PROCEDURE public.plan_pro_categories_same_area_parent();

-- -----------------------------------------------------------------------------
-- 3) Ítems (capturas: ideas, tareas, notas…)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plan_pro_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  area_id           uuid NOT NULL REFERENCES public.plan_pro_areas (id) ON DELETE RESTRICT,
  category_id       uuid REFERENCES public.plan_pro_categories (id) ON DELETE SET NULL,
  -- Clasificación (valores libres o acordados en app; no ENUM para flexibilidad)
  thought_type      text,
  priority          text,
  status            text,
  captured_at       date,
  due_at            date,
  next_action       text,
  relation_tags     text[],
  title             text,
  body_plain        text,
  body_html         text,
  body_blocks       jsonb NOT NULL DEFAULT '[]'::jsonb,
  attachments       jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  closed_at         timestamptz
);

CREATE INDEX IF NOT EXISTS idx_plan_pro_items_owner ON public.plan_pro_items (owner_id);
CREATE INDEX IF NOT EXISTS idx_plan_pro_items_area ON public.plan_pro_items (area_id);
CREATE INDEX IF NOT EXISTS idx_plan_pro_items_category ON public.plan_pro_items (category_id);
CREATE INDEX IF NOT EXISTS idx_plan_pro_items_status ON public.plan_pro_items (status);
CREATE INDEX IF NOT EXISTS idx_plan_pro_items_captured ON public.plan_pro_items (captured_at);

DROP TRIGGER IF EXISTS tr_plan_pro_items_updated ON public.plan_pro_items;
CREATE TRIGGER tr_plan_pro_items_updated
  BEFORE UPDATE ON public.plan_pro_items
  FOR EACH ROW EXECUTE PROCEDURE public.plan_pro_set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS: solo usuarios con is_admin = true en profiles (misma regla que el panel admin)
-- -----------------------------------------------------------------------------
ALTER TABLE public.plan_pro_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_pro_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_pro_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.plan_pro_areas FORCE ROW LEVEL SECURITY;
ALTER TABLE public.plan_pro_categories FORCE ROW LEVEL SECURITY;
ALTER TABLE public.plan_pro_items FORCE ROW LEVEL SECURITY;

-- Áreas
DROP POLICY IF EXISTS "plan_pro_areas_select_admin" ON public.plan_pro_areas;
DROP POLICY IF EXISTS "plan_pro_areas_insert_admin" ON public.plan_pro_areas;
DROP POLICY IF EXISTS "plan_pro_areas_update_admin" ON public.plan_pro_areas;
DROP POLICY IF EXISTS "plan_pro_areas_delete_admin" ON public.plan_pro_areas;

CREATE POLICY "plan_pro_areas_select_admin"
  ON public.plan_pro_areas FOR SELECT
  USING (public.is_admin_user());

CREATE POLICY "plan_pro_areas_insert_admin"
  ON public.plan_pro_areas FOR INSERT
  WITH CHECK (public.is_admin_user());

CREATE POLICY "plan_pro_areas_update_admin"
  ON public.plan_pro_areas FOR UPDATE
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE POLICY "plan_pro_areas_delete_admin"
  ON public.plan_pro_areas FOR DELETE
  USING (public.is_admin_user());

-- Categorías
DROP POLICY IF EXISTS "plan_pro_categories_select_admin" ON public.plan_pro_categories;
DROP POLICY IF EXISTS "plan_pro_categories_insert_admin" ON public.plan_pro_categories;
DROP POLICY IF EXISTS "plan_pro_categories_update_admin" ON public.plan_pro_categories;
DROP POLICY IF EXISTS "plan_pro_categories_delete_admin" ON public.plan_pro_categories;

CREATE POLICY "plan_pro_categories_select_admin"
  ON public.plan_pro_categories FOR SELECT
  USING (public.is_admin_user());

CREATE POLICY "plan_pro_categories_insert_admin"
  ON public.plan_pro_categories FOR INSERT
  WITH CHECK (public.is_admin_user());

CREATE POLICY "plan_pro_categories_update_admin"
  ON public.plan_pro_categories FOR UPDATE
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE POLICY "plan_pro_categories_delete_admin"
  ON public.plan_pro_categories FOR DELETE
  USING (public.is_admin_user());

-- Ítems
DROP POLICY IF EXISTS "plan_pro_items_select_admin" ON public.plan_pro_items;
DROP POLICY IF EXISTS "plan_pro_items_insert_admin" ON public.plan_pro_items;
DROP POLICY IF EXISTS "plan_pro_items_update_admin" ON public.plan_pro_items;
DROP POLICY IF EXISTS "plan_pro_items_delete_admin" ON public.plan_pro_items;

CREATE POLICY "plan_pro_items_select_admin"
  ON public.plan_pro_items FOR SELECT
  USING (public.is_admin_user());

CREATE POLICY "plan_pro_items_insert_admin"
  ON public.plan_pro_items FOR INSERT
  WITH CHECK (public.is_admin_user());

CREATE POLICY "plan_pro_items_update_admin"
  ON public.plan_pro_items FOR UPDATE
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE POLICY "plan_pro_items_delete_admin"
  ON public.plan_pro_items FOR DELETE
  USING (public.is_admin_user());

-- -----------------------------------------------------------------------------
-- Comentarios (documentación en Supabase)
-- -----------------------------------------------------------------------------
COMMENT ON TABLE public.plan_pro_areas IS 'Plan PRO: pilares editables (Personal/Yara/NutriPlant…)';
COMMENT ON TABLE public.plan_pro_categories IS 'Plan PRO: categorías por pilar';
COMMENT ON TABLE public.plan_pro_items IS 'Plan PRO: capturas; body_blocks JSON para vista tipo Notion (fases posteriores)';
COMMENT ON COLUMN public.plan_pro_items.body_blocks IS 'Array JSON de bloques: texto, listas, mini-tablas, etc.';

-- =============================================================================
-- Fin. Campos personalizados extra (plan_pro_custom_*) → otro script cuando los necesites.
-- =============================================================================
