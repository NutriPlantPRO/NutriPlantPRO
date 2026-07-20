-- =============================================================================
-- Reportes compartidos (vista por link) — Storage
-- =============================================================================
-- El HTML del PDF compartido (Radar con imágenes base64) suele superar el límite
-- de respuesta de Netlify (~6 MB). Se guarda aquí y /api/report-view sirve una
-- página liviana + URL firmada.
--
-- Ejecutar en Supabase → SQL Editor si el bucket aún no existe.
-- Ruta: {auth.uid()}/{report_id}.html
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'report-shares',
  'report-shares',
  false,
  52428800,
  ARRAY['text/html', 'text/plain', 'application/octet-stream']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = GREATEST(
    COALESCE(storage.buckets.file_size_limit, 0),
    COALESCE(EXCLUDED.file_size_limit, 0)
  ),
  allowed_mime_types = COALESCE(EXCLUDED.allowed_mime_types, storage.buckets.allowed_mime_types);

DROP POLICY IF EXISTS "report_shares_select_own" ON storage.objects;
CREATE POLICY "report_shares_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'report-shares'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "report_shares_insert_own" ON storage.objects;
CREATE POLICY "report_shares_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'report-shares'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "report_shares_update_own" ON storage.objects;
CREATE POLICY "report_shares_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'report-shares'
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'report-shares'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "report_shares_delete_own" ON storage.objects;
CREATE POLICY "report_shares_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'report-shares'
    AND split_part(name, '/', 1) = auth.uid()::text
  );
