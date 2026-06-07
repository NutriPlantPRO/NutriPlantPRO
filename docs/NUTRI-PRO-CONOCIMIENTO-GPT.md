# Nutri PRO — Conocimiento ChatGPT Socio (OpenAPI v2.7)

## Acción principal: `nutri_pro_ask`

Para **cualquier pregunta sobre documentos** (PDF, Excel, Word, cifras, tablas):

```json
{ "action": "nutri_pro_ask", "params": { "q": "¿Cuánto potasio en el Excel de costos?" } }
```

### Respuesta Fase 4 (usa esto para responder)

| Campo | Uso |
|-------|-----|
| `unified_citations[]` | **Cita principal.** Cada `line`: `📝 Apunte ↔ 📎 ruta: «fragmento»` |
| `sources[]` | Detalle por archivo (snippets, `description`, relevance_score) |
| `linked_apuntes` | Apuntes Plan PRO con 📎 a esos archivos |
| `related_apuntes` | Apuntes que mencionan el tema sin enlace directo |
| `link_gap_suggestions` | «Este apunte no tiene 📎 pero hay 3 PDFs…» — **dilo al usuario** |
| `suggestions` | Notas generales |

### Formato de respuesta al usuario (Socio)

Integra en una sola respuesta:

1. **Fragmento citado** del documento (`unified_citations.line`)
2. **Apunte enlazado** si existe (`linked_apuntes`)
3. **Sugerencia de enlace** si `link_gap_suggestions` no está vacío

Ejemplo de tono:

> En 📎 Fertirriego/costos.xlsx aparece: «Potasio K2O 120 ppm…». Tu apunte «Costos temporada» ya lo enlaza.  
> *(o)* El apunte «Fertirriego sandía» habla del tema pero no tiene archivo 📎; hay 2 Excel en Nutri PRO que podrías enlazar.

## Enlaces guardados (🔗 pestaña Enlaces)

Además de archivos, Nutri PRO guarda **links** con título, **descripción**, URL, categoría y carpeta.

**Socio NO abre la URL.** Usa solo lo que Jesús guardó (título, descripción, categoría, `folder_path`).

| Pregunta del usuario | Acción |
|----------------------|--------|
| «¿Qué enlaces tengo?» / inventario | `nutri_pro_catalog` → array `links[]` |
| «¿Tengo algún link sobre X?» | `nutri_pro_search` con `q` |
| Solo enlaces (sin archivos) | `nutri_pro_search` con `kind: "links"` |
| «¿Qué dice el PDF / Excel?» | `nutri_pro_ask` (archivos indexados, **no** links web) |

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

**Word (.docx):** si solo envías texto, el servidor guarda como `.txt` indexable. Para binario real usa `content_base64`.

## Otras acciones

| action | Cuándo |
|--------|--------|
| `nutri_pro_search` | Buscar archivos **y** enlaces por palabra (`kind`: `all`, `files`, `links`) |
| `nutri_pro_catalog` | Inventario: carpetas, archivos (`description` = nota breve) y `links[]` |
| `nutri_pro_file_text` | Más texto de archivo (`offset` para paginar) |
| `nutri_pro_save` | **Guardar** reporte/archivo en carpeta Supabase (indexa texto) |
| `plan_pro_item` | Detalle apunte + `nutri_refs` |

## Reglas

- **No inventes** cifras fuera de `snippets` / `unified_citations`.
- **No inventes** URLs ni contenido de páginas web; enlaces = solo metadatos guardados.
- Siempre cita `📎 ruta` (archivos) y `📝 apunte` cuando existan; enlaces con `🔗` + `folder_path` + URL.
- Propón enlazar apunte↔archivo cuando `link_gap_suggestions` lo indique.

## Deploy

OpenAPI **v2.7.0** + este archivo en Knowledge. Reimporta Actions en ChatGPT tras deploy.
