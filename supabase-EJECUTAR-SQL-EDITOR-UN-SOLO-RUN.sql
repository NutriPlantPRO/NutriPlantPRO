-- =============================================================================
-- NUTRIPLANT PRO — DUEÑO: UN SOLO PEGADO EN SUPABASE
-- =============================================================================
-- Dónde: Supabase.com → tu proyecto → menú izquierdo "SQL" → New query.
-- Qué hacer: selecciona TODO este archivo (Cmd/Ctrl+A), copia, pega en el editor,
--             pulsa RUN (▶).
-- Seguro ejecutar más de una vez en el mismo proyecto (usa IF NOT EXISTS).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A) COLUMNAS QUE PIDE EL PANEL ADMIN (si no existían, las crea)
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS subscription_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subscription_activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_payment_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS profession TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS crops TEXT[],
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS chat_blocked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS chat_limit_monthly INT,
  ADD COLUMN IF NOT EXISTS chat_usage_current_month INT,
  ADD COLUMN IF NOT EXISTS chat_usage_month TEXT,
  ADD COLUMN IF NOT EXISTS password_plain TEXT,
  ADD COLUMN IF NOT EXISTS chat_history_no_project JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS custom_amendments JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS custom_granular_materials JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS custom_granular_crops JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS custom_ferti_materials JSONB DEFAULT '{"items":[]}',
  ADD COLUMN IF NOT EXISTS custom_ferti_crops JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS custom_hydro_materials JSONB DEFAULT '{"items":[]}',
  ADD COLUMN IF NOT EXISTS user_notes TEXT,
  ADD COLUMN IF NOT EXISTS radar_credits_bonus integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancelled_by_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exclude_from_revenue BOOLEAN DEFAULT false NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_paypal_subscription_id_unique
  ON public.profiles (paypal_subscription_id)
  WHERE paypal_subscription_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- B) FUNCIÓN + RLS: evita "recursión infinita" al leer profiles/proyectos
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
$$;

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all projects" ON public.projects;

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin_user());

CREATE POLICY "Admins can view all projects"
  ON public.projects FOR SELECT
  USING (public.is_admin_user());

-- -----------------------------------------------------------------------------
-- C) ADMIN: puede editar/insertar proyectos en la nube desde el panel
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin_user());

DROP POLICY IF EXISTS "Admins can update all projects" ON public.projects;
CREATE POLICY "Admins can update all projects"
  ON public.projects FOR UPDATE
  USING (public.is_admin_user());

DROP POLICY IF EXISTS "Admins can insert projects" ON public.projects;
CREATE POLICY "Admins can insert projects"
  ON public.projects FOR INSERT
  WITH CHECK (public.is_admin_user());

-- -----------------------------------------------------------------------------
-- D) ADMIN: borrar usuarios/proyectos/reportes (panel)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.is_admin_user() AND id != auth.uid());

DROP POLICY IF EXISTS "Admins can delete projects" ON public.projects;
CREATE POLICY "Admins can delete projects"
  ON public.projects FOR DELETE
  USING (public.is_admin_user());

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'reports'
  ) THEN
    DROP POLICY IF EXISTS "Admins can delete all reports" ON public.reports;
    CREATE POLICY "Admins can delete all reports"
      ON public.reports FOR DELETE
      USING (public.is_admin_user());
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- E) ADMIN: ver y actualizar reportes (sin EXISTS(profiles…) recursivo)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'reports'
  ) THEN
    DROP POLICY IF EXISTS "Admins can view all reports" ON public.reports;
    CREATE POLICY "Admins can view all reports"
      ON public.reports FOR SELECT
      USING (public.is_admin_user());
    DROP POLICY IF EXISTS "Admins can update all reports" ON public.reports;
    CREATE POLICY "Admins can update all reports"
      ON public.reports FOR UPDATE
      USING (public.is_admin_user());
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- F) Si tienes tabla dashboard_visits: SELECT admin también con is_admin_user
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'dashboard_visits'
  ) THEN
    DROP POLICY IF EXISTS "Admins can view all visits" ON public.dashboard_visits;
    CREATE POLICY "Admins can view all visits"
      ON public.dashboard_visits FOR SELECT
      USING (public.is_admin_user());
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- G) Marcar cuenta admin como administradora (ajústala si usas otro correo)
-- -----------------------------------------------------------------------------
UPDATE public.profiles
SET is_admin = true, updated_at = now()
WHERE lower(email) = lower('admin@nutriplantpro.com');

-- Listo. Prueba el panel NutriPlant → Refrescar desde Supabase.
