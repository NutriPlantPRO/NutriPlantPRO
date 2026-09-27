# PayPal Applicate — cobro único por curso

No es la suscripción PRO ($49 / 5 meses).  
Aquí es **un pago, un curso, de por vida**.

---

## Qué es bueno (cierra esto y no lo reabras)

| Idea | ¿Sí? |
|------|------|
| Un plan PayPal de **$30 que se cobra siempre** | **No.** Eso es rígido. Si el 2º curso vale $40 o $80, tendrías que inventar otro plan. |
| Un **plan de suscripción** por curso (como PRO) | **No.** El alumno pagaría otra vez cada X meses. Applicate es de por vida. |
| Otra app / otras llaves en Netlify | **No.** El paquete de env ya está topado. Misma app Live de NutriPlant. |
| **Un cobro por cada curso**, con el precio de esa ficha | **Sí.** Ese es el camino. |

En admin → **Catálogo de cursos** pones el precio de **ese** curso (`price_usd`).  
PayPal cobra **esa cifra** cuando el alumno pica Comprar en esa ficha.

Si los dos primeros los quieres a **30 USD**, pones `30` en el curso 1 y `30` en el curso 2.  
No es “un cobro de $30 para toda la academia”. Son dos cobros iguales, uno por cada curso.

Más adelante un curso puede ser 30 y otro 80. Misma app de PayPal, mismo botón. Cambia el número en el catálogo.

---

## Lo que NO tocas (ya está de PRO)

- `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` (Netlify + secretos de Supabase)
- `PAYPAL_PLAN_ID` — **solo** la suscripción de $49 / 5 meses. Applicate **no** lo usa.
- La Edge Function `paypal-webhook` y su URL (la misma)

---

## Paso 1 — Precios en el catálogo (tú, en admin)

1. Entra al panel admin (sesión de `admin@nutriplantpro.com`).
2. **🎓 Applicate → Catálogo de cursos**.
3. **Guardar borrador** por cada curso:
   - Título (aunque sea interno: “Excel solución”, “Excel agua/planta”).
   - Precio USD: **30** si así lo quieres, u otro número.
4. **No publiques** hasta que el material esté cargado.

El alumno aún no ve esos borradores. El recuadro vacío sigue.

**Al terminar:** tienes 1 o 2 borradores con precio. Di “listo Paso 1”.

---

## Paso 2 — Eventos de pago único en el webhook que ya tienes

Misma URL de siempre (no crees otro webhook si ya existe el de PRO):

`https://TU_REF.supabase.co/functions/v1/paypal-webhook`

1. Entra a **https://developer.paypal.com** → pestaña **Live**.
2. **Apps & Credentials** → la app **NutriPlant PRO** (la de ahora).
3. Sección **Webhooks** → abre el webhook que ya apunta a esa URL.
4. **Add event types** (o edita) y marca además de los de suscripción:

   - **Checkout order completed** (`CHECKOUT.ORDER.COMPLETED`)
   - **Payment capture completed** (`PAYMENT.CAPTURE.COMPLETED`)

5. Guarda. **No cambia** el Webhook ID. No hay llave nueva en Netlify.

Si PayPal te obliga a “crear otro webhook” en vez de editar: usa **la misma URL**. Anota si te dio un segundo ID; lo vemos juntos antes de tocar secretos.

**Al terminar:** esos dos eventos aparecen en el webhook Live. Di “listo Paso 2”.

---

## Paso 3 — Todavía no cobramos (código)

El botón **Pagar con PayPal** en `/applicate` aún dice “se conecta al lanzar”.  
Eso es a propósito: registro público cerrado, cursos no publicados.

Cuando los dos pasos de arriba estén y quieras **conectar el cobro**, lo hacemos en código:

- Misma app, **orden de un solo pago** (Checkout / `intent=capture`), no `PAYPAL_PLAN_ID`.
- El monto sale de `aplicate_courses.price_usd` (30, 40, el que sea).
- PayPal confirma → fila en `aplicate_purchases` origen `paypal` → el curso se abre de por vida.

Hasta entonces: transferencia por WhatsApp + **Asignar cursos** en admin.

---

## Resumen de una línea

**No armes un producto PayPal de $30.** Arma el precio **en cada curso**. PayPal solo cobra esa cantidad una vez.
