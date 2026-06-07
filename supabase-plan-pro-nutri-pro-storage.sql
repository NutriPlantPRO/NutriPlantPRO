-- =============================================================================
-- Plan PRO — Nutri PRO Storage (PDF, Office, imágenes PNG/JPG/WebP…, etc.)
-- =============================================================================
-- Bucket PRIVADO: descarga con URL firmada desde la app.
-- Ruta: {auth.uid()}/{folder_id|root}/{file_uuid}/{nombre-original}
-- Sin tope artificial en la app; respeta cuota del plan Supabase (Pro ≈ 100 GB).
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'plan-pro-nutri-pro',
  'plan-pro-nutri-pro',
  false,
  NULL,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = COALESCE(EXCLUDED.file_size_limit, storage.buckets.file_size_limit),
  allowed_mime_types = COALESCE(EXCLUDED.allowed_mime_types, storage.buckets.allowed_mime_types);

-- Solo admin autenticado; primera carpeta del path = auth.uid()
DROP POLICY IF EXISTS "plan_pro_nutri_pro_select_admin" ON storage.objects;
CREATE POLICY "plan_pro_nutri_pro_select_admin"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'plan-pro-nutri-pro'
    AND public.is_admin_user()
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "plan_pro_nutri_pro_insert_admin" ON storage.objects;
CREATE POLICY "plan_pro_nutri_pro_insert_admin"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'plan-pro-nutri-pro'
    AND public.is_admin_user()
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "plan_pro_nutri_pro_update_admin" ON storage.objects;
CREATE POLICY "plan_pro_nutri_pro_update_admin"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'plan-pro-nutri-pro'
    AND public.is_admin_user()
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'plan-pro-nutri-pro'
    AND public.is_admin_user()
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "plan_pro_nutri_pro_delete_admin" ON storage.objects;
CREATE POLICY "plan_pro_nutri_pro_delete_admin"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'plan-pro-nutri-pro'
    AND public.is_admin_user()
    AND split_part(name, '/', 1) = auth.uid()::text
  );
