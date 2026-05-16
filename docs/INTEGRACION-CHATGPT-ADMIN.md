# Integración ChatGPT + NutriPlant (solo admin, solo lectura)

**Estado:** plan acordado — implementación paso a paso.  
**Para quién:** solo el administrador (Jesús).  
**Suscripción ChatGPT:** Plus (~395 MXN/mes) — suficiente para Custom GPT privado con Actions.  
**Regla de oro:** el chat **consulta** datos reales; **no modifica** usuarios, proyectos ni Plan PRO.

---

## 1. Visión en una frase

Un **GPT personalizado privado** en la app ChatGPT que, al hablar en natural (“oye socio…”), llama **una API en Netlify** y lee **Supabase** igual que el panel admin, los proyectos de suscriptores y **Plan PRO** (cerebro digital).

---

## 2. Qué NO es

| No es | Sí es |
|-------|--------|
| Aparecer en el menú “Apps” junto a Outlook | Tu propio GPT + Actions a `nutriplantpro.com` |
| Editar datos desde ChatGPT | Solo lectura (GET / consultas) |
| Acceso para suscriptores | Solo tú (token secreto + GPT privado) |
| Sustituir `admin/index.html` o `planpro/` | Complemento para preguntas rápidas y resúmenes |

---

## 3. Arquitectura

```text
┌─────────────────┐     Actions (OpenAPI)      ┌──────────────────────────────┐
│  ChatGPT Plus   │ ─────────────────────────► │  Netlify Function            │
│  GPT privado    │     Bearer ADMIN_TOKEN     │  nutriplant-admin-assistant  │
│  "Socio Admin"  │ ◄───────────────────────── │  (solo lectura)              │
└─────────────────┘     JSON resúmenes         └──────────────┬───────────────┘
                                                              │
                    ┌─────────────────────────────────────────┼─────────────────────────┐
                    ▼                     ▼                   ▼                         ▼
              profiles            projects              dashboard_visits          plan_pro_*
              (suscriptores)      (data JSONB)          (última conexión)         (cerebro)
                    │                     │                   │                         │
                    └─────────────────────┴───────────────────┴─────────────────────────┘
                                              Supabase
```

**Opcional en la misma API:** llamada a **Open-Meteo** para VPD “ahora” (usa `location.center` del proyecto; no requiere que el usuario haya actualizado la pestaña VPD).

---

## 4. Seguridad (obligatorio)

