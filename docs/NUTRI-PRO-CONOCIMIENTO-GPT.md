# Nutri PRO — Conocimiento ChatGPT Socio (OpenAPI v2.10)

## Acción principal: `nutri_pro_ask`

Para **cualquier pregunta sobre documentos** (PDF, Excel, Word, cifras, tablas):

```json
{ "action": "nutri_pro_ask", "params": { "q": "¿Cuánto potasio en el Excel de costos?" } }
```

### Respuesta Fase 4 (usa esto para responder)

| Campo | Uso |
|-------|-----|
| `unified_citations[]` | **Cita principal.** Cada `line`: `📝 Apunte ↔ 📎 ruta: «fragmento»` |
| `sources[]` | Detalle por archivo (`open_url`, snippets, `description`, relevance_score) |
| `linked_apuntes` | Apuntes Plan PRO con 📎 a esos archivos |
| `related_apuntes` | Apuntes que mencionan el tema sin enlace directo |
| `link_gap_suggestions` | «Este apunte no tiene 📎 pero hay 3 PDFs…» — **dilo al usuario** |
| `suggestions` | Notas generales |

### Formato de respuesta al usuario (Socio)

Integra en una sola respuesta:

1. **Fragmento citado** del documento (`unified_citations.line`)
2. **Apunte enlazado** si existe (`linked_apuntes`)
3. **Link permanente** si Jesús quiere abrir el archivo (`sources[].open_url`)
4. **Sugerencia de enlace** si `link_gap_suggestions` no está vacío

Ejemplo de tono:

> En 📎 Fertirriego/costos.xlsx aparece: «Potasio K2O 120 ppm…». Tu apunte «Costos temporada» ya lo enlaza.  
> *(o)* El apunte «Fertirriego sandía» habla del tema pero no tiene archivo 📎; hay 2 Excel en Nutri PRO que podrías enlazar.

## Links de archivos (`open_url`)

Cada archivo en `nutri_pro_catalog` / `nutri_pro_search` / `nutri_pro_ask` / `nutri_pro_file_text` incluye:

| Campo | Uso |
|-------|-----|
| `open_url` | Link **permanente** `https://nutriplantpro.com/api/nutri-pro-file-open?fid=…&t=…` — compártelo para que Jesús abra el archivo |
| `nutri_file_id` | UUID para leer/reindexar |
| `text_indexed` | Si hay texto útil en la bóveda |
| `reindex_hint` | Si no está indexado: qué hacer |

**ChatGPT no descarga el PDF binario.** Lee el **texto indexado**. Si Jesús pega un `open_url`, úsalo en `nutri_pro_file_text` o `nutri_pro_reindex` (aceptan `open_url`).

```json
{ "action": "nutri_pro_file_text", "params": { "open_url": "https://nutriplantpro.com/api/nutri-pro-file-open?fid=…&t=…" } }
```

## Reindexar / OCR: `nutri_pro_reindex`

Cuando `text_indexed=false`, el texto está vacío/pobre, o es PDF escaneado/imagen:

```json
{ "action": "nutri_pro_reindex", "params": { "nutri_file_id": "UUID", "mode": "text" } }
```

| mode | Cuándo |
|------|--------|
| `text` | PDF/Office con texto seleccionable (default) |
| `ocr` | PDF escaneado, imagen, cédula, foto de documento |

Luego: `nutri_pro_file_text` o `nutri_pro_ask` con la misma pregunta.

## Corregir texto del MISMO archivo: `nutri_pro_set_text`

Si el OCR/indexado tiene errores y Jesús te da el texto corregido (o lo corriges en el chat):

```json
{
  "action": "nutri_pro_set_text",
  "params": {
    "nutri_file_id": "UUID-del-JPG-o-PDF-original",
    "content": "texto corregido completo…"
  }
}
```

**PROHIBIDO** usar `nutri_pro_save` para “corregir” OCR: eso crea **otro** archivo.  
`nutri_pro_set_text` actualiza el indexado del archivo original (como «Pegar texto indexado» en Plan PRO).

## Enlaces guardados (🔗 pestaña Enlaces)

Además de archivos, Nutri PRO guarda **links** con título, **descripción**, URL, categoría y carpeta.

**Socio NO abre la URL web de un enlace guardado.** Usa solo lo que Jesús guardó (título, descripción, categoría, `folder_path`).  
*(Distinto de `open_url` de archivos de la bóveda.)*

| Pregunta del usuario | Acción |
|----------------------|--------|
| «¿Qué enlaces tengo?» / inventario | `nutri_pro_catalog` → array `links[]` |
| «¿Tengo algún link sobre X?» | `nutri_pro_search` con `q` |
| Solo enlaces (sin archivos) | `nutri_pro_search` con `kind: "links"` |
| «¿Qué dice el PDF / Excel?» | `nutri_pro_ask` (archivos indexados, **no** links web) |
| «Reindexa / OCR este archivo» | `nutri_pro_reindex` |
| «Corrige el texto indexado de ESTE archivo» | `nutri_pro_set_text` (mismo `nutri_file_id`, NO `nutri_pro_save`) |

### Campos de cada enlace (`links[]`)

| Campo | Uso |
|-------|-----|
| `title` | Nombre del enlace |
| `description` | **Principal para localizar** — Jesús describe tema, cultivo, para qué sirve |
| `url` | Dirección — cítala tal cual al responder |
| `category` / `category_label` | Tipo (nutrición, agronomía, personal, otro…) |
| `folder_path` | Ruta en carpetas Nutri PRO |

### Ejemplos

```json
{ "action": "nutri_pro_search", "params": { "q": "marca nutriplant" } }
```

