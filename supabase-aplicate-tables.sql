-- =============================================================================
-- Applicate — tablas en el MISMO proyecto Supabase que NutriPlant PRO
-- =============================================================================
-- Supabase → SQL → New query → pegar TODO → Run.
-- Requisito: public.is_admin_user() (supabase-fix-rls-recursion.sql).
-- No toca profiles / projects. Idempotente.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.aplicate_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Alumnos (métrica Applicate)
CREATE TABLE IF NOT EXISTS public.aplicate_profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name     text NOT NULL DEFAULT '',
  email         text NOT NULL DEFAULT '',
  phone         text,
  phone_code    text,
  country       text,
  state         text,
  postal        text,
  profession    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aplicate_profiles_email
  ON public.aplicate_profiles (lower(email));

DROP TRIGGER IF EXISTS tr_aplicate_profiles_updated ON public.aplicate_profiles;
CREATE TRIGGER tr_aplicate_profiles_updated
  BEFORE UPDATE ON public.aplicate_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.aplicate_set_updated_at();

-- Catálogo
CREATE TABLE IF NOT EXISTS public.aplicate_courses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL DEFAULT '',
  summary       text NOT NULL DEFAULT '',
  price_usd     numeric(10, 2),
  cover_url     text,
  published     boolean NOT NULL DEFAULT false,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS tr_aplicate_courses_updated ON public.aplicate_courses;
CREATE TRIGGER tr_aplicate_courses_updated
  BEFORE UPDATE ON public.aplicate_courses
  FOR EACH ROW EXECUTE PROCEDURE public.aplicate_set_updated_at();

