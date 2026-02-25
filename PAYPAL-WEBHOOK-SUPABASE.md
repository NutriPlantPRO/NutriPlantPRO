## Configurar webhook PayPal en Supabase

### 1) Ejecuta SQL de soporte

En Supabase SQL Editor ejecuta:

- `supabase-paypal-webhook-setup.sql`

Esto agrega en `profiles`:
- `paypal_subscription_id`
- `subscription_activated_at`

### 2) Despliega la Edge Function

Archivo:
- `supabase/functions/paypal-webhook/index.ts`

Comandos (CLI):

```bash
supabase functions deploy paypal-webhook
```

### 3) Define variables de entorno en la function

Configura estos secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID`
- `PAYPAL_API_BASE`:
  - Live: `https://api-m.paypal.com`
  - Sandbox: `https://api-m.sandbox.paypal.com`

Ejemplo:

```bash
supabase secrets set SUPABASE_URL="https://TU-PROYECTO.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="TU_SERVICE_ROLE_KEY"
supabase secrets set PAYPAL_CLIENT_ID="TU_CLIENT_ID"
supabase secrets set PAYPAL_CLIENT_SECRET="TU_CLIENT_SECRET"
supabase secrets set PAYPAL_WEBHOOK_ID="TU_WEBHOOK_ID"
supabase secrets set PAYPAL_API_BASE="https://api-m.paypal.com"
```

### 4) Configura webhook en PayPal

En PayPal Developer/Webhooks agrega endpoint:

- `https://<tu-proyecto>.functions.supabase.co/paypal-webhook`

Eventos mínimos:

- `BILLING.SUBSCRIPTION.ACTIVATED`
- `BILLING.SUBSCRIPTION.CANCELLED`
- `BILLING.SUBSCRIPTION.SUSPENDED`
- `BILLING.SUBSCRIPTION.EXPIRED`

### 5) Flujo esperado

- Frontend crea suscripción con `custom_id = userId`.
- Al aprobar, frontend guarda estado activo inmediato (UX).
- Webhook confirma estado real desde PayPal y actualiza `profiles`.

### 6) Nota importante

Si cambias de Sandbox a Live:

- usa `PAYPAL_API_BASE` correcto
- cambia `PAYPAL_CLIENT_ID/SECRET`
- crea nuevo webhook y actualiza `PAYPAL_WEBHOOK_ID`

