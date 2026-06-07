# Nutri PRO — Conocimiento para ChatGPT Socio (Custom GPT)

**Nutri PRO** es la bóveda técnica privada dentro de **Plan PRO** (Cerebro Digital de Jesús): carpetas, archivos (PDF, Excel, Office, imágenes) y enlaces clasificados. Los apuntes Plan PRO pueden enlazar archivos con rutas cortas 📎 en la libreta.

## Actions API (OpenAPI v2.3+)

| action | Uso |
|--------|-----|
| `nutri_pro_catalog` | Lista carpetas, archivos y enlaces (metadatos, rutas, tamaños). |
| `nutri_pro_search` | Busca por `q` en nombres de archivo, ruta (`short_path`), enlaces, URL. |
| `plan_pro_item` | Detalle de apunte; incluye **`nutri_refs`** (enlaces 📎 a archivos). |
| `plan_pro_search` | Busca apuntes por título/nota (complemento). |

### Parámetros útiles

**nutri_pro_catalog** — `params: {}` o `{ "limit": 200 }`

**nutri_pro_search** — ejemplos:

```json
{ "action": "nutri_pro_search", "params": { "q": "fertirriego" } }
```

```json
{ "action": "nutri_pro_search", "params": { "q": "manual", "kind": "files" } }
```

```json
{ "action": "nutri_pro_search", "params": { "q": "ndvi", "kind": "links", "category": "investigacion" } }
```

```json
{ "action": "nutri_pro_search", "params": { "nutri_file_id": "uuid-del-archivo" } }
```

**plan_pro_item** — ver rutas Nutri en un apunte:

```json
{ "action": "plan_pro_item", "params": { "q": "título del apunte" } }
```

Revisa `item.nutri_refs`: cada entrada tiene `nutri_file_id`, `label`, `short_path` (si el archivo existe).

## Qué SÍ puedes hacer hoy

- Listar qué documentos hay en Nutri PRO (nombre, carpeta, tipo MIME, tamaño).
- Buscar archivos/enlaces por palabra clave.
- Cruzar **apunte ↔ archivo** vía `nutri_refs` en `plan_pro_item`.
- Citar rutas: `Fertirriego/Manual_NPK.pdf` y el `nutri_file_id`.

## Qué NO puedes hacer aún (fase 2)

- Leer el **contenido** dentro de PDF/Excel (tablas, cifras, párrafos).
- Responder “¿cuánto K hay en la celda B12?” sin extracción de texto indexada.

Si el usuario pide eso, indica que el archivo está catalogado pero el texto aún no está indexado; sugiere abrirlo en Plan PRO → Nutri PRO o esperar fase de extracción.

## Clasificación de enlaces

Categorías fijas: nutrición vegetal, agronomía, trabajo, personal, negocio, investigación, herramientas, inglés, escuela, idiomas, finanzas, salud, otro. El usuario puede crear **categorías personalizadas** (se guardan como `custom_nombre`).

## Storage

- Bucket archivos: `plan-pro-nutri-pro` (privado; la API no devuelve URL firmada en fase 1).
- Tablas: `plan_pro_nutri_folders`, `plan_pro_nutri_files`, `plan_pro_nutri_links`.

## Flujo recomendado en chat

1. “¿Qué tengo sobre X?” → `nutri_pro_search` con `q: X`.
2. “¿Qué apuntes hablan de ese PDF?” → `plan_pro_search` + `plan_pro_item` y revisar `nutri_refs`.
3. “Resume mi bóveda” → `nutri_pro_catalog` y agrupa por carpetas/categorías.

## Deploy

Tras cambios en Netlify: reimportar `docs/openapi-nutriplant-admin.json` v2.3.0 en ChatGPT Actions y subir este archivo a **Knowledge**.
