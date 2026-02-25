# Guía paso a paso: Webhook PayPal en Supabase (NutriPlant PRO)

Sigue estos pasos en orden. No saltes ninguno.

---

## PASO 1: Ejecutar SQL en Supabase (columnas para PayPal)

1. Abre el navegador y entra a **https://supabase.com** → inicia sesión.
2. Abre tu proyecto **NutriPlant PRO** (el que usa `grbxhxydgaxhpoedbltd.supabase.co`).
3. En el menú izquierdo haz clic en **SQL Editor**.
4. Haz clic en **New query**.
5. Abre en tu computadora el archivo del proyecto:
   - **`supabase-paypal-webhook-setup.sql`**
6. Copia **todo** el contenido del archivo y pégalo en el editor SQL de Supabase.
7. Haz clic en **Run** (o Ctrl+Enter).
8. Debe aparecer **Success**. Con esto la tabla `profiles` ya tiene las columnas `paypal_subscription_id` y `subscription_activated_at` (o se confirman si ya existían).

---

## PASO 2: Instalar Supabase CLI (si aún no la tienes)

1. Abre una terminal (en Mac: Terminal o iTerm).
2. Ejecuta:
   ```bash
   npm install -g supabase
   ```
   Si prefieres Homebrew en Mac:
   ```bash
   brew install supabase/tap/supabase
   ```
3. Verifica:
   ```bash
   supabase --version
   ```

---

## PASO 3: Iniciar sesión en Supabase desde la terminal

1. En la misma terminal, desde la carpeta de tu proyecto (donde está `login.html`, `supabase-config.js`, etc.), ejecuta:
   ```bash
   supabase login
   ```
2. Se abrirá el navegador para que inicies sesión en Supabase. Autoriza el acceso.
3. Vuelve a la terminal y confirma que no haya error.

---

## PASO 4: Enlazar el proyecto local con tu proyecto en la nube

1. En Supabase Dashboard → **Project Settings** (icono de engrane) → **General**.
2. Copia el **Reference ID** del proyecto (en tu caso es algo como `grbxhxydgaxhpoedbltd`).
3. En la terminal, dentro de la carpeta del proyecto, ejecuta:
   ```bash
   supabase link --project-ref grbxhxydgaxhpoedbltd
   ```
   (Sustituye `grbxhxydgaxhpoedbltd` por tu Reference ID si es distinto.)
4. Cuando pida la contraseña de la base de datos, usa la que tienes en **Project Settings → Database → Database password**. Si no la recuerdas, puedes resetearla desde ahí.

---

## PASO 5: Desplegar la Edge Function `paypal-webhook`

1. Asegúrate de estar en la raíz del proyecto (donde está la carpeta `supabase/`).
2. Ejecuta:
   ```bash
   supabase functions deploy paypal-webhook
   ```
3. Espera a que diga que el deploy fue exitoso.
4. La URL de tu función quedará así:
   - **`https://grbxhxydgaxhpoedbltd.supabase.co/functions/v1/paypal-webhook`**
   (Cambia el subdominio si tu Reference ID es otro.)

---

## PASO 6: Configurar los “secrets” (variables de entorno) de la función

Necesitas estos valores:

