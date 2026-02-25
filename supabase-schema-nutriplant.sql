-- ============================================================
-- NUTRIPLANT PRO - Esquema de Base de Datos para Supabase
-- ============================================================
--
-- CÓMO USAR:
-- 1. Entra a Supabase Dashboard → tu proyecto NutriPlantPRO
-- 2. Menú izquierdo: SQL Editor
-- 3. Click en "New query"
-- 4. Copia TODO este archivo y pégalo en el editor
-- 5. Click en "Run" (o Ctrl+Enter)
-- 6. Deberías ver "Success" - las tablas están creadas
--
-- ============================================================

-- 1. TABLA: profiles (perfil del usuario - se vincula con Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  is_admin BOOLEAN DEFAULT false,
  subscription_status TEXT DEFAULT 'inactive',
  subscription_amount NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ,
  chat_history_no_project JSONB DEFAULT '[]',
  custom_amendments JSONB DEFAULT '[]',
  custom_granular_materials JSONB DEFAULT '{}',
  custom_granular_crops JSONB DEFAULT '{}',
  custom_ferti_materials JSONB DEFAULT '{"items":[]}',
  custom_ferti_crops JSONB DEFAULT '{}',
  custom_hydro_materials JSONB DEFAULT '{"items":[]}'
);
-- Si la tabla ya existía, añadir columnas manualmente:
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS chat_history_no_project JSONB DEFAULT '[]';
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_amendments JSONB DEFAULT '[]';
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_granular_materials JSONB DEFAULT '{}';
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_granular_crops JSONB DEFAULT '{}';
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_ferti_materials JSONB DEFAULT '{"items":[]}';
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_ferti_crops JSONB DEFAULT '{}';
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_hydro_materials JSONB DEFAULT '{"items":[]}';

-- 2. TABLA: projects (proyectos del usuario)
-- data = JSON con todas las secciones (location, amendments, granular, fertirriego, etc.)
CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON public.projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 2b. TABLA: reports (reportes PDF generados por usuario y proyecto)
CREATE TABLE IF NOT EXISTS public.reports (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reports_user_project ON public.reports(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);

-- 3. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Políticas: cada usuario solo ve/edita sus propios datos
-- Requiere Supabase Auth para que auth.uid() funcione

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can view all projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can insert own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can update own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can delete own reports" ON public.reports;

-- Profiles: el usuario solo ve su propio perfil
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

-- Admins pueden ver todos los perfiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- Projects: el usuario solo ve/edita sus propios proyectos
CREATE POLICY "Users can view own projects"
  ON public.projects FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own projects"
  ON public.projects FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE
  USING (user_id = auth.uid());

-- Admin: puede ver todos los proyectos (para panel admin)
-- Se aplica si is_admin = true en profiles
CREATE POLICY "Admins can view all projects"
  ON public.projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Reports: el usuario solo ve/inserta/actualiza/elimina sus propios reportes
CREATE POLICY "Users can view own reports" ON public.reports FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own reports" ON public.reports FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own reports" ON public.reports FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own reports" ON public.reports FOR DELETE USING (user_id = auth.uid());
-- Admin: puede ver todos los reportes (panel admin)
DROP POLICY IF EXISTS "Admins can view all reports" ON public.reports;
CREATE POLICY "Admins can view all reports" ON public.reports FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));
-- Admin: puede actualizar reportes (reasignar proyecto = cambiar user_id de reportes)
DROP POLICY IF EXISTS "Admins can update all reports" ON public.reports;
CREATE POLICY "Admins can update all reports" ON public.reports FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- 4. Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. TRIGGER: Crear perfil automáticamente cuando un usuario se registra (Supabase Auth)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- NOTA sobre Auth
-- ============================================================
-- El trigger crea un profile automáticamente cuando alguien se registra
-- con Supabase Auth (email/contraseña). Las políticas RLS aseguran
-- que cada usuario solo vea sus propios proyectos.
--
-- Estructura de data (JSONB) en projects - igual que localStorage:
-- {
--   "location": { "polygon": [...], "address": "...", ... },
--   "amendments": { "selected": [...], "results": {...} },
--   "soilAnalysis": { ... },
--   "granular": { "requirements": {...}, "program": {...} },
--   "fertirriego": { ... },
--   "hidroponia": { ... },
--   "vpdAnalysis": { ... },
--   "soilAnalyses": [...],
--   "solucionNutritivaAnalyses": [...],
--   ...
-- }
-- ============================================================
