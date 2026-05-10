-- =============================================================================
-- PLAN PRO — semilla en UN SOLO RUN (pilar + categoría de ejemplo)
-- =============================================================================
-- Ejecutar después de supabase-plan-pro-tables.sql
-- Toma automáticamente el primer usuario con profiles.is_admin = true como owner.
-- Idempotente: puede ejecutarse varias veces (no duplica pilar ni categoría).
-- =============================================================================

WITH admin_user AS (
  SELECT id AS owner_id
  FROM public.profiles
  WHERE is_admin IS TRUE
  ORDER BY created_at NULLS LAST
  LIMIT 1
),
ins_area AS (
  INSERT INTO public.plan_pro_areas (owner_id, sort_order, title, slug)
  SELECT au.owner_id, 0, 'NutriPlant PRO', 'nutriplant-pro'
  FROM admin_user au
  ON CONFLICT (owner_id, slug) DO NOTHING
  RETURNING id
),
area_row AS (
  SELECT COALESCE(
    (SELECT id FROM ins_area LIMIT 1),
    (SELECT pa.id FROM public.plan_pro_areas pa
     INNER JOIN admin_user au ON pa.owner_id = au.owner_id
     WHERE pa.slug = 'nutriplant-pro'
     LIMIT 1)
  ) AS id
)
INSERT INTO public.plan_pro_categories (area_id, sort_order, title)
SELECT ar.id, 0, 'Ideas de desarrollo'
FROM area_row ar
WHERE ar.id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.plan_pro_categories c
    WHERE c.area_id = ar.id AND c.title = 'Ideas de desarrollo'
  );

-- Verificación rápida (opcional: comenta si no quieres ver filas)
SELECT 'plan_pro_areas' AS tabla, count(*) AS filas FROM public.plan_pro_areas
UNION ALL
SELECT 'plan_pro_categories', count(*) FROM public.plan_pro_categories;
