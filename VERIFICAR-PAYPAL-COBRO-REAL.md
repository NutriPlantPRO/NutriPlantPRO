# Verificar PayPal para cobro real (suscripción)

Si al activar la suscripción con PayPal aparece **"No hemos podido configurar pagos con aprobación previa"** o el cobro no se genera, revisa lo siguiente en orden.

---

## 1. Mismo entorno: Client ID y Plan ID

- **Client ID** en `login.html` (`NUTRIPLANT_PAYPAL_CLIENT_ID`) debe ser de la pestaña **Live** en developer.paypal.com.
- **Plan ID** (`NUTRIPLANT_PAYPAL_PLAN_ID`) debe ser un plan creado en **Live** (con `create_live_plan.py` o desde el dashboard Live).
- Si el Client ID es Live pero el Plan ID es de Sandbox (o al revés), PayPal dará error. Crea el plan en Live y pon ese `P-xxxxx` en `login.html`.

**Comprobar:** En https://developer.paypal.com → Apps & Credentials → **Live** → tu app. El Client ID debe coincidir con el de `login.html`. El plan debe haberse creado con `python3 create_live_plan.py` (con `paypal_config.json` en `mode: "live"`).

---

## 2. Plan activo en PayPal

- En la cuenta PayPal **empresa** (la que usa la app), revisa que el plan de suscripción exista y esté **ACTIVE**.
- Si creaste el plan con el script, puedes verificar el Plan ID en la API o en el dashboard de PayPal (según tu cuenta).

---

## 3. Cuenta y tarjeta del usuario que paga

El mensaje "no pudimos configurar pagos con aprobación previa" a veces viene del **pagador**, no del comercio:

- La cuenta PayPal del usuario (o la tarjeta vinculada) puede no permitir pagos recurrentes / aprobación previa.
- **Prueba:** Pide a alguien más que intente suscribirse con su PayPal, o usa otra tarjeta en tu cuenta PayPal.
- En el mensaje, PayPal suele indicar: "Regrese al sitio del comercio y seleccione **otra tarjeta** asociada a su cuenta de PayPal o llame al Servicio de Atención al Cliente".

---

## 4. Return URL y configuración en el código

En `login.html` ya se envían `return_url` y `cancel_url` en `application_context` del botón de suscripción. Si tu app está en **localhost**, PayPal puede aceptarlo; en producción usa tu dominio real (ej. `https://nutriplantpro.com/login.html`).

---

## 5. Probar como usuario real (tu registro de prueba)

Para tener un usuario de prueba y probar el cobro real:

1. Crea una **cuenta nueva** en tu app (Crear Nueva Cuenta) con un correo que no uses en producción.
2. Marca **"Activar suscripción ahora con PayPal"** y Crear Cuenta.
3. Te redirige al modal de PayPal; usa tu cuenta PayPal **real** (o la de otra persona).
4. Si aparece el error de "aprobación previa", prueba con **otra tarjeta** en PayPal o otra cuenta PayPal.
5. Si todo va bien, al aprobar verás el mensaje de suscripción activada y en el dashboard el usuario aparecerá como activo.

---

## Resumen rápido

| Revisión | Acción |
|----------|--------|
| Client ID y Plan ID | Ambos Live; Plan ID = el que devolvió `create_live_plan.py` con `mode: "live"`. |
| Plan activo | Plan creado en Live y en estado ACTIVE. |
| Error "aprobación previa" | Probar con otra tarjeta/cuenta PayPal (lado pagador). |
| login.html | Tener `NUTRIPLANT_PAYPAL_CLIENT_ID` y `NUTRIPLANT_PAYPAL_PLAN_ID` actualizados con valores Live. |

Si tras esto sigue fallando, conviene contactar a PayPal (Atención al Cliente o soporte para desarrolladores) y darles el Plan ID y el Client ID (Live) para que revisen si hay restricciones en la cuenta comercio o en el plan.