- [ ] GPT guardado como **Private** (no publicar en GPT Store).
- [ ] Variable Netlify `NUTRIPLANT_ADMIN_GPT_TOKEN` — token largo aleatorio; ChatGPT lo envía en header `Authorization: Bearer …`.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` **solo** en Netlify (nunca en ChatGPT ni en el navegador).
- [ ] Código de la función: **sin** `.insert()`, `.update()`, `.delete()` en ninguna tabla.
- [ ] No devolver `password_plain` ni datos sensibles innecesarios.
- [ ] Rate limit básico (opcional fase 2): máx. N peticiones/minuto por IP o por token.

---

## 5. Fuentes de datos (mapa rápido)

### 5.1 Panel admin / negocio

| Pregunta tipo | Tablas / campos |
|---------------|-----------------|
| Usuarios activos 30 días | `profiles.last_login` + `dashboard_visits.visited_at` (misma lógica que `getActiveUsers()` en admin) |
| Pendientes / activos / cancelados | `profiles.subscription_status` |
| Teléfono, ubicación registrada | `profiles.phone`, `profiles.location` (texto) |
| Última conexión + coords | `dashboard_visits` (`lat`, `lng`, `visited_at`) — última por `user_id` |
| Retención / estadísticas | Calcular en API: altas `created_at`, churn por `subscription_status`, días sin login |

### 5.2 Proyecto de un suscriptor (`projects.data`)

| Sección | Ruta JSON (típica) | Notas |
|---------|-------------------|--------|
| Ubicación | `location` | `polygon`, `center`, `elevationM`, `areaHectares` — **ya guardado** |
| Análisis suelo / enmiendas | `soilAnalysis`, `amendments` | meq, pH, ajustes |
| Fertirriego programa | `fertirriego.program.weeks[]`, `chartWaterByStageM3ha[]` | kg/ha por etapa |
| Fertirriego gráficas (ppm, meq, %) | **No guardado como %** | API **recalcula** con misma lógica que `getFertiStageIonicSummary()` en `fertirriego-program-functions.js` |
| VPD guardado | `vpdAnalysis` | historial, rangos, máximos por fecha/hora |
| VPD **ahora** | — | API: Open-Meteo + `getVPDLocation()` + fórmulas `calculateVPDSimple` / `calculateVPDAdvanced` |
| Granular / hidro | `granular`, `hidroponia` | según exista en el proyecto |

### 5.3 Plan PRO (cerebro digital)

| Tabla | Contenido |
|-------|-----------|
| `plan_pro_areas` | Pilares (Personal, Yara, NutriPlant…) |
| `plan_pro_categories` | Categorías |
| `plan_pro_items` | `title`, `body_plain`, `body_html`, `body_blocks` (mini-tablas inversión/gastos), `priority`, `status`, `due_at`, `relation_tags` |

Solo filas con `owner_id` = tu usuario admin.

---

## 6. Acciones de la API (catálogo MVP)

Una función router: `POST /.netlify/functions/nutriplant-admin-assistant`  
Body: `{ "action": "...", "params": { ... } }`  
(o varias rutas OpenAPI — lo definimos en implementación).

| `action` | Para qué sirve | Ejemplo de pregunta en ChatGPT |
|----------|----------------|--------------------------------|
| `admin_stats` | Totales: usuarios, activos 30d, pendientes, proyectos | “Oye socio, ¿cuántos activos en 30 días?” |
| `list_users` | Lista filtrada (status, búsqueda nombre/email) | “Lista pendientes de suscripción” |
| `user_summary` | Perfil + última visita + nº proyectos | “¿Última conexión de Francisco Jiménez?” |
| `search_projects` | Por usuario, cultivo, nombre | “Proyectos de aguacate de Francisco” |
| `project_summary` | Resumen: ubicación, cultivo, suelo, programas | “¿Qué programa de nutrición tiene en NutriPlant?” |
| `project_soil` | Análisis suelo / enmiendas | “¿Qué niveles de K, Ca, pH puso?” |
| `project_fertirriego_stage` | kg/ha + ppm + meq + % por etapa | “Mes 5: relación % meq cationes/aniones” |
| `project_location` | Centro, msnm, ha, vértices opcionales | “Coordenadas y altitud del predio” |
| `project_vpd_saved` | Último / máximo VPD guardado en rangos | “¿Cuál fue el VPD máximo el 5 de mayo?” |
| `project_vpd_live` | VPD actual vía clima (requiere polígono) | “¿Qué VPD tiene ahora su predio?” |
| `plan_pro_week` | Ítems con `due_at` / prioridad esta semana | “En Plan PRO, ¿qué plan tengo esta semana?” |
| `plan_pro_search` | Buscar por texto/tags/área | “Notas sobre inversión NutriPlant” |
| `plan_pro_item` | Detalle de un apunte (incl. mini-tablas) | “Resume mi apunte de proyección X” |

**Fase 2 (opcional):** geocodificación inversa de `lat/lng` → estado/región; más acciones granulares.

---

## 7. Cálculos que hace la API (no ChatGPT)

Para no alucinar números, la función Netlify debe replicar lógica existente en el repo:

| Cálculo | Referencia en código |
|---------|----------------------|
| Usuarios activos 30 días | `admin/index.html` → `getActiveUsers()` |
| ppm / meq / % fertirriego | `fertirriego-program-functions.js` → `getFertiStageIonicSummary()` |
| VPD en vivo | `dashboard.js` → `getWeatherData`, `calculateVPDSimple`, `calculateVPDAdvanced` |
| Centro del predio | `dashboard.js` → `getVPDLocation()` |

ChatGPT solo **presenta** tablas y explica; la API **devuelve números**.

---

## 8. Variables de entorno (Netlify)

| Variable | Uso |
|----------|-----|
| `SUPABASE_URL` | Ya usada en otras functions |
| `SUPABASE_SERVICE_ROLE_KEY` | Lectura admin (bypass RLS controlado en código) |
| `NUTRIPLANT_ADMIN_GPT_TOKEN` | Secreto que valida ChatGPT Actions |
| `OPENAI_API_KEY` | **No** obligatoria para esta función si ChatGPT hace el razonamiento; solo si más adelante quieres resúmenes largos server-side |

---

## 9. Configuración en ChatGPT (cuando la API exista)

1. [chatgpt.com](https://chatgpt.com) → **My GPTs** → **Create**.
2. **Nombre:** ej. `NutriPlant Socio Admin (solo Jesús)`.
3. **Instructions (borrador):**
   - Eres asistente del administrador de NutriPlant PRO y Plan PRO.
   - Usa siempre las Actions para datos; no inventes cifras.
   - Solo lectura: no ofrezcas modificar usuarios ni proyectos.
   - Responde en español; tono cercano si el usuario dice “socio”.
   - NutriPlant: proyectos en `projects.data`; Plan PRO: tablas `plan_pro_*`.
4. **Actions** → Import OpenAPI → URL del schema o `/.netlify/functions/nutriplant-admin-assistant` (según implementemos).
5. **Authentication:** API Key → Header `Authorization` → `Bearer <NUTRIPLANT_ADMIN_GPT_TOKEN>`.
6. **Save → Only me (Private)**.

---

## 10. Plan de implementación (paso a paso)

Marca cada paso cuando lo terminemos juntos.

### Fase 0 — Preparación
- [ ] **0.1** Generar `NUTRIPLANT_ADMIN_GPT_TOKEN` y añadirlo en Netlify (Production).  
  En terminal: `openssl rand -hex 32` (copiar resultado a Netlify → Site → Environment variables).
- [ ] **0.2** Confirmar que `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` están en Netlify.

### Fase 1 — API mínima (admin)
- [x] **1.1** Crear `netlify/functions/nutriplant-admin-assistant.js` (router + auth).
- [x] **1.2** Implementar `admin_stats`, `list_users`, `user_summary`, `search_projects`.
- [x] **1.3** Redirect en `netlify.toml`: `/api/admin-assistant` → función.
- [x] **1.4** Probar con `curl` y ChatGPT (GPT privado + Bearer).

### Fase 2 — Proyectos (detalle)
- [x] **2.1** `project_detail` — ubicación, suelo, fertirriego (etapas + ppm/meq si hay m³/ha), granular, VPD guardado.
- [x] **2.2** `project_vpd_live` — VPD ahora vía Open-Meteo + polígono.
- [ ] **2.3** Deploy + actualizar esquema OpenAPI en el GPT (`docs/openapi-nutriplant-admin.json`).
- [ ] **2.4** Probar: “Produccion Limon Ejercicio, ¿tiene fertirriego?”

**Probar en local (con `netlify dev` y variables en `.env` o panel):**
```bash
export NUTRIPLANT_ADMIN_GPT_TOKEN="tu-token"
curl -s -X POST http://localhost:8888/api/admin-assistant \
  -H "Authorization: Bearer $NUTRIPLANT_ADMIN_GPT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"admin_stats","params":{}}' | jq .
