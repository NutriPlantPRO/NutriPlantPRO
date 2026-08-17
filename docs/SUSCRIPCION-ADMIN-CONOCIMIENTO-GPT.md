# Suscripción NutriPlant PRO — Knowledge GPT Socio (admin / PayPal)

**Uso:** subir en ChatGPT → Configure → **Knowledge**. Pregunta frecuente de Jesús: cuántos usuarios hay, quiénes están enlistados, cuándo pagaron y cuándo les toca.

---

## Cómo consultar (API, mismo turno)

| Pregunta | Action | params |
|----------|--------|--------|
| ¿Cuántos usuarios? ¿Lista? ¿Quién pagó / le toca pagar? | **`subscription_roster`** | `{}` |
| Totales + vencidos / próximos 30 días (sin lista larga) | `admin_stats` | `{}` |
| Un usuario concreto | `user_summary` | `{ "q": "nombre o email" }` |
| Filtro | `subscription_roster` | `status`, `overdue`, `due_soon`, `days_ahead`, `q` |

Siempre `{"action":"subscription_roster","params":{}}` — no llames `user_summary` uno por uno. No uses Knowledge para inventar fechas.

**Cómo responder:** empieza con `total_users`, `billing.overdue_count` y `billing.due_next_30_days_count`. Luego tabla:

| Nombre | Estado | Último pago | Próximo pago |
|--------|--------|-------------|--------------|
| … | active / pending / cancelled | `last_payment_date` | `next_payment_date` |

Fechas **YYYY-MM-DD tal cual** vienen de Supabase. `null` / vacío = **«sin fecha»**. **PROHIBIDO** inventar, redondear o sumar 5 meses.

---

## Plan

- **$49 USD cada 5 meses** (ciclo PayPal).
- Prueba gratis ~**10 días** al inicio (antes del primer cobro).

## Fechas en perfil / admin (no inventar)

| Campo | Qué es |
|--------|--------|
| `last_payment_date` (**Último pago**) | Cobro **real** vía webhook PayPal (venta / `last_payment` de la suscripción). |
| `next_payment_date` (**Próximo pago**) | Fecha de próximo cobro de PayPal (`next_billing_time`). En el plan NutriPlant = **cobro real + 5 meses**. |
| `paid_cycles` | Ciclos cobrados reales (`paypal_paid_cycles`). No estimar por meses entre fechas. |

- Si PayPal no envía `next_billing_time`, el webhook completa con la lógica del ciclo de **5 meses**. El GPT **no** debe repetir ese cálculo: lee el campo.
- El **admin solo muestra** lo guardado en Supabase; no recalcula a ojo al listar usuarios.
- **Cancelación:** desde PayPal (Pagos automáticos / Automatic Payments), no desde la app. Cancelado por PayPal = acceso hasta `next_payment_date`. Cancelado por admin = corte inmediato.

## Contabilidad de ingresos (panel admin)

- Ciclos cobrados reales: `paypal_paid_cycles` y eventos `paypal_payment_events` (no estimar por meses entre fechas).
- Usuarios con `exclude_from_revenue` (**No suma**): **no entran** en totales de ingresos USD del admin (aunque paguen o estén activos).
- Totales: histórico (todos los años) · año en curso · año pasado.
- `admin_stats.billing` / `subscription_roster.billing`: `overdue` (próximo pago ya pasó) y `due_next_30_days`.
