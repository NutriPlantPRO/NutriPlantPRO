-- Preferencias de idioma/unidades para climate_alert_subscribers
-- Idempotente (seguro en re-aplicación).

ALTER TABLE public.climate_alert_subscribers
  ADD COLUMN IF NOT EXISTS language TEXT,
  ADD COLUMN IF NOT EXISTS unit_system TEXT,
  ADD COLUMN IF NOT EXISTS locale TEXT;

UPDATE public.climate_alert_subscribers
SET language = 'es'
WHERE language IS NULL OR language NOT IN ('es', 'en');

UPDATE public.climate_alert_subscribers
SET unit_system = 'metric'
WHERE unit_system IS NULL OR unit_system NOT IN ('metric', 'us_customary');

ALTER TABLE public.climate_alert_subscribers
  ALTER COLUMN language SET DEFAULT 'es',
  ALTER COLUMN language SET NOT NULL,
  ALTER COLUMN unit_system SET DEFAULT 'metric',
  ALTER COLUMN unit_system SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.climate_alert_subscribers'::regclass
      AND conname = 'climate_alert_subscribers_language_check'
  ) THEN
    ALTER TABLE public.climate_alert_subscribers
      ADD CONSTRAINT climate_alert_subscribers_language_check
      CHECK (language IN ('es', 'en'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.climate_alert_subscribers'::regclass
      AND conname = 'climate_alert_subscribers_unit_system_check'
  ) THEN
    ALTER TABLE public.climate_alert_subscribers
      ADD CONSTRAINT climate_alert_subscribers_unit_system_check
      CHECK (unit_system IN ('metric', 'us_customary'));
  END IF;
END
$$;

COMMENT ON COLUMN public.climate_alert_subscribers.language IS
  'Idioma de correos y vista de reporte: es o en.';
COMMENT ON COLUMN public.climate_alert_subscribers.unit_system IS
  'Sistema de unidades para correos/vista: metric o us_customary.';
COMMENT ON COLUMN public.climate_alert_subscribers.locale IS
  'Locale BCP 47 preferido (ej. es-MX, en-US); NULL usa el default del idioma.';
