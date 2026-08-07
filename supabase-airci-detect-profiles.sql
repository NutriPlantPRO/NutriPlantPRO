-- =============================================================================
-- AirCI — Criterios de análisis (perfiles por cultivo + por predio)
-- =============================================================================
-- Ejecutar en Supabase → SQL Editor (después de supabase-airci.sql).
--
-- Jerarquía:
--   1) airci_crop_profiles     → memoria por cultivo (cítrico, aguacate, …)
--   2) airci_site_detect_profiles → criterio afinado de ESA huerta (manda)
--
-- Al Analizar: AirCI carga site → si no hay, cultivo → si no, defaults ExG.
-- Cada Analizar bueno enriquece (upsert) el perfil del predio y del cultivo.
-- =============================================================================

-- ——— Catálogo por cultivo (enriquecible con el tiempo) ———
CREATE TABLE IF NOT EXISTS public.airci_crop_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  -- clave normalizada: 'citrico', 'aguacate', 'mango', 'generico'
  crop_key text NOT NULL,
  crop_label text NOT NULL DEFAULT '',
  -- Criterio humano / agronómico (qué es copa, qué no, tamaños, color…)
  criteria_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Parámetros del detector ExG / blur / fusión (lo que usa analyzeCanopies)
  detect_params_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text NOT NULL DEFAULT '',
  times_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT airci_crop_profiles_key_chk CHECK (char_length(trim(crop_key)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS airci_crop_profiles_owner_key_uidx
  ON public.airci_crop_profiles (owner_id, crop_key);

CREATE INDEX IF NOT EXISTS airci_crop_profiles_owner_idx
  ON public.airci_crop_profiles (owner_id);

COMMENT ON TABLE public.airci_crop_profiles IS
  'AirCI: perfil/criterio de detección por cultivo (memoria enriquecible).';
COMMENT ON COLUMN public.airci_crop_profiles.criteria_json IS
  'Forma, color, diam_m, excluir (pasto/sombra/objetos), notas agronómicas.';
COMMENT ON COLUMN public.airci_crop_profiles.detect_params_json IS
  'Params ExG/calib: g_margin, blur_m, min_area_px, close_passes, etc.';

-- ——— Criterio del predio (override; es donde vive el ajuste fino) ———
CREATE TABLE IF NOT EXISTS public.airci_site_detect_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.airci_sites (id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  crop_profile_id uuid REFERENCES public.airci_crop_profiles (id) ON DELETE SET NULL,
  -- Último criterio bueno usado en este predio
  detect_params_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  criteria_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- 'ai_calib' | 'manual' | 'crop_default' | 'exg'
  source text NOT NULL DEFAULT 'ai_calib',
  last_flight_id uuid REFERENCES public.airci_flights (id) ON DELETE SET NULL,
  crop_hint text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS airci_site_detect_profiles_site_uidx
  ON public.airci_site_detect_profiles (site_id);

CREATE INDEX IF NOT EXISTS airci_site_detect_profiles_owner_idx
  ON public.airci_site_detect_profiles (owner_id);

COMMENT ON TABLE public.airci_site_detect_profiles IS
  'AirCI: criterio de análisis afinado por predio (manda sobre el cultivo).';

ALTER TABLE public.airci_crop_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airci_site_detect_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "airci_crop_profiles_admin_all" ON public.airci_crop_profiles;
CREATE POLICY "airci_crop_profiles_admin_all"
  ON public.airci_crop_profiles FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "airci_site_detect_profiles_admin_all" ON public.airci_site_detect_profiles;
CREATE POLICY "airci_site_detect_profiles_admin_all"
  ON public.airci_site_detect_profiles FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- Semilla de estructura (el owner se asigna en la 1ª escritura desde la API).
-- Aquí solo documentamos el shape esperado de criteria_json / detect_params_json.
--
-- criteria_json ejemplo:
-- {
--   "shape": "redonda_compacta",
--   "diam_m_min": 2.0,
--   "diam_m_typical": 5.0,
--   "color": "verde_oscuro",
--   "exclude": ["pasto", "sombra", "gente", "cajas", "vehiculo"],
--   "notes": "Copa densa; sombra alargada no cuenta"
-- }
--
-- detect_params_json ejemplo (compatible con airci-canopy-ai / resolveExgParams):
-- {
--   "crop_hint": "citrico amarillo-verdoso",
--   "allow_yellow_green": true,
--   "g_margin": 0.03,
--   "b_margin": 0.025,
--   "g_abs": 3,
--   "b_abs": 2,
--   "dark_sum": 42,
--   "min_g": 22,
--   "exg_percentile": 52,
--   "thr_min": 48,
--   "thr_max": 150,
--   "erosion_passes": 1,
--   "close_passes": 3,
--   "blur_m": 0.9,
--   "min_area_px": 260,
--   "min_confidence": 40,
--   "yellow_boost": true
-- }
