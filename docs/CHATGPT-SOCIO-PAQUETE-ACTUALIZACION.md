# Paquete único — Actualizar GPT “Socio Admin” (una sola vez)

Sigue estos pasos en orden. Incluye **calculadoras gratuitas** + **análisis de laboratorio (6 pestañas)**.

---

## Paso A — Deploy en Netlify

Sube el repo (o deploy manual) para que existan en producción:

- `free_tools_catalog`
- `lab_analyses_catalog`
- `project_analyses` mejorado (más campos suelo, `report_id`, `latest_only`)

---

## Paso B — Knowledge (2 archivos)

En ChatGPT → tu GPT → **Configure → Knowledge → Upload**:

1. `docs/HERRAMIENTAS-GRATUITAS-CONOCIMIENTO-GPT.md`
2. `docs/ANALISIS-LABORATORIO-CONOCIMIENTO-GPT.md`

*(Opcional: borra knowledge viejo duplicado si tenías notas sueltas.)*

---

## Paso C — Actions (OpenAPI)

1. **Actions** → elimina schema anterior si da conflicto.
2. Importa `docs/openapi-nutriplant-admin.json` **v1.8.0**.
3. Auth sin cambios: `Authorization: Bearer <NUTRIPLANT_ADMIN_GPT_TOKEN>`.

---

## Paso D — Instructions (copiar y pegar)

**Instructions (límite ChatGPT ≤8.000 caracteres):**  
`docs/CHATGPT-SOCIO-INSTRUCCIONES-COMPLETAS.md` — copia entre `--- INICIO ---` y `--- FIN ---` (~3.500 caracteres; el detalle va en Knowledge).

---

## Paso E — Pruebas rápidas en el chat

1. “Oye socio, ¿cuántos usuarios activos en 30 días?” → `admin_stats`
2. “Análisis foliar del proyecto [nombre]” → `project_analyses` type foliar
3. “Último análisis de suelo de [nombre] con kg/ha” → `project_analyses` suelo + `latest_only`
4. “¿Cómo funciona la calculadora gratis de solución nutritiva?” → Knowledge o `free_tools_catalog` hidro_solucion
5. “¿Qué pestañas hay en Análisis?” → `lab_analyses_catalog`

---

## Resumen de actions nuevas / clave

| Action | Para qué |
|--------|----------|
| `project_analyses` | **Valores reales** guardados (6 tipos) |
| `lab_analyses_catalog` | Flujo, criterios, claves JSON |
| `free_tools_catalog` | Calculadoras gratis (sin nube) |

*Listo para una sola actualización en ChatGPT.*