```

### Fase 2 — Proyectos de suscriptores
- [ ] **2.1** `search_projects` + `user_summary`.
- [ ] **2.2** `project_summary`, `project_soil`, `project_location`.
- [ ] **2.3** `project_fertirriego_stage` (portar `getFertiStageIonicSummary`).
- [ ] **2.4** `project_vpd_saved` + `project_vpd_live` (Open-Meteo).

### Fase 3 — Plan PRO
- [x] **3.1** `plan_pro_week`, `plan_pro_search`, `plan_pro_item` (resumen `body_blocks`).
- [x] **3.2** Filtrar siempre por `owner_id` del admin.
- [ ] **3.3** Deploy + pegar OpenAPI 1.2.0 en el GPT.
- [ ] **3.4** Probar: “¿Qué tengo esta semana en Plan PRO?”

### Fase 4 — ChatGPT
- [ ] **4.1** Generar `openapi-nutriplant-admin.yaml` (o schema embebido) para Actions.
- [ ] **4.2** Crear GPT privado y pegar instrucciones.
- [ ] **4.3** Pruebas de conversación (checklist abajo).

### Fase 5 — Pulido (opcional)
- [ ] **5.1** Logs de uso (sin datos sensibles).
- [ ] **5.2** Límites de tamaño de respuesta (truncar listas largas).
- [ ] **5.3** Documentar en este archivo la URL final del schema OpenAPI.

---

## 11. Checklist de pruebas en ChatGPT

Cuando el GPT esté conectado, probar en un mismo hilo:

- [ ] “¿Cuántos usuarios activos en los últimos 30 días?”
- [ ] “¿Cuántos pendientes de suscripción?”
- [ ] “¿Qué programa de fertirriego tiene Francisco Jiménez?” (ajustar nombre real)
- [ ] “¿Qué análisis de suelo tiene y qué niveles de K y Ca?”
- [ ] “Mes 3 del proyecto X: ppm y % meq de aniones y cationes” (con m³/ha guardado)
- [ ] “Coordenadas del centro y metros sobre el nivel del mar”
- [ ] “¿Qué VPD tiene ahora en el predio?” (proyecto con polígono)
- [ ] “En Plan PRO, ¿qué tengo esta semana?”
- [ ] Confirmar que **no** puede “cambiar” un valor aunque se lo pidas.

---

## 12. Ejemplos de conversación (referencia)

```
Tú: Oye socio, para admin: ¿cuántos activos en 30 días?
GPT: [llama admin_stats] Tienes 12 usuarios activos…

