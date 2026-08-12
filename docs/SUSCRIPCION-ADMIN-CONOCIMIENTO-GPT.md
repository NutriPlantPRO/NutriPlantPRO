# Suscripción NutriPlant PRO — Knowledge GPT Socio (admin / PayPal)

**Uso:** subir en ChatGPT → Configure → **Knowledge** (archivo aparte; **no** va dentro de HERRAMIENTAS gratuitas).

---

## Plan

- **$49 USD cada 5 meses** (ciclo PayPal).
- Prueba gratis ~**10 días** al inicio (antes del primer cobro).

## Fechas en perfil / admin (no inventar)

| Campo | Qué es |
|--------|--------|
| `last_payment_date` (**Último pago**) | Cobro **real** vía webhook PayPal (venta / `last_payment` de la suscripción). |
| `next_payment_date` (**Próximo pago**) | Fecha de próximo cobro de PayPal (`next_billing_time`). En el plan NutriPlant = **cobro real + 5 meses**. |

- Si PayPal no envía `next_billing_time`, el webhook completa con la lógica del ciclo de **5 meses**.
- El **admin solo muestra** lo guardado en Supabase; no recalcula a ojo al listar usuarios.
- **Cancelación:** desde PayPal (Pagos automáticos / Automatic Payments), no desde la app.

## Contabilidad de ingresos (panel admin)

- Ciclos cobrados reales: `paypal_paid_cycles` y eventos `paypal_payment_events` (no estimar por meses entre fechas).
- Usuarios con `exclude_from_revenue` (**No suma**): **no entran** en totales de ingresos USD del admin (aunque paguen o estén activos).
- Totales: histórico (todos los años) · año en curso · año pasado.