CREATE TABLE IF NOT EXISTS public.aplicate_lessons (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     uuid NOT NULL REFERENCES public.aplicate_courses (id) ON DELETE CASCADE,
  title         text NOT NULL DEFAULT '',
  sort_order    integer NOT NULL DEFAULT 0,
  video_url     text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aplicate_lessons_course
  ON public.aplicate_lessons (course_id, sort_order);

CREATE TABLE IF NOT EXISTS public.aplicate_files (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     uuid NOT NULL REFERENCES public.aplicate_courses (id) ON DELETE CASCADE,
  name          text NOT NULL DEFAULT '',
  storage_path  text,
  mime          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aplicate_files_course
  ON public.aplicate_files (course_id);

CREATE TABLE IF NOT EXISTS public.aplicate_purchases (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  course_id     uuid NOT NULL REFERENCES public.aplicate_courses (id) ON DELETE CASCADE,
  source        text NOT NULL DEFAULT 'admin',
  paypal_id     text,
  note          text,
  assigned_by   uuid REFERENCES auth.users (id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT aplicate_purchases_user_course UNIQUE (user_id, course_id),
  CONSTRAINT aplicate_purchases_source_chk CHECK (
    source IN ('paypal', 'transferencia', 'regalo', 'promo', 'admin')
  )
);

CREATE INDEX IF NOT EXISTS idx_aplicate_purchases_user
  ON public.aplicate_purchases (user_id);

CREATE TABLE IF NOT EXISTS public.aplicate_saves (
  user_id       uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  course_id     uuid NOT NULL REFERENCES public.aplicate_courses (id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS public.aplicate_progress (
  user_id       uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  course_id     uuid NOT NULL REFERENCES public.aplicate_courses (id) ON DELETE CASCADE,
  lesson_id     uuid REFERENCES public.aplicate_lessons (id) ON DELETE CASCADE,
  viewed_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS public.aplicate_certificates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  course_id     uuid NOT NULL REFERENCES public.aplicate_courses (id) ON DELETE CASCADE,
  folio         text,
  issued_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT aplicate_certificates_user_course UNIQUE (user_id, course_id)
);

-- Visitas Applicate (no usa dashboard_visits: ese FK es profiles)
CREATE TABLE IF NOT EXISTS public.aplicate_visits (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  visited_at    timestamptz NOT NULL DEFAULT now(),
  lat           double precision,
  lng           double precision
);

CREATE INDEX IF NOT EXISTS idx_aplicate_visits_user_visited
  ON public.aplicate_visits (user_id, visited_at DESC);

-- RLS
ALTER TABLE public.aplicate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aplicate_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aplicate_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aplicate_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aplicate_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aplicate_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aplicate_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aplicate_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aplicate_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS aplicate_profiles_own ON public.aplicate_profiles;
CREATE POLICY aplicate_profiles_own ON public.aplicate_profiles
  FOR ALL USING (id = auth.uid() OR public.is_admin_user())
  WITH CHECK (id = auth.uid() OR public.is_admin_user());

DROP POLICY IF EXISTS aplicate_courses_read ON public.aplicate_courses;
CREATE POLICY aplicate_courses_read ON public.aplicate_courses
  FOR SELECT USING (published = true OR public.is_admin_user());

DROP POLICY IF EXISTS aplicate_courses_admin ON public.aplicate_courses;
CREATE POLICY aplicate_courses_admin ON public.aplicate_courses
  FOR ALL USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS aplicate_lessons_read ON public.aplicate_lessons;
CREATE POLICY aplicate_lessons_read ON public.aplicate_lessons
  FOR SELECT USING (
    public.is_admin_user()
    OR EXISTS (
      SELECT 1 FROM public.aplicate_purchases p
      WHERE p.course_id = aplicate_lessons.course_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS aplicate_lessons_admin ON public.aplicate_lessons;
CREATE POLICY aplicate_lessons_admin ON public.aplicate_lessons
  FOR ALL USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS aplicate_files_read ON public.aplicate_files;
CREATE POLICY aplicate_files_read ON public.aplicate_files
  FOR SELECT USING (
    public.is_admin_user()
    OR EXISTS (
      SELECT 1 FROM public.aplicate_purchases p
      WHERE p.course_id = aplicate_files.course_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS aplicate_files_admin ON public.aplicate_files;
CREATE POLICY aplicate_files_admin ON public.aplicate_files
  FOR ALL USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS aplicate_purchases_own ON public.aplicate_purchases;
CREATE POLICY aplicate_purchases_own ON public.aplicate_purchases
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin_user());

DROP POLICY IF EXISTS aplicate_purchases_admin ON public.aplicate_purchases;
CREATE POLICY aplicate_purchases_admin ON public.aplicate_purchases
  FOR ALL USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS aplicate_saves_own ON public.aplicate_saves;
CREATE POLICY aplicate_saves_own ON public.aplicate_saves
  FOR ALL USING (user_id = auth.uid() OR public.is_admin_user())
  WITH CHECK (user_id = auth.uid() OR public.is_admin_user());

DROP POLICY IF EXISTS aplicate_progress_own ON public.aplicate_progress;
CREATE POLICY aplicate_progress_own ON public.aplicate_progress
  FOR ALL USING (user_id = auth.uid() OR public.is_admin_user())
  WITH CHECK (user_id = auth.uid() OR public.is_admin_user());

DROP POLICY IF EXISTS aplicate_certs_own ON public.aplicate_certificates;
CREATE POLICY aplicate_certs_own ON public.aplicate_certificates
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin_user());

DROP POLICY IF EXISTS aplicate_certs_paid_insert ON public.aplicate_certificates;
CREATE POLICY aplicate_certs_paid_insert ON public.aplicate_certificates
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.aplicate_purchases p
      WHERE p.user_id = auth.uid()
        AND p.course_id = course_id
    )
  );

DROP POLICY IF EXISTS aplicate_certs_admin ON public.aplicate_certificates;
CREATE POLICY aplicate_certs_admin ON public.aplicate_certificates
  FOR ALL USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS aplicate_visits_insert ON public.aplicate_visits;
CREATE POLICY aplicate_visits_insert ON public.aplicate_visits
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS aplicate_visits_select ON public.aplicate_visits;
CREATE POLICY aplicate_visits_select ON public.aplicate_visits
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin_user());

ALTER TABLE public.aplicate_courses
  ADD COLUMN IF NOT EXISTS presenter text,
  ADD COLUMN IF NOT EXISTS signature_url text;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.aplicate_profiles,
  public.aplicate_courses,
  public.aplicate_lessons,
  public.aplicate_files,
  public.aplicate_purchases,
  public.aplicate_saves,
  public.aplicate_progress,
  public.aplicate_certificates,
  public.aplicate_visits
TO authenticated;
