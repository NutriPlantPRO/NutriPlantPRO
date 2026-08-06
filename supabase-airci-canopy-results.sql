-- =============================================================================
-- AirCI — guardar resultados de copas / semáforo
-- =============================================================================
-- Ejecutar en Supabase SQL Editor (después de supabase-airci.sql).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.airci_canopy_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.airci_sites (id) ON DELETE CASCADE,
  flight_id uuid REFERENCES public.airci_flights (id) ON DELETE SET NULL,
  owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  tree_count integer NOT NULL DEFAULT 0,
  cover_pct double precision,
  mean_area_px double precision,
  std_area_px double precision,
  threshold integer,
  stats_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  trees_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS airci_canopy_results_site_idx
  ON public.airci_canopy_results (site_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS airci_canopy_results_flight_idx
  ON public.airci_canopy_results (flight_id);

ALTER TABLE public.airci_canopy_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "airci_canopy_results_admin_all" ON public.airci_canopy_results;
CREATE POLICY "airci_canopy_results_admin_all"
  ON public.airci_canopy_results FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- Un resultado “vigente” por site: upsert por site_id (índice único)
CREATE UNIQUE INDEX IF NOT EXISTS airci_canopy_results_site_unique
  ON public.airci_canopy_results (site_id);
