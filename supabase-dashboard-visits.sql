-- ============================================================
-- Tabla: entradas al panel (dashboard) por usuario
-- Para métrica: cuántas veces entran los suscriptores al panel por mes
-- ============================================================
-- Ejecuta en Supabase → SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.dashboard_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_visits_user_id ON public.dashboard_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_visits_visited_at ON public.dashboard_visits(visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_visits_user_visited ON public.dashboard_visits(user_id, visited_at DESC);

ALTER TABLE public.dashboard_visits ENABLE ROW LEVEL SECURITY;

-- El usuario solo puede insertar su propia visita (al entrar al dashboard)
DROP POLICY IF EXISTS "Users can insert own visit" ON public.dashboard_visits;
CREATE POLICY "Users can insert own visit"
  ON public.dashboard_visits FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Solo el admin puede leer todas las visitas (para el panel de admin)
DROP POLICY IF EXISTS "Admins can view all visits" ON public.dashboard_visits;
CREATE POLICY "Admins can view all visits"
  ON public.dashboard_visits FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- Opcional: el usuario puede ver sus propias visitas (por si en el futuro quieres mostrarlas en su perfil)
DROP POLICY IF EXISTS "Users can view own visits" ON public.dashboard_visits;
CREATE POLICY "Users can view own visits"
  ON public.dashboard_visits FOR SELECT
  USING (user_id = auth.uid());
