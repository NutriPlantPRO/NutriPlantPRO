-- =============================================================================
-- Plan PRO — Storage para imágenes en notas (body_html)
-- =============================================================================
-- Ejecutar en Supabase → SQL Editor (una vez por proyecto).
-- Crea bucket público de lectura; solo usuarios autenticados suben/borran en su carpeta:
--   {auth.uid()}/draft/...     (nuevo apunte aún sin id)
--   {auth.uid()}/{item_uuid}/... (detalle de apunte abierto)
-- La app comprime a JPEG antes de subir; políticas permiten image/* comunes.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'plan-pro-note-images',
  'plan-pro-note-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = COALESCE(EXCLUDED.file_size_limit, storage.buckets.file_size_limit),
  allowed_mime_types = COALESCE(EXCLUDED.allowed_mime_types, storage.buckets.allowed_mime_types);

-- Lectura pública (URL conocida = semi-privada por UUID en la ruta)
DROP POLICY IF EXISTS "plan_pro_note_images_select_public" ON storage.objects;
CREATE POLICY "plan_pro_note_images_select_public"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'plan-pro-note-images');

-- Solo autenticados; primera carpeta del path = auth.uid()
DROP POLICY IF EXISTS "plan_pro_note_images_insert_own" ON storage.objects;
CREATE POLICY "plan_pro_note_images_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'plan-pro-note-images'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "plan_pro_note_images_update_own" ON storage.objects;
CREATE POLICY "plan_pro_note_images_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'plan-pro-note-images'
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'plan-pro-note-images'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "plan_pro_note_images_delete_own" ON storage.objects;
CREATE POLICY "plan_pro_note_images_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'plan-pro-note-images'
    AND split_part(name, '/', 1) = auth.uid()::text
  );
