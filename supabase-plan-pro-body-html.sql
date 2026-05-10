-- Plan PRO: columna para nota enriquecida (HTML sanitizado en el cliente).
-- Ejecutar en Supabase SQL Editor si ya creaste plan_pro_items antes de body_html.

ALTER TABLE public.plan_pro_items
  ADD COLUMN IF NOT EXISTS body_html text;

COMMENT ON COLUMN public.plan_pro_items.body_html IS 'Nota con formato (HTML); body_plain sigue siendo texto plano para vistas cortas.';
