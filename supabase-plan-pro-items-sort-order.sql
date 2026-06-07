-- =============================================================================
-- Plan PRO — Apuntes: orden manual por rama (arrastrar y soltar)
-- =============================================================================
-- Ejecutar en Supabase → SQL Editor (después de plan_pro_items).
-- =============================================================================

ALTER TABLE public.plan_pro_items
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_plan_pro_items_category_sort
  ON public.plan_pro_items (category_id, sort_order);

COMMENT ON COLUMN public.plan_pro_items.sort_order IS
  'Orden manual dentro de la rama (arrastrar en UI; 0 = sin orden fijo).';
