# Pasar PayPal a Real (Live) — NutriPlant PRO

Sigue estos pasos en orden para que los usuarios paguen con sus cuentas reales de PayPal (no sandbox).

---

## Paso 1: Credenciales LIVE en PayPal

1. Entra a **https://developer.paypal.com** e inicia sesión con tu cuenta PayPal real.
2. Menú **Apps & Credentials** (o **Aplicaciones y credenciales**).
3. Arriba verás pestañas **Live** y **Sandbox**. Selecciona **Live**.
4. En "REST API apps":
   - Si ya tienes una app Live, ábrela y anota **Client ID** y **Secret** (Show).
   - Si no, pulsa **Create App** → pon nombre (ej: NutriPlant PRO) → Create. Copia **Client ID** y **Secret**.

**Validación:** Tienes un Client ID y un Secret que dicen "Live" o que salen en la pestaña Live.

---

## Paso 2: Configurar paypal_config.json para Live

1. Abre en tu proyecto el archivo **paypal_config.json**.
2. Sustituye o asegura:
   - **client_id**: el Client ID **Live** (no el de Sandbox).
   - **client_secret**: el Secret **Live**.
   - **mode**: debe ser exactamente **"live"** (no "sandbox").
   - **app_base_url**: tu dominio real, por ejemplo **"https://nutriplantpro.com"** (sin barra al final).  
     Mientras sigas probando en tu PC puedes dejar `http://localhost:8000` y cambiarlo cuando subas a producción.
3. Guarda el archivo.

**Validación:** En el archivo se ve `"mode": "live"` y el client_id es el de la pestaña Live.

---

## Paso 3: Crear producto y plan en PayPal Live

1. Abre una terminal en la carpeta del proyecto (donde está `paypal_config.json`).
2. Ejecuta:
   ```bash
   python3 create_live_plan.py
   ```
3. Si todo va bien verás algo como:
   - `Producto creado (Live): PROD-xxxxx`
   - `Plan creado (Live): P-xxxxx`
4. El script te mostrará el **Plan ID** (empieza por `P-`) y te recordará actualizar `login.html` y `paypal_config.json`.

Opcional: en **paypal_config.json** puedes poner también:
- **product_id**: el `PROD-xxxxx` que imprimió el script.
- **subscription_plan_id**: el `P-xxxxx` que imprimió el script.

**Validación:** Tienes un Plan ID Live (P-xxxxx) anotado.

---

## Paso 4: Producción en Netlify (dominio) — variables de entorno

En el sitio desplegado (tu dominio), el login **no** usa valores hardcodeados: pide Client ID y Plan ID a la API. Configura en **Netlify**:

1. Netlify → tu sitio → **Site configuration** → **Environment variables**.
2. Añade:
   - **PAYPAL_CLIENT_ID** = tu Client ID **Live** (el de developer.paypal.com → Live).
   - **PAYPAL_PLAN_ID** = tu Plan ID Live (el `P-xxxxx` que dio create_live_plan.py).
3. Guarda y haz un **redeploy** del sitio para que las variables se apliquen.

**Local / pruebas:** En localhost el login usa el fallback **sandbox** (valores en login.html). No hace falta poner estas variables en Netlify para probar en tu PC.

**Validación:** En tu dominio, al pulsar "Activar con PayPal" debe abrir **paypal.com** (no sandbox.paypal.com) y el cobro debe ser real.

---

## Paso 5: Webhook y Secret en Supabase

El **Secret** de PayPal y el **Webhook ID** no van en Netlify. Van en **Supabase** (Edge Function que recibe el webhook):

1. Supabase → tu proyecto → **Project Settings** → **Edge Functions** → **Secrets** (o env).
2. Define:
   - **PAYPAL_CLIENT_ID** = mismo Client ID Live.
   - **PAYPAL_CLIENT_SECRET** = Secret Live (nunca en el frontend).
   - **PAYPAL_WEBHOOK_ID** = ID del webhook que creaste en developer.paypal.com para la URL de tu función (ej. `https://xxx.supabase.co/functions/v1/paypal-webhook`).

Así el webhook verifica la firma y actualiza `profiles` (subscription_status, etc.) cuando el usuario activa, cancela o expira en PayPal.

---

## Paso 6: Dominio y return URLs

1. En **paypal_config.json** (si lo usas para scripts) pon **app_base_url** con tu URL real, ej. `https://nutriplantpro.com`.
2. En PayPal Developer → tu app Live → **Webhooks**, la URL del webhook debe ser la de Supabase (no Netlify).

---

## Resumen rápido

| Dónde                | Qué usar en Live |
|----------------------|------------------|
| developer.paypal.com | Pestaña **Live** → Client ID, Secret; crear producto/plan → Plan ID P-xxxxx |
| **Netlify** (env vars) | **PAYPAL_CLIENT_ID**, **PAYPAL_PLAN_ID** (para el login en tu dominio) |
| **Supabase** (Edge Function secrets) | **PAYPAL_CLIENT_ID**, **PAYPAL_CLIENT_SECRET**, **PAYPAL_WEBHOOK_ID** (para el webhook) |
| login.html (local)   | Fallback sandbox si /api/paypal-config no está o falla (localhost) |

Cuando todo esté en Live, en tu dominio los usuarios verán la pantalla real de PayPal y podrán pagar con su cuenta real.
