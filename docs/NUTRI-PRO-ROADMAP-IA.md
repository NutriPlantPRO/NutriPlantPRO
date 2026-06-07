# Nutri PRO — Roadmap IA (Plan PRO + ChatGPT Socio)

## Leyenda

| Símbolo | Significado |
|---------|-------------|
| ✅ | Hecho |
| ⬜ | Pendiente |

---

## Fase 0 — Base Nutri PRO | ✅

Carpetas, archivos, enlaces, rutas 📎 en apuntes.

## Fase 1 — Catálogo GPT | ✅

`nutri_pro_catalog`, `nutri_pro_search`, `nutri_refs` en `plan_pro_item`.

## Fase 2 — Leer contenido | ✅

Extracción al subir, `nutri_pro_file_text`, formatos Office/PDF/texto.

## Fase 3 — Búsqueda y correlación | ✅

`nutri_pro_ask`, ranking, snippets, `linked_apuntes` / `related_apuntes`.

## Fase 4 — Super-herramienta | ✅

| Paso | Estado |
|------|--------|
| Plan PRO Assistant llama `nutri_pro_ask` automático (preguntas sobre documentos) | ✅ |
| `unified_citations` (apunte ↔ archivo ↔ fragmento) | ✅ |
| `link_gap_suggestions` (apunte sin 📎 pero hay PDFs/Excel) | ✅ |
| ChatGPT Socio: instrucciones + OpenAPI v2.6 | ✅ (actualizar tras deploy) |

**Plan PRO Assistant:** detecta preguntas sobre documentos → `/api/plan-pro-nutri-ask` → inyecta fragmentos en el contexto del chat.

**ChatGPT Socio:** usa `nutri_pro_ask` y responde con `unified_citations` + `link_gap_suggestions`.

---

## Pendiente futuro (no bloquea)

| Tema | Estado |
|------|--------|
| OCR imágenes / PDF escaneado | ⬜ |
| Embeddings / pgvector | ⬜ |
| Botón Re-indexar archivos viejos en UI | ⬜ |

---

## Tras deploy — una sola actualización ChatGPT Socio

1. Deploy Netlify.
2. OpenAPI **v2.6.0** (`docs/openapi-nutriplant-admin.json`).
3. Knowledge: `NUTRI-PRO-CONOCIMIENTO-GPT.md` + `CHATGPT-SOCIO-INSTRUCCIONES-COMPLETAS.md`.
4. Probar Socio: «¿Cuánto K en el Excel de costos?»
5. Probar Plan PRO Assistant (burbuja): misma pregunta.

---

*Última actualización: Fase 4 completa (OpenAPI v2.6).*
