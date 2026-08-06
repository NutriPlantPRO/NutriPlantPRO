-- =============================================================================
-- AirCI — Crop Intelligence (predios, vuelos, Storage ortomosaicos)
-- =============================================================================
-- Ejecutar en Supabase → SQL Editor (una vez).
-- Bucket privado: airci-orthos
-- Ruta Storage: {owner_id}/{site_id}/{flight_id}.tif
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.airci_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  agricola text NOT NULL DEFAULT '',
  predio text NOT NULL DEFAULT '',
  cultivo text NOT NULL DEFAULT '',
  variedad text NOT NULL DEFAULT '',
  edad text NOT NULL DEFAULT '',
  nota text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS airci_sites_owner_idx ON public.airci_sites (owner_id);

CREATE TABLE IF NOT EXISTS public.airci_flights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.airci_sites (id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  flight_date date,
  filename text NOT NULL DEFAULT '',
  storage_path text NOT NULL,
  content_type text NOT NULL DEFAULT 'image/tiff',
  byte_size bigint,
  width_px integer,
  height_px integer,
  bands integer,
  crs text,
  bbox_json jsonb,
  gsd_m double precision,
  status text NOT NULL DEFAULT 'ready',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS airci_flights_site_idx ON public.airci_flights (site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS airci_flights_owner_idx ON public.airci_flights (owner_id);

ALTER TABLE public.airci_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airci_flights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "airci_sites_admin_all" ON public.airci_sites;
CREATE POLICY "airci_sites_admin_all"
  ON public.airci_sites FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "airci_flights_admin_all" ON public.airci_flights;
CREATE POLICY "airci_flights_admin_all"
  ON public.airci_flights FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- Storage bucket (hasta ~500 MB por archivo; ajusta si tu plan lo permite)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'airci-orthos',
  'airci-orthos',
  false,
  524288000,
  ARRAY[
    'image/tiff',
    'image/tif',
    'image/geotiff',
    'application/octet-stream'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = GREATEST(
    COALESCE(storage.buckets.file_size_limit, 0),
    COALESCE(EXCLUDED.file_size_limit, 0)
  ),
  allowed_mime_types = COALESCE(EXCLUDED.allowed_mime_types, storage.buckets.allowed_mime_types);

DROP POLICY IF EXISTS "airci_orthos_select_admin" ON storage.objects;
DROP POLICY IF EXISTS "airci_orthos_insert_admin" ON storage.objects;
DROP POLICY IF EXISTS "airci_orthos_update_admin" ON storage.objects;
DROP POLICY IF EXISTS "airci_orthos_delete_admin" ON storage.objects;

CREATE POLICY "airci_orthos_select_admin"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'airci-orthos' AND public.is_admin_user());

CREATE POLICY "airci_orthos_insert_admin"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'airci-orthos' AND public.is_admin_user());

CREATE POLICY "airci_orthos_update_admin"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'airci-orthos' AND public.is_admin_user())
  WITH CHECK (bucket_id = 'airci-orthos' AND public.is_admin_user());

CREATE POLICY "airci_orthos_delete_admin"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'airci-orthos' AND public.is_admin_user());
