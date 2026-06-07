# Plan PRO — Acciones GPT (asistente personal)

OpenAPI **v2.3.0** · Misma función `nutriplantAdminQuery` · Solo usuario admin (RLS). Nutri PRO: `nutri_pro_catalog`, `nutri_pro_search`; `plan_pro_item` incluye `nutri_refs`.

## Dos semáforos

| Dónde | API | En el portal |
|--------|-----|----------------|
| **Apunte entero** | `priority` + `due_at` | Pastilla Objetivo bajo el título |
| **Dentro de la nota** | `[[sem:YYYY-MM-DD:media]]` en `note` / `append_note`, o `append_due_marker` | Chip 🚦 como en la libreta |

Tras guardar, `plan_pro_item` devuelve `semaforos_en_nota` si el chip se insertó bien.

## Herramientas de la libreta (en `note` / `append_note`)

| Toolbar | Token / sintaxis Socio | Ejemplo |
|---------|------------------------|---------|
| 🚦 **Semáforo interno** (chip fecha+prio en texto) | `[[sem:2026-05-27:media]]` o `append_due_marker` | Aparece en `semaforos_en_nota` |
| ⚠︎ Importante | `[[warn]]` | **No** es semáforo |
| ★ Destacado | `[[star]]` | **No** es semáforo — no confundir con 🚦 |
| **B** negrita | `**texto**` o `[[b]]texto[[/b]]` | `**urgente**` |
| *I* cursiva | `*texto*` o `[[i]]texto[[/i]]` | |
| U subrayado | `__texto__` o `[[u]]texto[[/u]]` | |
| S tachado | `~~texto~~` o `[[s]]texto[[/s]]` | |
| Color | `[[color:blue]]texto[[/color]]` | blue, green, red, black, gray, yellow, purple |
| Peq–XL | `[[size:lg]]texto[[/size]]` | sm, md, lg, xl |
| Título | `## texto` o `[[h2]]texto[[/h2]]` | línea sola |
| Sub | `### texto` o `[[h3]]texto[[/h3]]` | |
| • Lista | líneas `- item` | bloque con `-` |
| 1. Lista | líneas `1. item` | |
| Diagrama | `[[diagram]]` + líneas debajo | |
| 🖼 Imagen | **NO** — solo manual en portal | |

## Leer

| action | Uso |
|--------|-----|
| `plan_pro_catalog` | Pilares (áreas) y ramas (categorías) con `id` |
| `plan_pro_day` | Pendientes con `due_on`: `2026-05-28` |
| `plan_pro_week` | Ventana de días (`days_ahead`, default 7) |
| `plan_pro_search` | `q` texto en título/nota/tags |
| `plan_pro_item` | Detalle: `item_id` o `q`; incluye **`nutri_refs`** (rutas 📎 a Nutri PRO) |

## Nutri PRO (bóveda archivos/enlaces)

| action | Uso |
|--------|-----|
| `nutri_pro_catalog` | Carpetas, archivos, enlaces (metadatos y `short_path`) |
| `nutri_pro_search` | `q` texto; opcional `kind` (all\|files\|links), `folder_id`, `category`, `nutri_file_id` |

Ver `docs/NUTRI-PRO-CONOCIMIENTO-GPT.md`.

## Escribir (cerebro digital)

| action | Campos clave |
|--------|----------------|
| `plan_pro_create` | **title** (obligatorio), **category_id** (recomendado, de `plan_pro_catalog`) o category_title ("333"); area_slug opcional si ya envías category_id; note, priority, due_at |
| `plan_pro_update` | **item_id** o **q**, luego: title, note, append_note, **append_due_marker**, priority, due_at, … |

## Ejemplos de chat

1. «¿Qué tengo pendiente el 28 de mayo?»  
   → `{"action":"plan_pro_day","params":{"due_on":"2026-05-28"}}`

2. «Agrega: llamar distribuidor HiTec, prioridad alta, viernes 28 may, pilar Yara, nota: cerrar pedido Q2»  
   → `plan_pro_create` con title, area_slug `yara` (o el slug real), priority alta, due_at, note

3. «Al apunte de HiTec añade semáforo media 26 may en la nota»  
   → `plan_pro_update` `q`: "HiTec", `append_due_marker`: `{"due_at":"2026-05-26","priority":"media"}`  
   o `append_note`: "Seguimiento [[sem:2026-05-26:media]]"

4. «Al apunte de HiTec añade nota: confirmar precio lista»  
   → `plan_pro_update` con `q`: "HiTec", `append_note`: "..."

## Después del deploy

1. Reimportar `docs/openapi-nutriplant-admin.json` en ChatGPT Actions.  
2. Actualizar Instructions (`CHATGPT-SOCIO-INSTRUCCIONES-COMPLETAS.md` bloque INICIO–FIN).  
3. Probar: `describe_api` debe listar `plan_pro_create` y `plan_pro_update`.
