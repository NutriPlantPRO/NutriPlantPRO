# Configuración para producción – NutriPlant PRO

Checklist para subir a producción sin que se escape ningún cable o llave. Todo en un solo lugar.

> **¿No eres experto?** Cuando llegue el momento de subir a producción, abre este archivo y pide ayuda al asistente de Cursor: *"Quiero configurar para producción, ayúdame paso a paso siguiendo CONFIGURACION-PRODUCCION.md"*. El asistente conoce este documento y te irá guiando punto por punto (app-config, PayPal, variables del servidor, etc.) sin que se te escape nada.

---

## En resumen: ¿qué URL (o clave) es de qué?

| Servicio / concepto | Dónde se configura | Para qué sirve |
|---------------------|--------------------|----------------|
| **PayPal** | `paypal_config.json` → `app_base_url` | URL base de tu sitio: a dónde vuelve el usuario tras pagar o cancelar (return/cancel). |
| **Supabase (proyecto)** | `supabase-config.js` → `url` + `anonKey` | Conexión del front a la nube: auth, perfiles, proyectos, reportes. |
| **Supabase (redirects)** | Panel Supabase → Authentication → URL Configuration | A dónde redirige Supabase tras login, registro, confirmar email, recuperar contraseña (tu dominio). |
| **Backend / API de la app** | `app-config.js` → `apiBaseUrl` | Base URL del servidor: chat (asistente), consumo admin. En producción suele ser el mismo dominio (''). |
| **OpenAI** | Servidor: variable `OPENAI_API_KEY` | No es URL: es la API Key para que tu backend hable con OpenAI (chat). |
| **OpenWeather** | Servidor: variable `OPENWEATHER_API_KEY` | No es URL: es la API Key para clima en mapa/ubicación. |
| **Google Maps** | `map.js` → `API_KEY` | No es URL: es la API Key de Maps. En producción restringes la key por “referrer” a tu dominio. |
| **Panel admin** | `admin/index.html` (parámetro `?k=...`) | URL de acceso al panel; el “dominio” es el mismo que el de tu sitio. |

Así sabes de un vistazo: PayPal = retorno de pago; Supabase = nube + redirects de auth; app-config = tu backend/chat; OpenAI/OpenWeather/Maps = keys (no URLs en el código).

---

## 1. URL de la aplicación (un solo archivo)

**Archivo:** `app-config.js`

- **Producción:** deja `apiBaseUrl: ''` (vacío). Así el frontend usará el mismo dominio que el que sirve la app (ej. `https://anutriplant.com`).
- **Desarrollo con `file://`:** pon `apiBaseUrl: 'http://localhost:8000'` para que el chat y el dashboard llamen al backend local.

Con eso se actualizan solos: chat flotante, dashboard (llamadas al asistente) y, si el admin se abre desde el mismo dominio, el consumo de chat.

---

## 2. Servidor (variables de entorno)

El backend lee todo por variables de entorno; no hace falta tocar código.

| Variable | Uso | Producción |
|---------|-----|------------|
| `OPENAI_API_KEY` | API Key de OpenAI para el chat | Tu key real (nunca en el repo) |
| `OPENWEATHER_API_KEY` | Clima en mapa/ubicación | Key de OpenWeatherMap |
| `NUTRIPLANT_CHAT_MONTHLY_LIMIT_USD` | Límite USD/usuario/mes (default 1.0) | Opcional; dejar o ajustar |
| `NUTRIPLANT_CHAT_CACHE_TTL_SECONDS` | Caché de respuestas (default 3600) | Opcional |
| `OPENAI_PRICE_*` | Precios por 1M tokens (solo si cambian) | Opcional |
| `SUPABASE_URL` | Para que el admin pueda cambiar el correo de un usuario en Supabase Auth (mismo valor que en `supabase-config.js`) | Opcional; si no está, el admin solo actualiza perfil, no el correo de acceso |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave **service_role** del proyecto (Settings → API). Solo la usa el servidor para actualizar email en Auth | Opcional; nunca exponer en el frontend |
| `NUTRIPLANT_ADMIN_KEY` | Clave que valida las peticiones del panel admin (por defecto la misma que `?k=...` en la URL del admin) | Opcional; si no está, se usa el valor por defecto del código |

**Editar correo desde el panel admin:**  
Si configuras `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en el servidor, al guardar un usuario con el correo cambiado el backend actualizará también Supabase Auth. Así el usuario podrá iniciar sesión con el nuevo correo. Si no configuras esas variables, el perfil (y localStorage) se actualizan pero el login seguirá siendo con el correo antiguo; en ese caso usa el SQL siguiente.

**Cambiar correo de un usuario desde Supabase (SQL):**  
Cuando editas el correo en el admin pero el servidor no tiene las variables de Supabase, el usuario sigue entrando con el correo viejo. Para que pueda entrar con el nuevo:

1. Entra a **Supabase** → tu proyecto → **SQL Editor**.
2. El **ID del usuario** lo ves en el panel admin (al editar el usuario, el ID es el UUID; si no, en la lista de usuarios).
3. Sustituye en el SQL siguiente `'UUID-DEL-USUARIO'` y `'nuevo@ejemplo.com'` y ejecuta (Run):

```sql
-- Obligatorio: actualiza el correo con el que el usuario inicia sesión (Auth)
UPDATE auth.users
SET email = 'nuevo@ejemplo.com'
WHERE id = 'UUID-DEL-USUARIO';

