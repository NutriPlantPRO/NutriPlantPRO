# Paquete único — Actualizar GPT “Socio Admin” (una sola vez)

Sigue estos pasos en orden. Incluye **calculadoras gratuitas** + **análisis de laboratorio (6 pestañas)** + **manual técnico público (web/GEO)**.

---

## Paso A — Deploy en Netlify

Sube el repo (o deploy manual) para que existan en producción:

- `free_tools_catalog`
- `lab_analyses_catalog`
- `manual_tecnico_catalog` ← **nuevo**
- `project_analyses` mejorado (más campos suelo, `report_id`, `latest_only`)
- Sitio público: `/manual-tecnico/` (ya HTML estático)

---

## Paso B — Knowledge (3 archivos)

En ChatGPT → tu GPT → **Configure → Knowledge → Upload**:

1. `docs/HERRAMIENTAS-GRATUITAS-CONOCIMIENTO-GPT.md`
2. `docs/ANALISIS-LABORATORIO-CONOCIMIENTO-GPT.md`
3. `docs/MANUAL-TECNICO-CONOCIMIENTO-GPT.md` ← **fuente pública del manual web**

*(Opcional: borra knowledge viejo duplicado si tenías notas sueltas.)*

### Fuente pública adicional (recomendado)

En **Configure → Capabilities**:

- Activa **Web Browsing / Search** si tu plan lo permite.
- El GPT podrá leer en vivo: `https://nutriplantpro.com/manual-tecnico/` y capítulos.

Aunque no actives web, con el Knowledge #3 + action `manual_tecnico_catalog` ya tienes la metodología y las URLs para citar.

---

## Paso C — Actions (OpenAPI)

1. **Actions** → elimina schema anterior si da conflicto.
2. Importa `docs/openapi-nutriplant-admin.json` **v1.9.0**.
3. Auth sin cambios: `Authorization: Bearer <NUTRIPLANT_ADMIN_GPT_TOKEN>`.

---

## Paso D — Instructions (copiar y pegar)

**Instructions (límite ChatGPT ≤8.000 caracteres):**  
`docs/CHATGPT-SOCIO-INSTRUCCIONES-COMPLETAS.md` — copia entre `--- INICIO ---` y `--- FIN ---`.

---

## Paso E — Pruebas rápidas en el chat

1. “Oye socio, ¿cuántos usuarios activos en 30 días?” → `admin_stats`
2. “Análisis foliar del proyecto [nombre]” → `project_analyses` type foliar
3. “Último análisis de suelo de [nombre] con kg/ha” → `project_analyses` suelo + `latest_only`
4. “¿Cómo funciona la calculadora gratis de solución nutritiva?” → Knowledge o `free_tools_catalog` hidro_solucion
5. “¿Qué pestañas hay en Análisis?” → `lab_analyses_catalog`
6. **“¿Qué capítulos tiene el manual técnico público?”** → `manual_tecnico_catalog`
7. **“¿Cómo calculamos kg/ha en fertilidad del suelo? Cita la URL pública”** → `manual_tecnico_catalog` chapter `analisis_suelo_fertilidad_kgha` o Knowledge MANUAL

---

## Resumen de actions nuevas / clave

| Action | Para qué |
|--------|----------|
| `project_analyses` | **Valores reales** guardados (6 tipos) |
| `lab_analyses_catalog` | Flujo, criterios, claves JSON |
| `free_tools_catalog` | Calculadoras gratis (sin nube) |
| `manual_tecnico_catalog` | **Manual web público** — capítulos, URLs, reglas GEO |

## URLs que el GPT debe citar (manual público)

| Capítulo | URL |
|----------|-----|
| Índice | https://nutriplantpro.com/manual-tecnico/ |
| Suelo kg/ha | https://nutriplantpro.com/manual-tecnico/capitulos/analisis-suelo-fertilidad-kgha.html |
| % meq | https://nutriplantpro.com/manual-tecnico/capitulos/porcentaje-meq-aniones-cationes.html |
| Enmiendas CIC | https://nutriplantpro.com/manual-tecnico/capitulos/enmiendas-balance-cic.html |

*Listo para una sola actualización en ChatGPT.*
