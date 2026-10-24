-- Complemento público NutriPlant PRO en ChatGPT.
-- Consultas por día y usuarios distintos, sin nombre ni correo.
-- Ejecutar en Supabase → SQL Editor.
-- Escritura: Netlify service_role. Lectura: admin.

CREATE TABLE IF NOT EXISTS public.chatgpt_public_usage_daily (
  day date NOT NULL,
  actor_hash text NOT NULL,
  calls integer NOT NULL DEFAULT 0,
  PRIMARY KEY (day, actor_hash)
);

COMMENT ON TABLE public.chatgpt_public_usage_daily IS
  'Uso del complemento público en ChatGPT. actor_hash es un resumen, no el usuario. sin-sesion = consultas sin chat identificable.';

ALTER TABLE public.chatgpt_public_usage_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chatgpt_public_usage_select_admin" ON public.chatgpt_public_usage_daily;
CREATE POLICY "chatgpt_public_usage_select_admin"
  ON public.chatgpt_public_usage_daily FOR SELECT
  TO authenticated
  USING (public.is_admin_user());

CREATE OR REPLACE FUNCTION public.bump_chatgpt_public_usage(p_day date, p_actor text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_day IS NULL OR p_actor IS NULL OR length(p_actor) < 3 OR length(p_actor) > 80 THEN
    RETURN;
  END IF;
  INSERT INTO public.chatgpt_public_usage_daily (day, actor_hash, calls)
  VALUES (p_day, p_actor, 1)
  ON CONFLICT (day, actor_hash)
  DO UPDATE SET calls = public.chatgpt_public_usage_daily.calls + 1;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_chatgpt_public_usage(date, text) FROM PUBLIC, anon, authenticated;
