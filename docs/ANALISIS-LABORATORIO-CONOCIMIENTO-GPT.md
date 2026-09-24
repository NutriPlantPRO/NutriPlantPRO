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

## 3b. Comparar análisis (tabla + gráficas) — dashboard y PDF

Cuando hay **varios reportes** del mismo tipo en un proyecto, la app muestra el bloque **«Comparar análisis (tabla y gráficas)»** (i18n ES/EN):

1. **Columnas:** cada análisis es una columna; el usuario activa/desactiva cuáles entran en la comparación/gráficas.
2. **Tablas por bloque** (ej. suelo: pH, físicos/MO, macros ppm, micros ppm, % CIC, cationes meq, relaciones).
3. **Gráficas** solo en bloques chartables (suelo: macros línea, micros línea, % CIC barras). pH/físicos suelen ser **solo tabla**.
4. **Otros tipos** (solución, extracto, agua, foliar, fruta): mismo patrón con sus bloques (macros/micros/calidad/etc.).
5. **Reportes PDF:** al incluir Análisis, el PDF lleva las tablas comparativas + imágenes de las gráficas (no solo el detalle individual).
6. **Admin / ChatGPT:** los valores siguen en `project_analyses`; la UI de comparación es del dashboard/PDF. Al interpretar histórico, puedes alinear varios reportes del mismo `type` por fecha/título como hace la app.

No inventar series ni promedios si la API no los trae; leer cada reporte.

---

## 4. Criterios por pestaña

### 4.1 Análisis de suelo

**Secciones:** Físico · pH y sales · Fertilidad · Cationes intercambiables · Relaciones.

**Fertilidad — fila Ideal (referencia):**
- **K, Ca, Mg (ppm):** si hay CIC (meq/100g en Cationes):  
  `meq_ideal = CIC × fracción` (K 5 %, Ca 70 %, Mg 13 % de saturación).  
  `ppm = meq × factor` (K×391, Ca×200,4, Mg×121,5).  
  **No dependen del extractante de P/micros:** salen de saturación de CIC (habitualmente cationes en acetato de amonio).
- **P, Fe/Mn/Zn/Cu y B:** el **método de extracción es obligatorio para interpretar**. Un ppm no es universal: es lo que ese extractante sacó. Ver §4.1.1.
- **Otros (MO, N-NO₃, Na, S, Mo, Al):** referencias fijas NutriPlant (botón recargar). N-NO₃ suele ser KCl; MO Walkley-Black o combustión — no usan el selector de P/micros.

#### 4.1.1 Métodos de extracción (P, micros, B) — criterio que el GPT debe aplicar

**Regla de oro:** no compares ni interpretes un valor de laboratorio **sin el método**. 20 ppm de Fe en DTPA no es lo mismo que 20 ppm en Mehlich 3. 25 ppm de P Olsen no es 25 ppm Bray. Si el suscriptor pega un informe y no dice el extractante, **pregúntalo** o usa el método guardado en el reporte (`fertility.pMethod`, `fertility.microMethod`, `fertility.bMethod`). Si falta el campo, asume defaults de la app (P Bray, micros DTPA, B agua caliente) y **decláralo**.

**En la UI (cabecera de la tabla Fertilidad, mismo estilo):**
- **P:** selector propio `Bray` | `Olsen` | `Merich` (Mehlich 3). Al cambiar **pisa** el ideal de P.
- **Fe, Mn, Zn, Cu:** **un** selector en la columna Fe (`DTPA` | `Merich` | `Otro`). Aplica a los cuatro. Al cambiar **pisa** esos cuatro ideales (excepto `Otro`, que no toca cifras).
- **B:** selector propio (`AguaCaliente` | `Merich` | `Otro`). No viaja con DTPA. Al cambiar **pisa** el ideal de B (excepto `Otro`).
- Los ideales **siguen editables**. Se guardan en `fertility.ideal` + el método, en **ese reporte** (`soilAnalyses[]` → nube). No es un default global de la cuenta.
- Si el usuario **vuelve a cambiar el método**, la app **vuelve a poner** el default de ese método y pisa lo editado.
- Botón **Recargar valores ideales:** rellena generales + P/micros/B según el método **actualmente seleccionado**; K/Ca/Mg desde CIC si hay.

**Defaults de la app (ppm, fila Ideal) al elegir método:**

| Método | Qué rellena |
|--------|-------------|
| P Bray | P = 40 |
| P Olsen | P = 25 |
| P Merich (Mehlich 3) | P = 40 |
| Micros DTPA | Fe 20 · Mn 20 · Zn 3 · Cu 1,5 |
| Micros Merich | Fe 50 · Mn 20 · Zn 3 · Cu 2 |
| Micros Otro | no cambia Fe/Mn/Zn/Cu |
| B Agua caliente | B = 1 |
| B Merich | B = 1,2 |
| B Otro | no cambia B |

