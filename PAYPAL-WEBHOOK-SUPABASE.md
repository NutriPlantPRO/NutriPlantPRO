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

### 6) Cómo revisar que Supabase SÍ recibe el aviso de PayPal

**Checklist rápido:**

1. **URL del webhook en PayPal**  
   En [developer.paypal.com](https://developer.paypal.com) → tu app → **Webhooks** → el webhook debe tener exactamente:
   - **URL:** `https://TU_REF.supabase.co/functions/v1/paypal-webhook` (mismo proyecto que usas en producción).
   - **Eventos** incluyen al menos: `BILLING.SUBSCRIPTION.CANCELLED`, `BILLING.SUBSCRIPTION.EXPIRED`, `BILLING.SUBSCRIPTION.ACTIVATED`, `PAYMENT.SALE.COMPLETED`.

2. **Secrets en Supabase**  
   En terminal (o Dashboard → Edge Functions → paypal-webhook → Secrets) que estén definidos:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_API_BASE`
   - `PAYPAL_WEBHOOK_ID` = el **ID del webhook** que muestra PayPal en la lista de webhooks (no el de la app).

3. **Probar recepción (simulación)**  
   - PayPal Developer → Webhooks → tu webhook → **Simulations** (o “Simular evento”).
   - Elige por ejemplo **“Billing subscription cancelled”** o **“Billing subscription expired”**.
   - Envía la simulación.
   - En **Supabase Dashboard** → **Edge Functions** → **paypal-webhook** → pestaña **Logs**.
   - Deberías ver una línea nueva con la petición y respuesta **200**. Si sale **401**, falla la verificación de firma (revisa `PAYPAL_WEBHOOK_ID` y que Client ID/Secret sean de la misma app donde está el webhook).

4. **Cuando termine el periodo del usuario que canceló**  
   - Vuelve a abrir **Logs** de la función `paypal-webhook` ese día (o al día siguiente).
   - Si PayPal envía el evento, aparecerá una petición con `event_type: BILLING.SUBSCRIPTION.CANCELLED` o `BILLING.SUBSCRIPTION.EXPIRED` y `profile_updates: 1` si encontró al usuario.
   - En **Table Editor** → **profiles** → ese usuario debería tener `subscription_status` = `cancelled` o `expired`.

Si la simulación devuelve 200 pero en producción no ves el evento cuando termina el periodo, entonces PayPal no está enviando el aviso (habría que revisar en PayPal que el webhook esté activo y con la URL correcta en **Live**, no solo en Sandbox).

### 7) Después de cambiar secrets: redeploy

Si editas **PAYPAL_WEBHOOK_ID** (o cualquier secret) en el Dashboard o por CLI, la función debe **volver a desplegarse** para que use los nuevos valores:

```bash
supabase functions deploy paypal-webhook
```

Luego prueba de nuevo con **Simulations** en PayPal o con un evento real.

### 8) Si la función devuelve 401

La respuesta 401 incluye un cuerpo JSON con `error` y `reason` para depurar:

- **"PAYPAL_WEBHOOK_ID not set or empty"** → El secret no está definido o está vacío. Configúralo y haz **redeploy** (sección 7).
- **"Missing PayPal transmission headers"** → PayPal no envió los headers de firma; suele ser una petición de prueba manual (no desde PayPal).
- **"PayPal API 401: ..."** → Las credenciales (`PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`) son incorrectas o no corresponden a la app donde está el webhook (Live vs Sandbox).
- **"PayPal verification_status=FAILURE"** → El `PAYPAL_WEBHOOK_ID` no coincide con el webhook que recibe el evento. Comprueba en PayPal Developer → Webhooks el ID y que sea de la **misma app Live** que `PAYPAL_CLIENT_ID`/`PAYPAL_CLIENT_SECRET`.

En Supabase: Edge Functions → paypal-webhook → **Invocations** → clic en la invocación → pestaña **Raw** para ver el cuerpo de la respuesta con `reason`.

### 9) Nota importante

Si cambias de Sandbox a Live:

- usa `PAYPAL_API_BASE` correcto
- cambia `PAYPAL_CLIENT_ID/SECRET`
- crea nuevo webhook y actualiza `PAYPAL_WEBHOOK_ID`

