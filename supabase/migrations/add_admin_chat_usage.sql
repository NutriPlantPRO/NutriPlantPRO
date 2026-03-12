-- Uso estimado del chat de admin (igual que usuarios: estimado por petición).
-- Una sola fila (id = 'default'). Netlify actualiza tras cada mensaje admin; el panel lee para "TU USO" en todos los equipos.
-- Ejecuta en Supabase → SQL Editor si la tabla no existe.

CREATE TABLE IF NOT EXISTS admin_chat_usage (
  id text PRIMARY KEY DEFAULT 'default',
  total_requests bigint NOT NULL DEFAULT 0,
  total_usd_est numeric NOT NULL DEFAULT 0,
  month_key text,
  month_requests bigint NOT NULL DEFAULT 0,
  month_usd_est numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Una sola fila inicial
INSERT INTO admin_chat_usage (id, total_requests, total_usd_est, month_key, month_requests, month_usd_est)
VALUES ('default', 0, 0, NULL, 0, 0)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE admin_chat_usage ENABLE ROW LEVEL SECURITY;

-- Solo lectura para usuarios autenticados (panel admin). Escritura solo con service_role (Netlify).
CREATE POLICY "admin_chat_usage_select_authenticated"
  ON admin_chat_usage FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE admin_chat_usage IS 'Uso estimado del chat del administrador; mismo criterio que usuarios (USD est. por petición).';
