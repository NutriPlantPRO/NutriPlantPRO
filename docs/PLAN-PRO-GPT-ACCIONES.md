# Plan PRO — Acciones GPT (asistente personal)

OpenAPI **v2.0.0** · Misma función `nutriplantAdminQuery` · Solo usuario admin (RLS).

## Leer

| action | Uso |
|--------|-----|
| `plan_pro_catalog` | Pilares (áreas) y ramas (categorías) con `id` |
| `plan_pro_day` | Pendientes con `due_on`: `2026-05-28` |
| `plan_pro_week` | Ventana de días (`days_ahead`, default 7) |
| `plan_pro_search` | `q` texto en título/nota/tags |
| `plan_pro_item` | Detalle: `item_id` o `q` |

## Escribir (cerebro digital)

| action | Campos clave |
|--------|----------------|
| `plan_pro_create` | **title** (obligatorio), **category_id** (recomendado, de `plan_pro_catalog`) o category_title ("333"); area_slug opcional si ya envías category_id; note, priority, due_at |
| `plan_pro_update` | **item_id** o **q**, luego: title, note, append_note, priority, due_at, next_action, status, close:true, reopen:true |

## Ejemplos de chat

1. «¿Qué tengo pendiente el 28 de mayo?»  
   → `{"action":"plan_pro_day","params":{"due_on":"2026-05-28"}}`

2. «Agrega: llamar distribuidor HiTec, prioridad alta, viernes 28 may, pilar Yara, nota: cerrar pedido Q2»  
   → `plan_pro_create` con title, area_slug `yara` (o el slug real), priority alta, due_at, note

3. «Al apunte de HiTec añade nota: confirmar precio lista»  
   → `plan_pro_update` con `q`: "HiTec", `append_note`: "..."

## Después del deploy

1. Reimportar `docs/openapi-nutriplant-admin.json` en ChatGPT Actions.  
2. Actualizar Instructions (`CHATGPT-SOCIO-INSTRUCCIONES-COMPLETAS.md` bloque INICIO–FIN).  
3. Probar: `describe_api` debe listar `plan_pro_create` y `plan_pro_update`.
