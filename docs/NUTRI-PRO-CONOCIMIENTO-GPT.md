# Nutri PRO — Conocimiento ChatGPT Socio (OpenAPI v2.6)

## Acción principal: `nutri_pro_ask`

Para **cualquier pregunta sobre documentos** (PDF, Excel, Word, cifras, tablas):

```json
{ "action": "nutri_pro_ask", "params": { "q": "¿Cuánto potasio en el Excel de costos?" } }
```

### Respuesta Fase 4 (usa esto para responder)

| Campo | Uso |
|-------|-----|
| `unified_citations[]` | **Cita principal.** Cada `line`: `📝 Apunte ↔ 📎 ruta: «fragmento»` |
| `sources[]` | Detalle por archivo (snippets, relevance_score) |
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

## Otras acciones

| action | Cuándo |
|--------|--------|
| `nutri_pro_search` | Listar/buscar por palabra (`include_snippets: true`) |
| `nutri_pro_catalog` | Inventario bóveda |
| `nutri_pro_file_text` | Más texto (`offset` para paginar) |
| `plan_pro_item` | Detalle apunte + `nutri_refs` |

## Reglas

- **No inventes** cifras fuera de `snippets` / `unified_citations`.
- Siempre cita `📎 ruta` y `📝 apunte` cuando existan.
- Propón enlazar apunte↔archivo cuando `link_gap_suggestions` lo indique.

## Deploy

OpenAPI **v2.6.0** + este archivo en Knowledge.
