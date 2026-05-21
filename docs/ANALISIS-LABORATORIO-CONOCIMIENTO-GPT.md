# NutriPlant PRO — Análisis de laboratorio (6 pestañas) · Conocimiento GPT

**Uso:** sube este archivo al GPT privado **junto con** `HERRAMIENTAS-GRATUITAS-CONOCIMIENTO-GPT.md`.  
**Datos reales del suscriptor:** la API `project_analyses` (Supabase `projects.data`).

---

## 1. Dónde se guardan

| Pestaña dashboard | Clave JSON en `projects.data` | API `type` |
|-------------------|-------------------------------|------------|
| Análisis de suelo | `soilAnalyses[]` | `suelo` → respuesta `suelo_reportes` |
| Solución nutritiva | `solucionNutritivaAnalyses[]` | `solucion_nutritiva` |
| Extracto de pasta | `extractoPastaAnalyses[]` | `extracto_pasta` |
| Análisis de agua | `aguaAnalyses[]` | `agua` |
| Análisis foliar | `foliarAnalyses[]` | `foliar` |
| Análisis de fruta | `frutaAnalyses[]` | `fruta` |

Cada elemento es un **reporte** con `id`, `title`, `date` y secciones propias.

**No confundir:** `soilAnalysis` (singular) = pestaña **Enmiendas** (CIC inicial/objetivo).  
`soilAnalyses[]` = pestaña **Análisis → Suelo** (reportes de laboratorio).

---

## 2. Cómo debe actuar el GPT

1. Si preguntan por un **cliente o proyecto** → llamar **Actions**:
   ```json
   { "action": "project_analyses", "params": { "project_name": "Nombre", "type": "all" } }
   ```
2. Para **un solo tipo:** `"type": "foliar"` (o `suelo`, `agua`, etc.).
3. Para **un reporte concreto:** añadir `"report_id": "sa_1730..."`.
4. Solo el **más reciente:** `"latest_only": true`.
5. Resumen completo del proyecto: `project_detail` incluye `sections.analyses`.
6. Para **criterios y flujo de pantalla** sin datos: `lab_analyses_catalog`.

**No inventar ppm, % ni kg/ha** si no vienen en la respuesta de la API.

---

## 3. Flujo en la app (suscriptor)

1. Abre proyecto en dashboard.
2. Pestaña **Análisis** → subpestaña (Suelo, Agua, Foliar…).
3. Lista de tarjetas (título + fecha) → **+ Nuevo análisis**.
4. Rellena secciones (acordeones); guardado automático a nube (`projectStorage.saveSection`).
5. Puede haber **varios reportes** del mismo tipo (histórico).

---

## 4. Criterios por pestaña

### 4.1 Análisis de suelo

**Secciones:** Físico · pH y sales · Fertilidad · Cationes intercambiables · Relaciones.

**Fertilidad — fila Ideal (referencia):**
- **K, Ca, Mg (ppm):** si hay CIC (meq/100g en Cationes):  
  `meq_ideal = CIC × fracción` (K 5 %, Ca 70 %, Mg 13 % de saturación).  
  `ppm = meq × factor` (K×391, Ca×200,4, Mg×121,5).
- **P (ppm):** según método (Bray ~40, Olsen ~25, Mehlich 3 ~40 por defecto en app).
- **Otros nutrientes / MO / N-NO₃:** referencias fijas NutriPlant (botón recargar ideales).

**kg/ha (ajuste):**
```
kg/ha = (nivel_laboratorio − ideal) × 0.1 × profundidad_cm × densidad_aparente × (suelo_explorado_% / 100)
```
- Negativo = **falta**; positivo = **exceso**.
- `profundidad_cm` y `suelo_explorado_%` en Fertilidad; densidad en Físico (default 1 g/cm³ si vacío).

**Cationes:** meq/100g y % saturación; CIC = suma catiónica del reporte.

---

### 4.2 Solución nutritiva

- General: CE (dS/m), pH, RAS.
- Cationes y aniones en **ppm**; fila ideal editable.
- Diff = laboratorio − ideal (ppm).
- Referencias internas por nutriente (rangos SN en código).

---

### 4.3 Extracto de pasta saturada

- CE, pH, RAS; cationes/aniones ppm; ideales.
- Interpretación: disponibilidad en condición de saturación — validar con campo y cultivo.

---

### 4.4 Análisis de agua

- Volumen m³ riego (contexto).
- CE, pH, RAS; Ca, Mg, K, Na; NO₃, SO₄, HCO₃, CO₃ (meq en carbonatos).
- Residual ácido (meq/L), tipo de ácido — enlaza con herramienta gratis de acondicionamiento de agua.
- Micros ppm.

---

### 4.5 Análisis foliar

- Macros en **%** (N, P, K, Ca, Mg, S).
- Micros en **ppm** (Fe, Mn, Zn, Cu, B, Mo).
- **DOP %** = (resultado − óptimo) / óptimo × 100.
- Óptimos por defecto editables (ej. N 3 %, P 0,275 %, Fe 150 ppm…).

---

### 4.6 Análisis de fruta

- Macros y micros (como foliar).
- **Calidad:** materia seca, °Brix, firmeza, acidez titulable.
- **Calcio en fruta:** Ca total, % soluble, ligado, insoluble.
- **ICC %** = (resultado − óptimo) / óptimo × 100.
- Semáforo: |ICC| ≤10 % verde · 10–25 amarillo · 25–50 naranja · >50 rojo.

---

## 5. Ejemplos de preguntas → API

| Pregunta | Action / params |
|----------|-----------------|
| “¿Qué análisis foliares tiene el limón de Pepe?” | `search_projects` → `project_analyses` type `foliar` |
| “Compara N foliar vs óptimo” | `project_analyses` + leer `macros.N.dop_percent` |
| “Último suelo guardado” | `project_analyses` type `suelo`, `latest_only: true` |
| “Agua de riego del proyecto X” | `project_analyses` type `agua` |
| “¿Cómo se calcula kg/ha en suelo?” | Knowledge este doc o `lab_analyses_catalog` tab `suelo` |

---

## 6. API (referencia)

```http
POST https://nutriplantpro.com/api/admin-assistant
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "action": "project_analyses",
  "params": {
    "project_name": "Produccion Limon",
    "type": "foliar",
    "latest_only": false
  }
}
```

Catálogo estático (sin proyecto):

```json
{ "action": "lab_analyses_catalog", "params": {} }
```

---

## 7. Relación con calculadoras gratis

Las calculadoras de **login** (VPD, enmienda, hidro didáctica, etc.) **no** leen `soilAnalyses[]`.  
Si el usuario trabaja en dashboard **Análisis**, los datos están en la nube y el GPT debe usar `project_analyses`.

*NutriPlant PRO © 2026 — documento interno admin.*