Tú: En NutriPlant, ¿qué programa de nutrición tiene Francisco?
GPT: [search_user → project_summary] Tiene fertirriego por meses, etapa 1…

Tú: ¿Qué análisis de suelo tiene?
GPT: [project_soil] K 1.2 meq, Ca 8.5 meq, pH 6.8…

Tú: En Plan PRO, ¿qué plan tengo esta semana?
GPT: [plan_pro_week] 3 ítems alta prioridad: …
```

---

## 13. Archivos del repo relacionados

| Archivo | Rol |
|---------|-----|
| `netlify/functions/openai-assistant.js` | Chat de usuarios en la app (referencia de proxy) |
| `admin/index.html` | Lógica admin + chat interno (`getAdminPanelContext`) |
| `fertirriego-program-functions.js` | Cálculo ppm/meq/% |
| `dashboard.js` | VPD, ubicación, `getVPDLocation` |
| `map.js` | Guardado polígono + `elevationM` |
| `supabase-plan-pro-tables.sql` | Esquema Plan PRO |
| `docs/PLAN-PRO-CEREBRO-DIGITAL.md` | Visión producto Plan PRO |

---

## 14. Siguiente paso inmediato

**Fase 1 código listo.** Falta:

1. Poner `NUTRIPLANT_ADMIN_GPT_TOKEN` en Netlify y hacer **deploy**.
2. Probar `curl` contra `https://nutriplantpro.com/api/admin-assistant`.
3. Crear GPT privado → Actions → importar `docs/openapi-nutriplant-admin.json` → Auth Bearer con el mismo token.

Cuando quieras continuar, di: *“socio, Fase 2 proyectos / fertirriego”* o *“configurar el GPT”*.

---

*Última actualización: mayo 2026 — documento vivo; ir marcando checkboxes según avancemos.*
