-- Radar del cultivo (NDVI): uso por usuario/mes y snapshots por proyecto.
-- Ejecutar en Supabase → SQL Editor (o aplicar como migración).

-- Registro de cada consulta Radar (auditoría + límites por consulta SQL)
CREATE TABLE IF NOT EXISTS radar_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  project_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  month_key text NOT NULL, -- 'YYYY-MM'
  -- Ruta en Storage (bucket radar-ndvi), opcional si solo regeneras sin guardar archivo
  image_storage_path text,
  -- Fechas fuente Sentinel-2, nubes, etc.
  meta jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS radar_requests_user_month ON radar_requests (user_id, month_key);
CREATE INDEX IF NOT EXISTS radar_requests_project_month ON radar_requests (project_id, month_key);

ALTER TABLE radar_requests ENABLE ROW LEVEL SECURITY;

-- El usuario solo ve sus propias filas
CREATE POLICY "radar_requests_select_own"
  ON radar_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Insert/update solo desde backend con service_role (Edge Function / Netlify).
-- El cliente anon no inserta directo; si más adelante insertas desde el front con usuario logueado, añade política INSERT con WITH CHECK (user_id = auth.uid()).

COMMENT ON TABLE radar_requests IS 'Consultas Radar NDVI: límites contando filas por user_id+month_key y project_id+month_key.';
