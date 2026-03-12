# Cómo agregar el webhook en PayPal (para que los estados lleguen a tu lista)

Así PayPal notificará a Supabase cuando una suscripción se active, cancele o expire, y tu lista en el admin se actualizará sola.

---

## 1. Tener la URL de tu función en Supabase

La URL del webhook tiene esta forma:

```
https://TU_PROYECTO.supabase.co/functions/v1/paypal-webhook
```

- **TU_PROYECTO** = el "Reference ID" de tu proyecto en Supabase.
- Dónde verlo: **Supabase** → **Project Settings** (engrane) → **General** → **Reference ID**.

Ejemplo: si tu Reference ID es `grbxhxydgaxhpoedbltd`, la URL sería:
`https://grbxhxydgaxhpoedbltd.supabase.co/functions/v1/paypal-webhook`

(La función `paypal-webhook` debe estar desplegada; si no, ver **PASO-A-PASO-PAYPAL-WEBHOOK.md**.)

---

## 2. En PayPal Developer: agregar el webhook

1. Entra a **https://developer.paypal.com**
2. Arriba elige **Live** (no Sandbox).
3. Menú izquierdo: **Apps & Credentials**.
4. En **REST API apps** haz clic en tu app (ej. **Default App**).
5. En la página de la app, baja hasta la sección **Live Webhooks**.
6. Clic en **Add Webhook**.

---

## 3. Rellenar el formulario del webhook

- **Webhook URL:**  
  Pega la URL del paso 1, por ejemplo:  
  `https://grbxhxydgaxhpoedbltd.supabase.co/functions/v1/paypal-webhook`

- **Event types (tipos de evento):**  
  Elige **“Subscribe to individual events”** y marca estos (son los que tu código usa para actualizar estados):

  | Evento en PayPal | Para qué sirve en tu lista |
  |------------------|----------------------------|
  | **Billing subscription created** | Suscripción creada → `pending` |
  | **Billing subscription activated** | Activada (ej. tras trial) → `active` |
  | **Billing subscription cancelled** | Usuario canceló → `cancelled` |
  | **Billing subscription expired** | Expirada → `expired` |
  | **Billing subscription suspended** | Suspendida → `suspended` |

  Si PayPal muestra **“Billing subscription approved”**, también puedes marcarlo (tu código lo mapea a `pending`).

7. Guarda el webhook (**Save**).

---

## 4. Copiar el Webhook ID

Después de guardar, PayPal muestra el **Webhook ID** (algo como `8XY1234567890ABCD`). **Cópialo.**

---

## 5. Poner el Webhook ID en Supabase

La función `paypal-webhook` necesita ese ID para verificar que los avisos vienen de PayPal.

En la terminal, desde la carpeta del proyecto:

```bash
supabase secrets set PAYPAL_WEBHOOK_ID="EL_ID_QUE_COPIASTE"
```

(Sustituye `EL_ID_QUE_COPIASTE` por el Webhook ID del paso 4.)

Si es la primera vez que configuras la función, asegúrate de tener también estos secrets (ver **PASO-A-PASO-PAYPAL-WEBHOOK.md**):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_API_BASE` = `https://api-m.paypal.com`

---

## Resumen

1. URL del webhook = `https://TU_PROYECTO.supabase.co/functions/v1/paypal-webhook`
2. En PayPal: Apps & Credentials → tu app → Live Webhooks → **Add Webhook**.
3. Pegar la URL y suscribir los eventos de **Billing subscription** (created, activated, cancelled, expired, suspended).
4. Guardar y copiar el **Webhook ID**.
5. En Supabase: `supabase secrets set PAYPAL_WEBHOOK_ID="..."`.

A partir de ahí, cuando alguien cancele o expire en PayPal, PayPal enviará el evento a esa URL y tu función actualizará `profiles.subscription_status` en Supabase; tu lista en el admin reflejará los estados al instante.
