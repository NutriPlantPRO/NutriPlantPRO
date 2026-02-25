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

## Paso 4: Poner Client ID y Plan ID Live en login.html

1. Abre **login.html** en el editor.
2. Busca las líneas (cerca de la línea ~2378):
   - `NUTRIPLANT_PAYPAL_CLIENT_ID = '...'`
   - `NUTRIPLANT_PAYPAL_PLAN_ID = '...'`
3. Sustituye:
   - **NUTRIPLANT_PAYPAL_CLIENT_ID** por tu **Client ID Live** (el mismo que en paypal_config.json).
   - **NUTRIPLANT_PAYPAL_PLAN_ID** por el **Plan ID Live** (el P-xxxxx que dio create_live_plan.py).
4. Guarda el archivo.

**Validación:** Al cargar login y pulsar "Activar con PayPal", la ventana de PayPal debe abrir **paypal.com** (no sandbox.paypal.com).

---

## Paso 5: Producción (cuando subas a tu dominio)

Cuando tu app esté en el dominio real:

1. En **paypal_config.json** pon **app_base_url** con tu URL real, por ejemplo:
   - `"app_base_url": "https://nutriplantpro.com"`
2. Si usas webhooks o return URLs en el backend, asegúrate de que apunten a ese dominio.
3. No subas **paypal_config.json** con el **client_secret** a un repositorio público. Usa variables de entorno o un servidor seguro para el secret.

---

## Resumen rápido

| Dónde              | Qué usar en Live                          |
|--------------------|-------------------------------------------|
| developer.paypal.com | Pestaña **Live** → Client ID y Secret   |
| paypal_config.json | mode: "live", client_id y client_secret Live, app_base_url real |
| create_live_plan.py| Crea producto y plan en Live → Plan ID P-xxxxx |
| login.html         | NUTRIPLANT_PAYPAL_CLIENT_ID y NUTRIPLANT_PAYPAL_PLAN_ID con valores **Live** |

Cuando todo esté en Live, los usuarios verán la pantalla real de PayPal y podrán iniciar sesión con su cuenta PayPal real.