Esos números son **punto de partida NutriPlant**, no un estándar internacional. Mehlich 3 suele extraer **más** que DTPA en Fe (y a menudo Cu); por eso el ideal de Fe sube a 50. El agrónomo puede editar.

**Qué no tiene selector (y por qué):**
- K, Ca, Mg → CIC (acetato de amonio típico).
- N-NO₃, MO, Na, S, Mo, Al → no se interpretan con el menú de P/micros. S y Mo también dependen del extractante en lab, pero en app solo hay nota/ideal general.

**Cómo debe hablar el GPT:**
1. Lee `pMethod`, `microMethod`, `bMethod` del reporte (API `project_analyses` type `suelo`).
2. Al citar ppm de P/Fe/Mn/Zn/Cu/B, **nombra el método** («Fe 39,9 ppm DTPA»).
3. **No compares** dos reportes (ni lab vs literatura) si el extractante es distinto, salvo que expliques que las cifras no son 1:1.
4. Si el método del PDF/lab no coincide con el selector del reporte, di que hay que **alinear el selector o editar el ideal**.
5. kg/ha y suficiencia usan el **ideal guardado** (el editado, no necesariamente el default).
6. En Comparar análisis: si dos columnas tienen distinto `pMethod`/`microMethod`/`bMethod`, avisa que el gráfico de ppm mezcla extractantes.

**kg/ha (ajuste):**
```
kg/ha = (nivel_laboratorio − ideal) × 0.1 × profundidad_cm × densidad_aparente × (suelo_explorado_% / 100)
```
- Negativo = **falta**; positivo = **exceso**.
- `profundidad_cm` y `suelo_explorado_%` en Fertilidad; densidad en Físico (default 1 g/cm³ si vacío).

**Suficiencia y ajuste agronómico para el ciclo:**
```
suficiencia_pct = (nivel_laboratorio / ideal) × 100
diferencia_considerada = kg_ha_ajuste × (factor_ciclo_pct / 100)
```
- La suficiencia no se limita a 100 %. Si el ideal es cero o falta, se devuelve `null`/«—».
- Factor inicial editable: 10 % si suficiencia ≥ 50 %; 5 % si es menor. Un factor editado se guarda en el reporte.
- Negativo en diferencia considerada = parte del faltante a corregir; positivo = exceso reconocido como aporte potencial.
- MO, Na y Al no usan factor del ciclo.

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
- **En Hidroponía → Cálculo:** se puede «Traer de análisis» al final. **No resta** como el agua. Si pasta &gt; objetivo → bajaría = (pasta − objetivo) × f (f editable). Botón Aplicar baja el objetivo 1×/análisis. Steiner = equilibrio iónico, no resta 1:1. Manual: `analisis-extracto-pasta` + `hidroponia-solucion-por-etapa`.

---

### 4.4 Análisis de agua

- Volumen m³ riego (contexto).
- CE, pH, RAS; Ca, Mg, K, Na; NO₃, SO₄, HCO₃, CO₃ (meq en carbonatos).
- Residual ácido (meq/L) + tipo de ácido. Catálogo: **HNO₃ 55%** (líquido; aporta N-NO₃; UI mL/m³ y L), H₂SO₄ 98%, H₃PO₄ 75%/85%, **Ácido Cítrico Anhidro 99.5%** (**polvo**; 25,9 meq/mL; solo acidifica; UI **g/kg** o **oz/lb** US; volumen solo equiv.). Misma lógica en Hidroponía (tanque C, cítrico en kg), PDF, admin y agua-dureza gratis.
- Micros ppm.

---

### 4.5 Análisis foliar

- Macros en **%** (N, P, K, Ca, Mg, S).
- Micros en **ppm** (Fe, Mn, Zn, Cu, B, Mo).
- **DOP %** = (resultado − óptimo) / óptimo × 100.
- Óptimos por defecto editables (ej. N 3 %, P 0,275 %, Fe 150 ppm…).
- **Relaciones nutrimentales** (debajo del DOP, también admin/PDF): N/K, N/P, N/S, Ca/K, K/Mg, Ca/Mg, K/(Ca+Mg), P/Zn, Fe/Mn, Ca/B. Real = resultados; ideal = óptimos del mismo reporte (si editan un óptimo, la ideal se recalcula). P/Zn y Ca/B: macro % × 10 000 → ppm. Desviación = ((real − ideal) / ideal) × 100; mismo semáforo que DOP. No hay ideales de relación aparte.

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
