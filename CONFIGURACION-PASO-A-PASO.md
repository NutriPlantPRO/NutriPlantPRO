# NutriPlant PRO — Configuración paso a paso

Guía para dejar el proyecto listo en producción (dominio, PayPal Live, Supabase, Netlify).  
**Haz un paso, valida, y pasamos al siguiente.**

---

## Estado del registro

- **Ahora:** La opción "Crear Nueva Cuenta" está **oculta** en el login (solo se ve Iniciar sesión + calculadoras gratis).
- **Para que tú (o quien tenga el link) pueda registrarse sin mostrarlo a todos:** Entra a `https://nutriplantpro.com/login.html?np_reg=1` (o `?np_reg=si`). Ahí aparece "Crear Nueva Cuenta". Guarda el enlace en favoritos.
- **Cuando quieras abrir registros a todo el mundo:** En `login.html` busca `window.NUTRIPLANT_REGISTRATION_OPEN = false` y cámbialo a `true`. Vuelve a desplegar.

---

## Lista de pasos (ir marcando)

### 1. Supabase — Proyecto y tablas
- [ ] Tienes el proyecto NutriPlantPRO en Supabase.
- [ ] Ejecutaste el esquema (tablas `profiles`, `projects`, `reports`, `dashboard_visits`) y las columnas extra de `profiles` (`supabase-profiles-columnas-completas.sql`).
- [ ] RLS y políticas están activas; el admin usa la service role o las políticas de admin.

**Validar:** En Table Editor ves `profiles`, `projects`, `reports` y en `profiles` columnas como `subscription_status`, `next_payment_date`, `paypal_subscription_id`.

---

### 2. Supabase — Webhook de PayPal (Edge Function)
- [ ] Edge Function `paypal-webhook` desplegada.
- [ ] En Supabase → Project Settings → Edge Functions → **Secrets** (o env):
  - `PAYPAL_CLIENT_ID` = Client ID **Live** de PayPal.
  - `PAYPAL_CLIENT_SECRET` = Secret **Live** de PayPal.
  - `PAYPAL_WEBHOOK_ID` = ID del webhook que crearás en el paso 4.

**Validar:** La URL de la función es algo como `https://TU_REF.supabase.co/functions/v1/paypal-webhook`. Anótala para el paso 4.

---

### 3. PayPal Developer — App y plan Live
- [ ] En https://developer.paypal.com, pestaña **Live** (no Sandbox).
- [ ] Tienes una app Live con **Client ID** y **Secret** anotados.
- [ ] Tienes un **plan de suscripción** Live (cada 5 meses) y su **Plan ID** (P-xxxxx). Si no: usa `paypal_config.json` en modo live y el script `create_live_plan.py` (ver `PASO-A-PASO-PAYPAL-LIVE.md`).

**Validar:** Tienes anotados: Client ID Live, Secret Live, Plan ID Live (P-xxxxx).

---

### 4. PayPal Developer — Webhook
- [ ] En developer.paypal.com → tu app Live → **Webhooks** → Add Webhook.
- [ ] **URL del webhook:** la URL de tu Edge Function (paso 2), ej. `https://TU_REF.supabase.co/functions/v1/paypal-webhook`.
- [ ] Eventos a suscribir: al menos `Billing subscription activated`, `Billing subscription cancelled`, `Billing subscription suspended`, `Billing subscription expired` (y si quieres Created/Approved).
- [ ] Guardas y copias el **Webhook ID** que te da PayPal.
- [ ] En Supabase (paso 2) añades o actualizas el secret `PAYPAL_WEBHOOK_ID` con ese ID.

**Validar:** El webhook aparece en la lista con tu URL y los eventos correctos.

---

### 5. Netlify — Variables de entorno (tu dominio)
- [ ] Netlify → tu sitio → **Site configuration** → **Environment variables**.
- [ ] Añades:
  - `PAYPAL_CLIENT_ID` = mismo Client ID Live del paso 3.
  - `PAYPAL_PLAN_ID` = Plan ID Live (P-xxxxx) del paso 3.
- [ ] Si usas OpenAI en el chat: `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (como ya tengas con OpenAI).
- [ ] **Redeploy** del sitio para que tome las variables.

**Validar:** En tu dominio, al abrir el login y (si tuvieras registro abierto) pulsar "Activar con PayPal", se cargaría el botón con el Client ID Live (no sandbox).

---

### 6. Cron opcional — Expirar suscripciones por fecha
- [ ] Si quieres que los “regalos” (usuarios activados a mano sin PayPal) expiren solos al llegar `next_payment_date`:
  - Despliega la Edge Function `expire-subscriptions-by-date`.
  - En Supabase activa **pg_cron** y **pg_net**.
  - Ejecuta el SQL de `supabase-cron-expire-subscriptions.sql` con tu PROJECT_REF y una key (anon o service role) para llamar a la función.

**Validar:** (Opcional) Ver en Supabase → cron.job que el job está programado.

---

### 7. Dominio y enlaces
- [ ] El dominio final (ej. nutriplantpro.com) está asignado en Netlify y usa HTTPS.
- [ ] En PayPal (return URLs, app_base_url en scripts) usas ese dominio si aplica.
- [ ] `app-config.js` o la base URL del frontend apunta al mismo origen en producción (ya suele ser así si publicas en el mismo dominio).

**Validar:** Entras al login por la URL real del dominio y el flujo de login y calculadoras funciona.

---

## Resumen rápido

| Dónde | Qué |
|-------|-----|
| **Supabase** | Tablas, columnas, RLS; secrets del webhook (PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID). |
| **PayPal Developer (Live)** | Client ID, Secret, Plan ID (P-xxxxx), Webhook apuntando a la Edge Function. |
| **Netlify** | PAYPAL_CLIENT_ID, PAYPAL_PLAN_ID (y OpenAI/Supabase si aplica). |
| **login.html** | NUTRIPLANT_REGISTRATION_OPEN = false (registro oculto); cuando quieras abrir, = true. |

Cuando quieras, seguimos paso a paso desde el **Paso 1** y los vamos marcando uno por uno.
