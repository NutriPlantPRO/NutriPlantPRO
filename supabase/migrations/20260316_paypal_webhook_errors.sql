-- Tabla para guardar el motivo del 401 del webhook PayPal (depuración).
-- La Edge Function escribe aquí cuando falla la verificación de firma.
create table if not exists public.paypal_webhook_errors (
  id uuid primary key default gen_random_uuid(),
  reason text not null,
  created_at timestamptz default now()
);

comment on table public.paypal_webhook_errors is 'Últimos motivos de 401 del paypal-webhook; para depuración.';
