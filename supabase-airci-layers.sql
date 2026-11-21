-- =============================================================================
-- AirCI — Capas nombradas (cobertura / crowns / etc.) sin pisar canopy_results
-- =============================================================================
-- Ejecutar en Supabase SQL Editor (después de supabase-airci.sql).
-- =============================================================================

-- Contorno del predio en nube (además del nombre texto en airci_sites.predio)
ALTER TABLE public.airci_sites
  ADD COLUMN IF NOT EXISTS predio_geojson jsonb;

COMMENT ON COLUMN public.airci_sites.predio_geojson IS
  'GeoJSON Polygon/Feature del contorno del predio (WGS84).';

CREATE TABLE IF NOT EXISTS public.airci_layers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.airci_sites (id) ON DELETE CASCADE,
  flight_id uuid REFERENCES public.airci_flights (id) ON DELETE SET NULL,
  owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'coverage',
  -- coverage | crowns | other
  source text NOT NULL DEFAULT 'chatgpt',
  -- chatgpt | cursor | browser | import
  coords_space text NOT NULL DEFAULT 'wgs84',
  -- wgs84 | image (si ChatGPT trabaja sobre captura)
  cover_pct double precision,
  stats_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  geometry_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- FeatureCollection o Polygon
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS airci_layers_site_idx
  ON public.airci_layers (site_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS airci_layers_owner_idx
  ON public.airci_layers (owner_id, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS airci_layers_site_name_unique
  ON public.airci_layers (site_id, lower(name));

ALTER TABLE public.airci_layers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "airci_layers_admin_all" ON public.airci_layers;
CREATE POLICY "airci_layers_admin_all"
  ON public.airci_layers FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());
