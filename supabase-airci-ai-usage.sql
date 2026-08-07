-- =============================================================================
-- AirCI — uso / costo estimado de calibración IA (Luna · Terra · Sol)
-- =============================================================================
-- Ejecutar en Supabase → SQL Editor (después de supabase-airci.sql).
-- Una fila resumen (id = 'default') + log de cada consulta.
-- Escritura: Netlify service_role. Lectura: admin autenticado.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.airci_ai_usage (
  id text PRIMARY KEY DEFAULT 'default',
  total_requests bigint NOT NULL DEFAULT 0,
  total_usd_est numeric NOT NULL DEFAULT 0,
  month_key text,
  month_requests bigint NOT NULL DEFAULT 0,
  month_usd_est numeric NOT NULL DEFAULT 0,
  -- { "gpt-5.6-luna": { "requests": N, "usd": X }, ... }
  by_model_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  month_by_model_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.airci_ai_usage (
  id, total_requests, total_usd_est, month_key, month_requests, month_usd_est
)
VALUES ('default', 0, 0, NULL, 0, 0)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.airci_ai_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  model text NOT NULL DEFAULT '',
  usd_est numeric NOT NULL DEFAULT 0,
  site_id uuid,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS airci_ai_usage_events_created_idx
  ON public.airci_ai_usage_events (created_at DESC);

CREATE INDEX IF NOT EXISTS airci_ai_usage_events_model_idx
  ON public.airci_ai_usage_events (model, created_at DESC);

ALTER TABLE public.airci_ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airci_ai_usage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "airci_ai_usage_select_admin" ON public.airci_ai_usage;
CREATE POLICY "airci_ai_usage_select_admin"
  ON public.airci_ai_usage FOR SELECT
  TO authenticated
  USING (public.is_admin_user());

DROP POLICY IF EXISTS "airci_ai_usage_events_select_admin" ON public.airci_ai_usage_events;
CREATE POLICY "airci_ai_usage_events_select_admin"
  ON public.airci_ai_usage_events FOR SELECT
  TO authenticated
  USING (public.is_admin_user());

COMMENT ON TABLE public.airci_ai_usage IS
  'AirCI: resumen de consultas IA de calibración (Luna/Terra/Sol) y USD estimado.';
COMMENT ON TABLE public.airci_ai_usage_events IS
  'AirCI: log por consulta IA (modelo, costo est., tokens).';

-- Costos estimados por consulta (2 fotos de calibración) — referencia en código Netlify:
--   gpt-5.6-luna  ≈ $0.006
--   gpt-5.6-terra ≈ $0.012
--   gpt-5.6-sol   ≈ $0.022
--   gpt-4o-mini   ≈ $0.008
