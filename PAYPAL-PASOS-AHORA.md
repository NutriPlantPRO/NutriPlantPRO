# PayPal Live — Pasos a hacer ahora (en orden)

Sigue estos pasos **uno por uno**. Cuando termines uno, avisa y pasamos al siguiente.

---

## Paso A — Credenciales y plan en PayPal Developer

1. Entra a **https://developer.paypal.com** e inicia sesión con tu cuenta PayPal real.
2. Arriba elige la pestaña **Live** (no Sandbox).
3. Menú **Apps & Credentials**.
4. En "REST API apps":
   - Si ya tienes una app Live (ej. NutriPlant PRO), ábrela.
   - Si no, **Create App** → nombre "NutriPlant PRO" → Create.
5. Anota:
   - **Client ID** (cópialo).
   - **Secret** → Show → cópialo y guárdalo en un lugar seguro.

6. **Plan de suscripción (cada 5 meses):**
   - Si ya tienes un plan Live creado, anota su **Plan ID** (empieza por `P-`, ej. `P-1AB23456...`).
   - Si **no** tienes plan Live:
     - En tu proyecto necesitas el archivo **paypal_config.json** con `"mode": "live"`, `client_id` y `client_secret` Live.
     - En terminal: `python3 create_live_plan.py` (desde la carpeta del proyecto).
     - El script te dará el **Plan ID** (P-xxxxx); anótalo.

**Al terminar:** Debes tener anotados: **Client ID Live**, **Secret Live**, **Plan ID Live (P-xxxxx)**.  
No los pegues aquí; solo di "listo Paso A" y seguimos.

---

## Paso B — Supabase: Edge Function y URL del webhook

1. En **Supabase** → tu proyecto NutriPlantPRO → **Edge Functions**.
2. Si la función **paypal-webhook** no está desplegada:
   - En tu PC, en la carpeta del proyecto, despliega con Supabase CLI:
     ```bash
     supabase functions deploy paypal-webhook
     ```
   - O despliega desde el Dashboard si tu flujo es por ahí.
3. Copia la **URL** de la función. Será algo como:
   - `https://grbxhxydgaxhpoedbltd.supabase.co/functions/v1/paypal-webhook`
   - (sustituye por tu project ref si es distinto).
4. En Supabase → **Project Settings** → **Edge Functions** → **Secrets** (o Environment variables):
   - Añade:
     - `PAYPAL_CLIENT_ID` = (el Client ID Live del Paso A).
     - `PAYPAL_CLIENT_SECRET` = (el Secret Live del Paso A).
   - **PAYPAL_WEBHOOK_ID** lo dejamos para el Paso D.

**Al terminar:** Tienes la URL del webhook anotada y los secrets Client ID y Secret en Supabase. Di "listo Paso B".

---

## Paso C — Registrar el webhook en PayPal

1. En **developer.paypal.com** → **Apps & Credentials** → tu app **Live**.
2. Baja hasta la sección **Webhooks** → **Add Webhook**.
3. **Webhook URL:** pega la URL de tu Edge Function (la del Paso B), ej.  
   `https://TU_REF.supabase.co/functions/v1/paypal-webhook`
4. **Event types** — suscríbete al menos a:
   - Billing subscription activated  
   - Billing subscription cancelled  
   - Billing subscription suspended  
   - Billing subscription expired  
   (Opcional: Billing subscription created, Billing subscription updated.)
5. Guarda. PayPal te mostrará un **Webhook ID** (un valor alfanumérico). **Cópialo.**

**Al terminar:** Tienes el **Webhook ID** copiado. Di "listo Paso C".

---

## Paso D — Poner el Webhook ID en Supabase

1. En **Supabase** → **Project Settings** → **Edge Functions** → **Secrets**.
2. Añade o edita:
   - `PAYPAL_WEBHOOK_ID` = (el Webhook ID que copiaste en el Paso C).
3. Guarda.

**Al terminar:** Los tres secrets de PayPal en Supabase están listos (Client ID, Secret, Webhook ID). Di "listo Paso D".

---

## Paso E — Netlify: variables para el login (tu dominio)

1. En **Netlify** → tu sitio → **Site configuration** → **Environment variables**.
2. Añade:
   - **Key:** `PAYPAL_CLIENT_ID` → **Value:** (el mismo Client ID Live del Paso A).
   - **Key:** `PAYPAL_PLAN_ID` → **Value:** (el Plan ID Live, ej. P-xxxxx, del Paso A).
3. Guarda.
4. Haz un **Redeploy** del sitio (Deploys → Trigger deploy → Deploy site) para que tome las variables.

**Al terminar:** En tu dominio, cuando abras registros y un usuario pulse "Activar con PayPal", se usará el Client ID y Plan ID Live. Di "listo Paso E".

---

## Resumen

| Paso | Dónde | Qué haces |
|------|--------|-----------|
| A | PayPal Developer (Live) | Client ID, Secret, Plan ID (P-xxxxx) |
| B | Supabase | Desplegar paypal-webhook + secrets PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET; anotar URL |
| C | PayPal Developer → Webhooks | Añadir webhook con la URL de B; copiar Webhook ID |
| D | Supabase Secrets | Añadir PAYPAL_WEBHOOK_ID |
| E | Netlify Env Vars | PAYPAL_CLIENT_ID, PAYPAL_PLAN_ID + redeploy |

Cuando quieras, empieza por el **Paso A** y cuando lo tengas dime "listo Paso A" para seguir con B.
