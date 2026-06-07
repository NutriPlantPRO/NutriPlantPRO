# Nutri PRO — Conocimiento para ChatGPT Socio (Custom GPT)

**Nutri PRO** es la bóveda técnica privada dentro de **Plan PRO** (Cerebro Digital de Jesús): carpetas, archivos (PDF, Excel, Office, imágenes) y enlaces clasificados. Los apuntes Plan PRO pueden enlazar archivos con rutas cortas 📎 en la libreta.

## Actions API (OpenAPI v2.4+)

| action | Uso |
|--------|-----|
| `nutri_pro_catalog` | Lista carpetas, archivos y enlaces. En archivos: `extract_status`, `text_indexed`, `text_char_count`. |
| `nutri_pro_search` | Busca por `q` en nombres, rutas **y texto indexado** (`matched_in_content`). |
| `nutri_pro_file_text` | Lee fragmento del texto extraído de un archivo (`nutri_file_id`). |
| `plan_pro_item` | Detalle de apunte; incluye **`nutri_refs`** (enlaces 📎 a archivos). |
| `plan_pro_search` | Busca apuntes por título/nota (complemento). |

### Parámetros útiles

**nutri_pro_catalog** — `params: {}` o `{ "limit": 200 }`

**nutri_pro_search** — ejemplos:

```json
{ "action": "nutri_pro_search", "params": { "q": "fertirriego" } }
```

```json
{ "action": "nutri_pro_search", "params": { "q": "potasio", "kind": "files" } }
```

```json
{ "action": "nutri_pro_search", "params": { "nutri_file_id": "uuid-del-archivo" } }
```

**nutri_pro_file_text** — leer contenido:

```json
{ "action": "nutri_pro_file_text", "params": { "nutri_file_id": "uuid", "max_chars": 12000 } }
```

Paginación: `offset` (siguiente trozo si `has_more` es true).

**plan_pro_item** — ver rutas Nutri en un apunte:

```json
{ "action": "plan_pro_item", "params": { "q": "título del apunte" } }
```

## Formatos con texto indexado (Fase 2)

| Formato | Indexación |
|---------|------------|
| PDF | ✅ texto (no OCR si es escaneado) |
| Word `.docx` | ✅ |
| Excel `.xlsx`, `.xls`, `.csv` | ✅ (hojas como CSV en texto) |
| PowerPoint `.pptx` | ✅ (texto de diapositivas) |
| `.txt`, `.rtf` | ✅ |
| OpenDocument `.odt`, `.ods`, `.odp` | ✅ |
| Word `.doc`, PowerPoint `.ppt` (antiguos) | ❌ — guardar como docx/pptx |
| Imágenes (png, jpg, etc.) | ❌ — OCR en fase posterior |

Tras subir en Plan PRO → Nutri PRO, la indexación corre en segundo plano (unos segundos).

## Qué SÍ puedes hacer hoy

- Listar documentos (nombre, carpeta, si tiene texto indexado).
- Buscar por palabra en **nombre o contenido**.
- Leer fragmentos con `nutri_pro_file_text` y citar `short_path`.
- Cruzar apunte ↔ archivo vía `nutri_refs` en `plan_pro_item`.
- Responder preguntas sobre tablas Excel o párrafos PDF **si** `text_indexed` es true.

## Qué NO puedes hacer aún

- OCR en imágenes o PDF escaneado sin capa de texto.
- Leer `.doc` / `.ppt` binarios antiguos (sugerir re-guardar como docx/pptx).
- Abrir URL firmada del binario (solo texto en Supabase).

Si `extract.status` es `skipped` o `missing`, explica el motivo (`error_message`) y sugiere re-subir o convertir formato.

## Clasificación de enlaces

Categorías fijas: nutrición vegetal, agronomía, trabajo, personal, negocio, investigación, herramientas, inglés, escuela, idiomas, finanzas, salud, otro. Categorías personalizadas: `custom_nombre`.

## Storage y tablas

- Bucket: `plan-pro-nutri-pro` (privado).
- Tablas: `plan_pro_nutri_folders`, `plan_pro_nutri_files`, `plan_pro_nutri_links`, `plan_pro_nutri_file_extracts`.

## Flujo recomendado en chat

1. “¿Qué tengo sobre X?” → `nutri_pro_search` con `q: X`.
2. “¿Qué dice el PDF/Excel sobre Y?” → search → `nutri_pro_file_text` con el `nutri_file_id`.
3. “¿Qué apuntes enlazan ese archivo?” → `plan_pro_item` / `plan_pro_search` + `nutri_refs`.
4. “Resume mi bóveda” → `nutri_pro_catalog`.

## Deploy

1. SQL: `supabase-plan-pro-nutri-pro-extracts.sql` en Supabase.
2. Deploy Netlify.
3. Reimportar `docs/openapi-nutriplant-admin.json` **v2.4.0** en ChatGPT Actions.
4. Subir este archivo a **Knowledge**.
