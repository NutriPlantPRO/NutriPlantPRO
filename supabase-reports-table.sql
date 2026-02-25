-- ============================================================
-- Tabla de reportes PDF generados por usuario y proyecto
-- ============================================================
-- Ejecuta en Supabase → SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reports (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_user_project ON public.reports(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can insert own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can delete own reports" ON public.reports;

CREATE POLICY "Users can view own reports"
  ON public.reports FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own reports"
  ON public.reports FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own reports"
  ON public.reports FOR DELETE
  USING (user_id = auth.uid());

-- Permitir update por si se quiere actualizar data (mismo usuario)
CREATE POLICY "Users can update own reports"
  ON public.reports FOR UPDATE
  USING (user_id = auth.uid());

-- Admin puede ver todos los reportes (para el panel de admin)
DROP POLICY IF EXISTS "Admins can view all reports" ON public.reports;
CREATE POLICY "Admins can view all reports"
  ON public.reports FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );
-- Admin puede actualizar reportes (para reasignar proyecto: cambiar user_id de los reportes)
DROP POLICY IF EXISTS "Admins can update all reports" ON public.reports;
CREATE POLICY "Admins can update all reports"
  ON public.reports FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );
