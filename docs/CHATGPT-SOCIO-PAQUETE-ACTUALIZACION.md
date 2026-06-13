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

## Paso B — Knowledge (4 archivos)

En ChatGPT → tu GPT → **Configure → Knowledge → Upload**:

1. `docs/HERRAMIENTAS-GRATUITAS-CONOCIMIENTO-GPT.md` ← incluye 📊 biblioteca «Mis curvas guardadas» (2026-05-23)
2. `docs/ANALISIS-LABORATORIO-CONOCIMIENTO-GPT.md`
3. `docs/MANUAL-TECNICO-CONOCIMIENTO-GPT.md` ← manual web **v2026.06.1** (**23 capítulos**; nuevo balance hídrico riego Clima; re-subir tras cada tanda)
4. `docs/PUBLICACIONES-REDES-CONOCIMIENTO-GPT.md` ← posts LinkedIn/IG; **§8 con 24 posts empresa** (añade filas si publicas nuevos)

*(Opcional: borra knowledge viejo duplicado si tenías notas sueltas.)*

### Fuente pública adicional (recomendado)

En **Configure → Capabilities**:

- Activa **Web Browsing / Search** si tu plan lo permite.
- El GPT podrá leer en vivo: `https://nutriplantpro.com/manual-tecnico/` y capítulos.

Aunque no actives web, con el Knowledge #3 + action `manual_tecnico_catalog` ya tienes la metodología y las URLs para citar.

---

## Paso C — Actions (OpenAPI)

1. **Actions** → elimina schema anterior si da conflicto.
2. Importa `docs/openapi-nutriplant-admin.json` **v2.9.0** (clima en vivo + `my_program_*` personal admin).
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
8. **“¿Cómo calcula NutriPlant el balance hídrico de riego?”** → `manual_tecnico_catalog` chapter `balance_hidrico_riego_clima` o Knowledge MANUAL §4.11b
9. **“¿Qué balance hídrico tiene el proyecto [nombre]?”** → `project_climate` mode=saved (`irrigation_quick_calc`)
10. **“Dame el clima actualizado del proyecto [nombre]”** → `project_climate` mode=**all** (`rolling_windows_ahora`, `irrigation_quick_calc_live`)
11. **“Crea un proyecto personal GPT para programa limón 45 t/ha”** → `my_program_project_create`
12. **“Guarda este borrador de programa en ese proyecto”** → `my_program_project_update` section=draft
13. **“Lista mis programas GPT personales”** → `my_program_project_list`
14. **“Redacta un post LinkedIn sobre % meq que no suman 100”** → PUBLICACIONES-REDES + capítulo FAQ + URL manual
15. **“¿Qué capítulos tenemos para publicar esta semana?”** → `manual_tecnico_catalog` + pilar G `publicaciones_redes_sociales`

**Redes en el día a día:** cuando publiques algo nuevo, pega el link al Socio en ChatGPT y redactáis juntos (ver flujo en `PUBLICACIONES-REDES` intro y en Instructions § fuente 5). Para que lo recuerde en futuros chats: añade la fila en §8 y re-sube el Knowledge #4 (o actualiza en Cursor y vuelve a subir).

**Antes de subir / re-subir Knowledge #4:** §8 tiene 24 posts empresa; añade filas de posts nuevos desde la última sesión editorial.

---

## Resumen de actions nuevas / clave

| Action | Para qué |
|--------|----------|
| `project_analyses` | **Valores reales** guardados (6 tipos) |
| `lab_analyses_catalog` | Flujo, criterios, claves JSON |
| `free_tools_catalog` | Calculadoras gratis (sin nube) |
| `manual_tecnico_catalog` | **Manual web público** — capítulos, URLs, reglas GEO |
| `my_program_project_create/list/get/update` | Laboratorio personal: crea/edita solo proyectos GPT del usuario admin |

## URLs que el GPT debe citar (manual público)

| Capítulo | URL |
|----------|-----|
| Índice | https://nutriplantpro.com/manual-tecnico/ |
| Flujo plataforma (Pilar 1) | https://nutriplantpro.com/manual-tecnico/capitulos/flujo-nutriplant-pro.html |
| Suelo kg/ha | https://nutriplantpro.com/manual-tecnico/capitulos/analisis-suelo-fertilidad-kgha.html |
| % meq | https://nutriplantpro.com/manual-tecnico/capitulos/porcentaje-meq-aniones-cationes.html |
| Enmiendas CIC | https://nutriplantpro.com/manual-tecnico/capitulos/enmiendas-balance-cic.html |

---

## Paso F — Fase 3 SEO (código hecho; Search Console en navegador)

Tras deploy del repo con Fase 3:

1. Guía: `docs/SEARCH-CONSOLE-FASE-3.md` (verificar dominio + enviar `sitemap.xml`).
2. En el repo ya están: JSON-LD `Article` en capítulos, `FAQPage` en FAQ, `CollectionPage` en índice, `ProfilePage` en autoría; `llms.txt` con **22** URLs de capítulo + flujo.

*Listo para una sola actualización en ChatGPT.*
