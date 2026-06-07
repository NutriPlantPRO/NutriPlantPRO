-- =============================================================================
-- Plan PRO — Uso de almacenamiento (Storage) para el indicador en la app
-- =============================================================================
-- Ejecutar en Supabase → SQL Editor (una vez por proyecto).
-- Suma todos los archivos en buckets (imágenes, futuro archivo documental, etc.).
-- Solo usuarios admin (is_admin_user) pueden consultar vía RPC.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.plan_pro_storage_usage()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  total bigint;
  buckets jsonb;
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT COALESCE(SUM((metadata->>'size')::bigint), 0)::bigint
  INTO total
  FROM storage.objects;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'bucket_id', bucket_id,
        'bytes', bucket_bytes
      )
      ORDER BY bucket_bytes DESC
    ),
    '[]'::jsonb
  )
  INTO buckets
  FROM (
    SELECT
      bucket_id,
      SUM((metadata->>'size')::bigint)::bigint AS bucket_bytes
    FROM storage.objects
    GROUP BY bucket_id
  ) b;

  RETURN jsonb_build_object(
    'total_bytes', total,
    'quota_gb', 100,
    'buckets', buckets
  );
END;
$$;

REVOKE ALL ON FUNCTION public.plan_pro_storage_usage() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.plan_pro_storage_usage() TO authenticated;

COMMENT ON FUNCTION public.plan_pro_storage_usage() IS
  'Plan PRO: bytes totales en Storage + desglose por bucket. Solo admin.';