-- Opcional: si quieres que en public.profiles también figure el nuevo correo
UPDATE public.profiles
SET email = 'nuevo@ejemplo.com', updated_at = now()
WHERE id = 'UUID-DEL-USUARIO';
```

Si ya cambiaste el correo desde el admin, `public.profiles` puede estar ya actualizado; en ese caso solo necesitas el `UPDATE auth.users`.

**Puerto:** por defecto 8000. En producción suele ir detrás de un reverse proxy (Nginx/Apache) que escucha 443 y reenvía a `localhost:8000`.

---

## 3. PayPal

**Archivo:** `paypal_config.json`

| Campo | Qué hacer en producción |
|-------|---------------------------|
| `app_base_url` | **Cambiar** a tu URL pública, ej. `https://anutriplant.com` (sin barra final). |
| `mode` | `"live"` (ya lo tienes para live). |
| `client_id` / `client_secret` | Credenciales **Live** de tu app en developers.paypal.com. |
| `subscription_plan_id` | ID del plan de suscripción en modo Live. |
| `product_id` | ID del producto en Live. |

`paypal_helper.py` usa `app_base_url` para las URLs de retorno/cancelación; no hay que tocar código si cambias solo el JSON.

---

## 4. Supabase

**Archivo:** `supabase-config.js`

| Campo | Producción |
|-------|------------|
| `url` | URL del proyecto (puede ser la misma que en desarrollo si es el mismo proyecto). |
| `anonKey` | Clave anónima pública del proyecto. |
| `enabled` | `true` para usar nube. |

Si en producción usas otro proyecto de Supabase, sustituye solo `url` y `anonKey`.

**Panel de Supabase (dominio de producción):**  
Cuando subas a tu dominio (ya no localhost), entra a **Supabase → tu proyecto → Authentication → URL Configuration** y configura:

- **Site URL:** tu dominio en producción, ej. `https://nutriplantpro.com` (sin barra final).
- **Redirect URLs:** añade al menos:
  - `https://tudominio.com/**`
  - `https://tudominio.com/login.html`

Así el login, registro y “olvidé contraseña” redirigen bien desde la nube a tu sitio en producción y no se quedan en localhost.

**Confirmación de correo (validación al registrarse):**  
Para que al crear cuenta se envíe un correo de verificación y el socio deba confirmar antes de usar la app:

1. En **Supabase → tu proyecto → Authentication → Providers → Email** activa **"Confirm email"**.
2. Con eso, tras registrarse el usuario verá el mensaje *"Revisa tu correo para confirmar tu cuenta"* y no tendrá sesión hasta hacer clic en el enlace del correo.
3. El enlace de confirmación redirige a la URL que configuraste en **URL Configuration** (p. ej. `https://tudominio.com/login.html`). Al abrir ese enlace se crea la sesión y, si aplica, se redirige al dashboard.

Si "Confirm email" está desactivado, la cuenta se crea con sesión inmediata (sin validar correo).

**Límite de correos de Supabase (importante si tendrás muchos usuarios):**  
Supabase limita los correos de autenticación (recuperar contraseña, confirmación de cuenta, magic link, etc.) **por proyecto**, no por usuario. En el plan gratuito suele ser del orden de **pocos envíos por hora** (ej. 2–4/hora) para todo NutriPlant. Si en una hora varios usuarios piden “¿Olvidaste tu contraseña?” o se registran con confirmación, los que pasen del límite no recibirán el correo. **Para muchos usuarios (cientos o miles) ese límite no basta.**

**Solución: SMTP propio.**  
En **Supabase → tu proyecto → Authentication → SMTP** puedes configurar un servidor de correo tuyo (Resend, SendGrid, Mailgun, o el SMTP de tu hosting). Así los correos de “recuperar contraseña”, confirmación, etc. salen por tu cuenta y no dependes del límite de Supabase. Conviene planear esto antes de escalar a muchos usuarios.

---

## 5. Google Maps (opcional)

**Archivo:** `map.js`

- Variable `API_KEY`: sustituir por tu API Key de Google Maps.
- En producción: restringir la key por HTTP referrer a tu dominio (ej. `https://anutriplant.com/*`) en Google Cloud Console.

---

## 6. Panel de administración

- **URL de acceso:** sigue siendo con el parámetro `?k=np_admin_key_...` (el valor está en `admin/index.html`). En producción conviene no exponer ese enlace públicamente.
- **Consumo de chat:** si el admin se abre desde la misma base URL que el backend (ej. `https://anutriplant.com/admin/`), no hay que configurar nada más; el consumo se lee del mismo origen. Si por algún motivo el admin se sirve desde otro dominio, en la consola del navegador puedes definir `window.NUTRIPLANT_CHAT_USAGE_API_BASE = 'https://anutriplant.com'` antes de cargar las estadísticas.

---

## Resumen rápido (no se te escape nada)

1. **`app-config.js`** → `apiBaseUrl: ''` en producción (el front usa el mismo dominio; chat y API apuntan solos).
2. **Servidor** → Definir `OPENAI_API_KEY` y `OPENWEATHER_API_KEY` (y opcionales de chat).
3. **`paypal_config.json`** → **`app_base_url`** a tu dominio HTTPS (ej. `https://nutriplantpro.com`); credenciales y plan en modo Live.
4. **`supabase-config.js`** → Misma URL y anon key (o las del proyecto de producción). No hace falta cambiar la “liga” del proyecto; es la misma nube.
5. **Supabase Dashboard** → Authentication → URL Configuration: **Site URL** y **Redirect URLs** con tu dominio de producción (para que login/registro/recuperar contraseña no usen localhost).
6. **`map.js`** → API Key de Google Maps y restricción por dominio en producción.

Con esto, todo lo que depende del dominio (ligas, redirects, PayPal retorno) queda apuntando a producción; el resto del código ya usa `window.location.origin` o la config centralizada.
