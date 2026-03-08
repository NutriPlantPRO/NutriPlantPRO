-- Historial del chat de asistente IA del panel de administración (no se mezcla con chats de usuarios).
-- Una fila por admin: thread = array JSON de { role, content }.

CREATE TABLE IF NOT EXISTS public.admin_chat_threads (
  admin_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  thread JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_chat_threads IS 'Chat del asistente IA del panel de admin; solo admins, separado de usuarios.';

-- RLS: solo el admin dueño puede leer y actualizar su propia fila
ALTER TABLE public.admin_chat_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can read own chat thread" ON public.admin_chat_threads;
CREATE POLICY "Admin can read own chat thread" ON public.admin_chat_threads
  FOR SELECT
  USING (
    auth.uid() = admin_id
    AND EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "Admin can insert own chat thread" ON public.admin_chat_threads;
CREATE POLICY "Admin can insert own chat thread" ON public.admin_chat_threads
  FOR INSERT
  WITH CHECK (
    auth.uid() = admin_id
    AND EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "Admin can update own chat thread" ON public.admin_chat_threads;
CREATE POLICY "Admin can update own chat thread" ON public.admin_chat_threads
  FOR UPDATE
  USING (
    auth.uid() = admin_id
    AND EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );
