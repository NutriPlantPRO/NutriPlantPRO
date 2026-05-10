-- =============================================================================
-- Plan PRO: categorías anidadas (subcategorías ilimitadas)
-- Ejecutar en Supabase SQL Editor si ya aplicaste supabase-plan-pro-tables.sql
-- Idempotente.
-- =============================================================================

-- Columna: categoría padre (mismo pilar que el hijo)
ALTER TABLE public.plan_pro_categories
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.plan_pro_categories (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_plan_pro_categories_parent
  ON public.plan_pro_categories (parent_id);

COMMENT ON COLUMN public.plan_pro_categories.parent_id IS 'NULL = raíz del pilar; mismo area_id que el padre (validado por trigger).';

-- Evitar que parent_id apunte a otra área
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
