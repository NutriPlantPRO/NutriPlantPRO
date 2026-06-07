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
| OpenAPI v2.3 con acciones Nutri PRO | ✅ |

**Tú en ChatGPT Socio (después del deploy):**
1. Reimportar `docs/openapi-nutriplant-admin.json` v2.3.0 en Actions.
2. Subir `docs/NUTRI-PRO-CONOCIMIENTO-GPT.md` a Knowledge.
3. Probar: «¿Qué archivos tengo sobre fertirriego?» → `nutri_pro_search`.

**Resultado:** ChatGPT Socio lista archivos/enlaces y cruza con apuntes vía `nutri_refs`.

---

## Fase 2 — Leer contenido de archivos

| Paso | Estado |
|------|--------|
| Tabla `plan_pro_nutri_file_extracts` (texto extraído) | ⬜ |
| Extractor PDF al subir | ⬜ |
| Extractor Excel (.xlsx) al subir | ⬜ |
| Extractor Word (.docx) | ⬜ |
| OCR imágenes / PDF escaneado | ⬜ |

**Resultado:** El archivo deja de ser caja negra; hay texto buscable en Supabase.

---

## Fase 3 — Búsqueda y correlación

| Paso | Estado |
|------|--------|
| Búsqueda full-text en extracts | ⬜ |
| Action `nutri_pro_ask` (fragmentos + cita) | ⬜ |
| Cruce automático: pregunta → apuntes + archivos enlazados | ⬜ |
| Embeddings / pgvector (si hace falta escala) | ⬜ |

**Resultado:** “¿Cuánto K en el Excel de costos?” busca dentro del xlsx y cita la fuente.

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
2. **Fase 2** — PDF + Excel primero (siguiente paso de código).
3. **Fase 3** — búsqueda en texto extraído.
4. **Fase 4** — automatizar en ambos chats.

---

*Última actualización: Fase 1 API + nutri_refs en plan_pro_item.*
