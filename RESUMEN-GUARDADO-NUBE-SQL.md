# Resumen: guardado en la nube y SQL en Supabase

## Qué guardamos en la nube

### 1. Tabla `profiles` (por usuario)
- **Chat sin proyecto:** `chat_history_no_project`
- **Enmiendas personalizadas:** `custom_amendments`
- **Materiales granulares personalizados:** `custom_granular_materials`
- **Cultivos granulares personalizados:** `custom_granular_crops`
- **Fertilizantes fertirriego personalizados:** `custom_ferti_materials`
- **Cultivos fertirriego personalizados:** `custom_ferti_crops`
- **Fertilizantes hidroponía personalizados:** `custom_hydro_materials`

### 2. Tabla `projects` (por proyecto por usuario)
En la columna **`data`** (JSONB) va todo el proyecto:
- **Ubicación:** polígono, coordenadas, superficie, perímetro
- **Enmienda:** `amendments`, `soilAnalysis`
- **Nutrición granular:** `granular`
- **Fertirriego:** `fertirriego`
- **Hidroponía:** datos de la pestaña
- **VPD:** `vpdAnalysis`
- **Análisis:** `soilAnalyses`, `solucionNutritivaAnalyses`, `extractoPastaAnalyses`, `aguaAnalyses`, `foliarAnalyses`, `frutaAnalyses`

### 3. Tabla `reports` (lo que añadimos hoy)
- **Reportes PDF** generados por usuario y proyecto: `id`, `user_id`, `project_id`, `data` (JSON del reporte), `created_at`.

---

## Archivos SQL que tienes

| Archivo | Qué hace |
|---------|----------|
| `supabase-schema-nutriplant.sql` | Esquema completo: profiles + projects + **reports** + RLS |
| `supabase-reports-table.sql` | Solo tabla **reports** + índices + RLS (por si ya tienes el resto) |
| `supabase-profiles-custom-*.sql` | Añaden columnas a `profiles` (enmiendas, granular, ferti, hydro) por si las agregaste después |

---

## Validación paso a paso

Siguiente: **Paso 1** (validar `profiles` y `projects`) y luego **Paso 2** (crear `reports`). Ver mensaje siguiente.