| Variable | Dónde obtenerla |
|----------|-----------------|
| `SUPABASE_URL` | Supabase → Project Settings → API → **Project URL** (ej. `https://grbxhxydgaxhpoedbltd.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → **service_role** (key que dice “secret”). **No la compartas ni la pongas en el frontend.** |
| `PAYPAL_CLIENT_ID` | PayPal Developer → Tu app → Client ID (el mismo que usas en el botón). |
| `PAYPAL_CLIENT_SECRET` | PayPal Developer → Tu app → Secret. |
| `PAYPAL_WEBHOOK_ID` | Lo obtienes en el **Paso 7** después de crear el webhook en PayPal. |
| `PAYPAL_API_BASE` | Producción: `https://api-m.paypal.com` — Pruebas: `https://api-m.sandbox.paypal.com` |

En la terminal, ejecuta **una línea por cada variable** (sustituye los valores por los tuyos):

```bash
supabase secrets set SUPABASE_URL="https://grbxhxydgaxhpoedbltd.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...."
supabase secrets set PAYPAL_CLIENT_ID="AUYkwOOt_8oUyA6nlNdyT8MHh7TlX28UnV5FeGtsbafzj0565UtYGlT167F1QcWENoiUuicYvxzT3Ldd"
supabase secrets set PAYPAL_CLIENT_SECRET="TU_SECRET_DE_PAYPAL"
supabase secrets set PAYPAL_WEBHOOK_ID="EL_ID_QUE_TE_DARA_PAYPAL_EN_PASO_7"
supabase secrets set PAYPAL_API_BASE="https://api-m.paypal.com"
```

- Para **Sandbox** (pruebas), usa el Client ID y Secret de la app Sandbox y:
  ```bash
  supabase secrets set PAYPAL_API_BASE="https://api-m.sandbox.paypal.com"
  ```
- **`PAYPAL_WEBHOOK_ID`** lo rellenarás después del Paso 7; luego ejecuta de nuevo esa línea con el ID real.

---

## PASO 7: Crear el webhook en PayPal y copiar el Webhook ID

1. Entra a **https://developer.paypal.com** (o sandbox si usas pruebas) → **Dashboard** → **Apps & Credentials**.
2. Elige la app que usas para NutriPlant PRO.
3. En la misma app o en el menú lateral, busca **Webhooks** (o **Add Webhook**).
4. Clic en **Add Webhook**.
5. **Webhook URL:** pega la URL de tu función:
   - **`https://grbxhxydgaxhpoedbltd.supabase.co/functions/v1/paypal-webhook`**
   (sustituye el subdominio si es otro.)
6. **Event types** – selecciona al menos estos:
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
   - `BILLING.SUBSCRIPTION.EXPIRED`
7. Guarda el webhook.
8. En la lista de webhooks verás uno nuevo; ábrelo y **copia el Webhook ID** (suele ser un texto largo).
9. En la terminal, configura el secret con ese ID:
   ```bash
   supabase secrets set PAYPAL_WEBHOOK_ID="EL_ID_QUE_COPIASTE"
   ```

---

## PASO 8: Probar que el webhook responde (opcional pero recomendado)

1. En PayPal Developer → Webhooks → tu webhook → **Simulations** (o “Simular”).
2. Elige un evento, por ejemplo **Subscription activated**.
3. Envía la simulación.
4. En Supabase Dashboard → **Edge Functions** → **paypal-webhook** → pestaña **Logs**.
5. Deberías ver una petición entrante y respuesta 200 (si el Webhook ID y secrets están bien). Si hay 401, revisa que `PAYPAL_WEBHOOK_ID` y `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` coincidan con la app donde creaste el webhook.

---

## PASO 9: Probar con un usuario real

1. En tu app, crea una cuenta nueva (o usa una de prueba).
2. En el paso de suscripción, activa con PayPal y completa el pago (o aprobación en Sandbox).
3. En Supabase → **Table Editor** → tabla **profiles** → busca ese usuario.
4. Comprueba que tenga:
   - `subscription_status` = `active`
   - `paypal_subscription_id` = ID de la suscripción (empieza por `I-` o similar).
5. Opcional: en PayPal cancela la suscripción de prueba; en unos segundos el webhook debería actualizar ese perfil a `cancelled` (puedes comprobarlo en la tabla `profiles` y en los logs de la función).

---

## Resumen rápido

| Paso | Qué haces |
|------|-----------|
| 1 | Ejecutar `supabase-paypal-webhook-setup.sql` en SQL Editor. |
| 2 | Instalar Supabase CLI. |
| 3 | `supabase login`. |
| 4 | `supabase link --project-ref TU_REF_ID`. |
| 5 | `supabase functions deploy paypal-webhook`. |
| 6 | `supabase secrets set` para todas las variables (URL, service_role, PayPal client, secret, webhook id, API base). |
| 7 | Crear webhook en PayPal con la URL de la función y copiar Webhook ID → actualizar secret. |
| 8 | Simular evento en PayPal y revisar logs en Supabase. |
| 9 | Probar registro + PayPal y revisar `profiles` en Supabase. |

Si en algún paso te sale un error, copia el mensaje exacto y el número del paso y lo vemos. Con esto el webhook queda listo para producción.
