-- ============================================================
-- Preferencias internacionales de interfaz para profiles
-- ============================================================
-- Ejecuta en Supabase -> SQL Editor. Es seguro repetirlo.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS language TEXT,
  ADD COLUMN IF NOT EXISTS unit_system TEXT,
  ADD COLUMN IF NOT EXISTS locale TEXT;

UPDATE public.profiles
SET language = 'es'
WHERE language IS NULL OR language NOT IN ('es', 'en');

UPDATE public.profiles
SET unit_system = 'metric'
WHERE unit_system IS NULL OR unit_system NOT IN ('metric', 'us_customary');

ALTER TABLE public.profiles
  ALTER COLUMN language SET DEFAULT 'es',
  ALTER COLUMN language SET NOT NULL,
  ALTER COLUMN unit_system SET DEFAULT 'metric',
  ALTER COLUMN unit_system SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_language_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_language_check
      CHECK (language IN ('es', 'en'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_unit_system_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_unit_system_check
      CHECK (unit_system IN ('metric', 'us_customary'));
  END IF;
END
$$;

COMMENT ON COLUMN public.profiles.language IS 'Idioma de interfaz: es o en.';
COMMENT ON COLUMN public.profiles.unit_system IS 'Sistema de unidades: metric o us_customary.';
COMMENT ON COLUMN public.profiles.locale IS 'Locale BCP 47 preferido; NULL usa el locale del navegador.';

-- Conservar la selección hecha antes del registro incluso cuando Supabase
-- exige confirmar el correo y todavía no existe una sesión con permisos RLS.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, language, unit_system, locale)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    CASE
      WHEN NEW.raw_user_meta_data->>'language' IN ('es', 'en')
        THEN NEW.raw_user_meta_data->>'language'
      ELSE 'es'
    END,
    CASE
      WHEN NEW.raw_user_meta_data->>'unit_system' IN ('metric', 'us_customary')
        THEN NEW.raw_user_meta_data->>'unit_system'
      ELSE 'metric'
    END,
    NULLIF(NEW.raw_user_meta_data->>'locale', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