```json
{ "action": "nutri_pro_search", "params": { "q": "fertirriego", "kind": "links" } }
```

### Tono al responder enlaces

> En 🔗 Personal / Fertirriego tienes «Guía K en sandía» — *descripción que guardó Jesús*. URL: https://…

Prioriza coincidencias en `description` y `title`. Si no hay enlace relevante, dilo; no inventes URLs.

## Guardar en Nutri PRO: `nutri_pro_save`

Cuando Jesús pida **guardar un reporte**, resumen o documento en una carpeta:

1. Opcional: `nutri_pro_catalog` para ver rutas (`work / Personal`, etc.).
2. Redacta el contenido (markdown o texto plano).
3. Llama `nutri_pro_save` con `content`, `filename` (`.md` o `.txt` indexan bien) y `folder_path` o `folder_title`.

```json
{
  "action": "nutri_pro_save",
  "params": {
    "folder_path": "work / Personal",
    "filename": "informe-investigacion-banano.md",
    "title": "Informe investigación banano",
    "description": "Resumen Socio ChatGPT junio 2026",
    "content": "# Informe\n\n..."
  }
}
```

Respuesta útil: `short_path`, `nutri_file_id`, `text_indexed`, `folder_path`. Confirma al usuario que ya está en la nube y en Plan PRO → Nutri PRO.

**Word (.docx):** si solo envías texto, el servidor guarda como `.txt` indexable.

### ⚠️ Adjunto PDF/Excel en ChatGPT (muy importante)

**ChatGPT Actions NO puede enviar el archivo adjunto en binario real** a la API. Si mandas `content_base64` inventado o truncado, Supabase guardará un archivo corrupto (p. ej. PDF de 12 bytes, `Invalid PDF structure`).

| Lo que pide Jesús | Qué debes hacer |
|-------------------|-----------------|
| Guardar **contenido** del PDF adjunto | Lee el PDF en el chat → `nutri_pro_save` con **`content`** + `filename` **`.md` o `.txt`** |
| Guardar el **PDF original** tal cual | **No uses** `nutri_pro_save` con `.pdf`. Dile: subir en **Plan PRO → chat Socio → 📎** o manual en Nutri PRO |
| Reporte que tú generas | `content` + `.md` — perfecto |

**Nunca:** `filename: "algo.pdf"` + `content` con texto suelto, ni `content_base64` si no tienes el binario completo verificado.

Si la API responde `chatgpt_attachment_limit: true`, explica el límite y ofrece guardar versión `.md` indexada o subir original en Plan PRO.

## Subir archivo ORIGINAL (PDF, Excel…): `nutri_pro_upload_link`

Cuando Jesús **adjunta un archivo** y quiere el **binario real** en Nutri PRO:

1. `nutri_pro_upload_link` con `folder_path` o `folder_title` (y opcional `title`, `suggested_filename`).
2. Devuelve **`upload_url`** — envías ese enlace tal cual (cópialo en el chat).
3. Jesús abre el enlace en **celular o PC**, inicia sesión NutriPlant admin si hace falta, sube el archivo.
4. Cuando diga **«ya subí»**: `nutri_pro_upload_status` con `upload_id`.

```json
{
  "action": "nutri_pro_upload_link",
  "params": {
    "folder_path": "Personal",
    "title": "SAT segunda prueba desde GPT",
    "suggested_filename": "SAT-segunda-prueba.pdf",
    "ttl_minutes": 30
  }
}
```

Confirma con `short_path`, `text_indexed` y que ya está en la nube.

| Situación | Acción |
|-----------|--------|
| Texto que tú generas | `nutri_pro_save` + `content` |
| PDF/Excel adjunto original | `nutri_pro_upload_link` → enlace → `nutri_pro_upload_status` |

## Otras acciones

| action | Cuándo |
|--------|--------|
| `nutri_pro_search` | Buscar archivos **y** enlaces por palabra (`kind`: `all`, `files`, `links`) |
| `nutri_pro_catalog` | Inventario: carpetas, archivos (`description` = nota breve) y `links[]` |
| `nutri_pro_file_text` | Más texto de archivo (`offset` para paginar; acepta `open_url`) |
| `nutri_pro_reindex` | Reindexar / OCR (`mode`: `text`\|`ocr`) |
| `nutri_pro_set_text` | **Corregir** texto indexado del mismo archivo (`content`) — no crea otro doc |
| `nutri_pro_save` | **Guardar** texto generado NUEVO (content) en carpeta |
| `nutri_pro_upload_link` | **Enlace móvil** para subir PDF/Excel real |
| `nutri_pro_upload_status` | Comprobar si ya subió (`upload_id`) |
| `plan_pro_item` | Detalle apunte + `nutri_refs` |

## Reglas

- **No pidas título exacto** — Jesús recuerda a medias (nombre, apellido, tema). Usa `plan_pro_search` / `nutri_pro_search` / `nutri_pro_ask` con **palabras sueltas**; si hay varios candidatos, muéstralos y pregunta cuál.
- **No inventes** cifras fuera de `snippets` / `unified_citations`.
- **No inventes** URLs ni contenido de páginas web; enlaces web guardados = solo metadatos. `open_url` de archivos sí existe en la respuesta API — úsalo tal cual.
- Si `text_indexed=false` o el texto es pobre → ofrece `nutri_pro_reindex` (ocr si es escaneado).
- Siempre cita `📎 ruta` (archivos) y `📝 apunte` cuando existan; enlaces con `🔗` + `folder_path` + URL.
- Propón enlazar apunte↔archivo cuando `link_gap_suggestions` lo indique.

## Deploy

OpenAPI **v2.10.1** + este archivo en Knowledge. Reimporta Actions en ChatGPT tras deploy.
