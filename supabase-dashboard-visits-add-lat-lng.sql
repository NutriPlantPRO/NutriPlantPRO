-- ============================================================
-- Añadir ubicación (lat/lng) a dashboard_visits para mapa de conexiones
-- Ejecuta en Supabase → SQL Editor (la tabla ya existe).
-- ============================================================

ALTER TABLE public.dashboard_visits
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

COMMENT ON COLUMN public.dashboard_visits.lat IS 'Latitud aproximada desde IP al conectar';
COMMENT ON COLUMN public.dashboard_visits.lng IS 'Longitud aproximada desde IP al conectar';
