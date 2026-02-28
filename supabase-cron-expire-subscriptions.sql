-- ============================================================
-- Cron: expirar suscripciones por fecha (regalos / cortes manuales)
-- ============================================================
-- La Edge Function expire-subscriptions-by-date pone subscription_status = 'expired'
-- donde: active + sin PayPal + next_payment_date < hoy.
--
-- 1. Despliega la función: supabase functions deploy expire-subscriptions-by-date
-- 2. En Supabase Dashboard → Database → Extensions: activa pg_cron y pg_net
-- 3. Sustituye PROJECT_REF y ANON_OR_SERVICE_KEY abajo y ejecuta este SQL.
-- ============================================================

-- Opción A: llamar a la Edge Function cada día a las 00:05 UTC
-- (Sustituye PROJECT_REF por tu ref de proyecto y ANON_OR_SERVICE_KEY por tu anon key o service role)
/*
select cron.schedule(
  'expire-subscriptions-by-date',
  '5 0 * * *',
  $$
  select net.http_post(
    url := 'https://PROJECT_REF.supabase.co/functions/v1/expire-subscriptions-by-date',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ANON_OR_SERVICE_KEY'
    ),
    body := '{}',
    timeout_milliseconds := 10000
  ) as request_id;
  $$
);
*/

-- Para ver jobs: select * from cron.job;
-- Para borrar: select cron.unschedule('expire-subscriptions-by-date');
