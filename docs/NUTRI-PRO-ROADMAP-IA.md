# Nutri PRO — Roadmap IA (Plan PRO + ChatGPT Socio)

Estado vivo del plan para correlacionar apuntes, archivos y chat.

## Leyenda

| Símbolo | Significado |
|---------|-------------|
| ✅ | Hecho |
| 🔄 | En curso / parcial |
| ⬜ | Pendiente |

---

## Fase 0 — Base Nutri PRO (bóveda)

| Paso | Estado |
|------|--------|
| Carpetas + subcarpetas | ✅ |
| Color por carpeta | ✅ |
| Renombrar carpeta | ✅ |
| Archivos (PDF, Office, imágenes) en Storage | ✅ |
| Enlaces con clasificación | ✅ |
| Categorías personalizadas (Inglés, Escuela, + nuevas) | ✅ |
| Rutas cortas apunte ↔ archivo Nutri PRO | ✅ |
| Plan PRO Assistant ve rutas en apuntes visibles | ✅ |

---

## Fase 1 — Catálogo para GPT

| Paso | Estado |
|------|--------|
| Action `nutri_pro_catalog` en API admin | ✅ |
| Action `nutri_pro_search` (por nombre/carpeta) | ✅ |
| `plan_pro_item` devuelve `nutri_refs` | ✅ |
| Knowledge `docs/NUTRI-PRO-CONOCIMIENTO-GPT.md` | ✅ |
| OpenAPI v2.3+ con acciones Nutri PRO | ✅ |

**Resultado:** ChatGPT Socio lista archivos/enlaces y cruza con apuntes vía `nutri_refs`.

---

## Fase 2 — Leer contenido de archivos

| Paso | Estado |
|------|--------|
| Tabla `plan_pro_nutri_file_extracts` | ✅ |
| Función Netlify `nutri-pro-extract` tras subida | ✅ |
| PDF | ✅ |
| Excel (.xlsx, .xls, .csv) | ✅ |
| Word (.docx) | ✅ |
| PowerPoint (.pptx) | ✅ |
| Texto (.txt, .rtf) | ✅ |
| OpenDocument (.odt, .ods, .odp) | ✅ |
| Action `nutri_pro_file_text` (GPT lee fragmentos) | ✅ |
| `nutri_pro_search` también busca en texto indexado | ✅ |
| OCR imágenes / PDF escaneado | ⬜ |
| .doc / .ppt antiguos (binario) | ⬜ (guardar como docx/pptx) |

**Formatos aceptados en subida pero sin texto aún:** imágenes (png, jpg…), `.doc`, `.ppt` legacy.

**Tú en Supabase + deploy:**
1. Ejecutar `supabase-plan-pro-nutri-pro-extracts.sql`.
2. Deploy Netlify (instala `pdf-parse`, `xlsx`, `mammoth`, `jszip`).
3. Reimportar OpenAPI **v2.4.0** en ChatGPT Socio.
4. Probar subir un PDF y preguntar: «¿Qué dice el Excel de costos sobre K?» → `nutri_pro_search` + `nutri_pro_file_text`.

**Resultado:** El archivo deja de ser caja negra; hay texto buscable en Supabase.

---

## Fase 3 — Búsqueda y correlación

| Paso | Estado |
|------|--------|
| Búsqueda full-text avanzada (ranking, snippets) | ⬜ |
| Action `nutri_pro_ask` (fragmentos + cita) | ⬜ |
| Cruce automático: pregunta → apuntes + archivos enlazados | ⬜ |
| Embeddings / pgvector (si hace falta escala) | ⬜ |

**Resultado:** “¿Cuánto K en el Excel de costos?” busca dentro del xlsx y cita la fuente con fragmento preciso.

---

## Fase 4 — Super-herramienta de decisión

| Paso | Estado |
|------|--------|
| Plan PRO Assistant llama búsqueda Nutri PRO al detectar pregunta sobre documentos | ⬜ |
| ChatGPT Socio con citas unificadas (apunte + archivo + fragmento) | ⬜ |
| Sugerencias: “este apunte no tiene archivo pero hay 3 PDFs sobre el tema” | ⬜ |

---

## Orden recomendado

1. ~~**Fase 1**~~ ✅ — API catálogo para ChatGPT Socio.
2. ~~**Fase 2**~~ ✅ — extracción PDF/Office/texto al subir.
3. **Fase 3** — búsqueda avanzada y `nutri_pro_ask`.
4. **Fase 4** — automatizar en ambos chats.

---

*Última actualización: Fase 2 extracción de texto + nutri_pro_file_text (OpenAPI v2.4).*
