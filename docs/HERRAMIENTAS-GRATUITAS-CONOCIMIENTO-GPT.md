# NutriPlant PRO — Herramientas gratuitas (conocimiento para Custom GPT)

**Uso:** sube este archivo a tu GPT privado (**Configure → Knowledge → Upload files**).  
**Complemento:** la API admin puede devolver el mismo catálogo con `action: "free_tools_catalog"`.

---

## 1. Qué son y dónde viven

- Páginas HTML (`*-free.html`) y modales en **login.html** (sin cuenta) y en **dashboard** (iconos de la barra lateral).
- Son **material educativo / calculadoras**; no sustituyen el programa nutricional guardado del suscriptor.
- **Persistencia (2026):** casi todas guardan entradas en **localStorage del navegador** (`nutriplant_free_*_v1`). Al cerrar el modal o la pestaña, al volver en el **mismo navegador** se restauran los valores. **No** van a Supabase ni al proyecto del cliente.
- **Excepción importante — 📊 Distribución por etapa:** en **login** solo localStorage del navegador. En **dashboard** (`?ctx=dashboard`): (1) **curva activa** autoguardada en el proyecto (nube + LS por proyecto); (2) **biblioteca «Mis curvas guardadas»** por usuario (LS + Supabase perfil), independiente del proyecto.

---

## 2. Cómo debe responder el GPT

| Situación | Qué hacer |
|-----------|-----------|
| Usuario pregunta por un **cliente/suscriptor** | Usar Actions: `project_detail`, `project_analyses`, etc. **No** asumir datos de calculadoras gratis. |
| Usuario pregunta **cómo funciona** una calculadora gratis | Usar este documento o `free_tools_catalog`. Explicar fórmulas, denominadores de %, límites. |
| Usuario dice “en mi pantalla sale X” sin datos | No inventar X; pedir captura o valores, o explicar el criterio de cálculo. |
| Confundir gratis vs PRO | Hidro **gratis** = didáctica global; Hidroponía **proyecto** = por etapa + fertilizantes + guardado en `projects.data`. |

---

## 3. Catálogo de herramientas

### Conversores (login / dashboard)

| Herramienta | Función |
|-------------|---------|
| **Óxido ↔ Elemental** | Bloque superior: P₂O₅, K₂O, CaO, MgO, SO₃, óxidos de micros ↔ elemental (etiquetas fertilizante). **N en ficha = elemental** (no óxido). Recuadro verde aparte: **N↔NO₃, N↔NH₄, S↔SO₄** (ionómetros / informes iónicos — **no confundir SO₄ con SO₃**). |
| **ppm / mmol / meq** | Macros e iones en mmol/L; **micros (Fe, Mn, Zn, B, Cu, Mo) en µmol/L**; ppm del elemento; Mo como MoO₄²⁻; peso equivalente; categoría meq/cmol en conversor de magnitudes. |
| **Magnitudes físicas** | Longitud, área, volumen, masa, presión, etc. |

#### Conversor Óxido ↔ Elemental — dos bloques distintos

**1) Óxidos de etiqueta (fertilizante / enmienda):** P₂O₅↔P (×0,436 / ×2,291), K₂O↔K (×0,830 / ×1,205), CaO↔Ca, MgO↔Mg, SO₃↔S, Fe₂O₃↔Fe, MnO↔Mn, B₂O₃↔B, ZnO↔Zn, CuO↔Cu, MoO₃↔Mo, SiO₂↔Si — mismos factores que `login.html` / `dashboard.html`.

**2) Elemental ↔ iones en solución (recuadro verde — equipos de medición):**

| Conversión | Factor |
|------------|--------|
| N → NO₃ | ×4,429 |
| NO₃ → N | ×0,226 |
| N → NH₄ | ×1,286 |
| NH₄ → N | ×0,778 |
| S → SO₄ | ×3,000 |
| SO₄ → S | ×0,333 |

**Errores frecuentes a evitar:** mezclar SO₄ (ión) con SO₃ (óxido en etiqueta); aplicar factores de P₂O₅ cuando el usuario pregunta por NO₃ de un ionómetro; asumir que el N de fertilizante viene como óxido.

#### Conversor ppm / mmol / meq — regla µmol/L en microelementos

En **login** y **dashboard** (`measure-units-calculator.js`), NutriPlant usa **mmol/L** para macros e iones de solución (N, P, S, K, Ca, Mg, Na, NO₃, H₂PO₄, SO₄, Cl…) y **µmol/L** para micronutrientes porque sus concentraciones típicas son &lt;1 mmol/L.

| Forma en calculadora | ppm de | PA (g/mol) | Valencia | Unidad mol |
|---------------------|--------|------------|----------|------------|
| Fe²⁺ | Fe | 55,85 | 2 | µmol/L |
| Mn²⁺ | Mn | 54,94 | 2 | µmol/L |
| Zn²⁺ | Zn | 65,38 | 2 | µmol/L |
| Cu²⁺ | Cu | 63,55 | 2 | µmol/L |
| H₃BO₃ | B | 10,81 | 1 | µmol/L |
| MoO₄²⁻ | Mo | 95,95 | 2 | µmol/L |

**Fórmulas (NutriPlant):**
- **µmol/L = (ppm elemento ÷ PA) × 1000**
- mmol/L = µmol/L ÷ 1000
- **meq/L = mmol/L × valencia** (igual que macros)
- ppm = mg/L del **elemento** (ppm Fe, ppm Mo…), no del compuesto iónico completo

**Ejemplo Fe:** 3,00 ppm Fe → µmol/L = (3 ÷ 55,85) × 1000 ≈ **53,7**; mmol/L = 0,054; meq/L = 0,107.

**Mo:** en solución se modela como **MoO₄²⁻** (valencia 2), análogo a S-SO₄²⁻; el ppm reportado es de **Mo elemental**.

**API Socio:** `free_tools_catalog` con `tool_id: "conversor_unidades_nutrientes"`. Manual web: capítulo `unidades-ppm-meq-oxidos`.

### 💧 Diseño de solución nutritiva (`hidro-solucion-free.html`)

- **Flujo didáctico:** CE objetivo → meq/L → % meq → ppm; triángulos **aniónico** (NO₃, P, SO₄) y **catiónico** (K, Ca, Mg) arrastrables.
- **Cl⁻** entra en la **suma de CE**; en % meq de triángulo aniónico **no** entra (va aparte con leyenda N-NO₃ vs Cl).
- **N-NH₄⁺** fuera del triángulo K-Ca-Mg; su % es sobre K+Ca+Mg+NH₄.
- **Persistencia:** `nutriplant_hydro_solucion_free_v1`.
- **No es** la pestaña Hidroponía del proyecto (esa calcula aporte de fertilizantes y guarda en el proyecto).

### 💦 Diagnóstico de agua (`agua-dureza-free.html`)

- Dureza total (ppm CaCO₃, meq/L, °dH/°eH/°fH), Ca/Mg de laboratorio, ácidos para neutralizar HCO₃/CO₃ con residual y volumen (L o m³).

### 🌡️ VPD (`vpd-free.html`)

- Mapa + Open-Meteo (lat/lng), VPD ambiental (T aire + HR), VPD avanzado (T hoja o estimada por radiación).
- Rango orientativo óptimo **0,5–1,5 kPa** (misma lógica que dashboard VPD del proyecto).

### 🚜 Enmiendas por CIC (`enmienda-free.html`)

- Cationes iniciales y objetivo (%), CIC, densidad aparente, profundidad, pH, % de suelo a tratar.
- Enmiendas: yeso, cal agrícola/dolomítica, SOP, MgSO₄; rangos ideales K 3–7 %, Ca 65–75 %, Mg 10–15 %.
- Misma base conceptual que pestaña **Enmienda** del dashboard PRO (PRO guarda en proyecto).

### 📦 Mezcla granular (`granular-mix-free.html`)

- Varias filas: material + % en mezcla → relación N–P₂O₅–K₂O y kg nutriente/ha según dosis.
- Hasta **3 fertilizantes personalizados** (catálogo aparte en LS).

### ⚗️ Composición de fertilizantes (`fertilizer-composition-free.html`)

- Varias moléculas con % en el producto; debajo de cada fila: composición **teórica pura**; recuadro azul: total ponderado elemental + óxidos (P₂O₅, K₂O…).

### 📊 Distribución por etapa (`extraccion-etapa-free.html`)

**Qué hace:** captura **kg/ha totales** por nutriente (demanda del ciclo) y reparte **% por etapa fenológica** → calcula kg/ha por etapa y muestra **gráficas** (macros / micros). No calcula dosis de fertilizantes.

**Flujo en pantalla:** (1) Extracción total kg/ha · (2) % por etapa (suma 100 % por nutriente; nombres de etapa editables) · (3) Tabla kg/ha por etapa · (4) Gráfica.

**Login (gratis):** botón 📊 en login. Persistencia solo **localStorage** del navegador.

**Dashboard PRO:** botón 📊 en barra de calculadoras (iframe `?ctx=dashboard`).
- **Curva del proyecto:** autosave en `project.calculators.extraccionEtapa` + LS `np_extraccion_etapa_{userId}_{projectId}` + sync nube.
- **Biblioteca «Mis curvas guardadas»:** barra con desplegable, título, **Guardar en mi biblioteca**, **Eliminar seleccionada**. Guardado **por usuario** (LS `np_extraccion_etapa_presets_user_{userId}` + Supabase `extraccion_etapa_presets` en perfil). Varias curvas con título; cargar una en el proyecto activo. Si borras un proyecto, la biblioteca **no se pierde**. La biblioteca **no se copia sola** a otros proyectos.

**Relación con Fertirriego/Granular:** el requerimiento (kg/ton × rendimiento, eficiencia) vive en esas pestañas; 📊 documenta la **curva fenológica** sobre kg/ha totales que el técnico trae de ahí, bibliografía o criterio. Referencia cruzada manual; **sin enlace automático** de dosis.

**Reporte PDF (proyecto):** sección «Distribución por etapa» = curva cargada en ese proyecto (no toda la biblioteca).

**Manual público:** https://nutriplantpro.com/manual-tecnico/capitulos/extraccion-nutrimental-por-etapa.html

### ⚛️ Tabla periódica nutrientes (`tabla-periodica-nutrientes-free.html`)

- Referencia visual; sin estado de formulario.

### 🔺 Compatibilidad (`fertilizer-compatibility-free.html`)

- Matriz triangular Compatible / Precaución / Incompatible; ficha por par.

### 🔗 Interacciones y movilidad (`interacciones-absorcion-movilidad-free.html`)

1. **Mulder:** rojo = antagonismo (bidireccional en aristas); azul = sinergia **solo desde el ion que el usuario seleccionó** (no inflar listas cruzadas).
2. **Antagonismos micros en diagrama (2026):** **Cu²⁺ ↔ Mn²⁺** marcados en rojo (competencia entre micros; también Cu–Zn, Cu–Fe, Mn–Fe, Mn–Zn, P alto vs micros). Al tocar Cu²⁺ o Mn²⁺ la ficha y la línea coinciden.
3. **Mecanismos hacia la raíz:** flujo de masa, difusión, interceptación.
4. **Movilidad:** N,P,K,Mg móviles (síntoma hoja vieja); Ca,B poco móviles (punta); Fe,Mn,Zn,Cu según especie.
5. **pH:** disponibilidad relativa por nutriente vs acidez/alcalinidad.

### 🌱 N mineralizable (`n-mineralizable-mo-free.html`)

```
N_min (kg N/ha/año) = 10 000 × (P/100) × DA × 1 000 × (R/100) × (MO/100) × (N_MO/100) × (T_min/100)
```

- P = profundidad (cm), DA = densidad aparente (g/cm³), R = % explorado por raíces, MO = % materia orgánica, N_MO = % N en MO, T_min = factor mineralización (1–3 %, slider).

### 🪨 Agua en suelo y textura (`agua-disponible-textura-suelo-free.html`)

**Pestaña Agua:** CC, PMP (% vol.), profundidad (cm), área (ha), zona radical efectiva (%), θ opcional.

- Volumen suelo (m³) ≈ área_ha × profundidad_cm / 10.
- Agua útil ref. ≈ volumen × (CC−PMP)/100 × (zona_radical/100).

**Pestaña Textura:** % arena, limo, arcilla → clase USDA (triángulo arrastrable).

### 💧 Lámina de riego y balance hídrico (`lamina-riego-free.html`)

- **Ubicación:** mapa + GPS + lat/lng (mismo patrón que **VPD**). Open-Meteo en ese punto → **lluvia** y **ETo FAO-56** (respaldo satelital).
- **Periodos:** **1 y 7 días** (acumulados del periodo). No incluye 30 días (sí en dashboard PRO).
- **Calculadora** (misma lógica que pestaña **Clima → Lluvia/Riego** del proyecto):
  - ETo y lluvia activas (satélite o **valores de campo** manuales).
  - **Macrotúnel / invernadero:** lluvia fijada en 0 mm.
  - **Kc** editable (sin precargar; tabla FAO-56 de referencia abajo).
  - **Riego** del periodo (mm o m³ en franja regada).
  - **Superficie cultivo (ha)** y **superficie regada (ha)** (franja humedecida; vacío = misma que cultivo).
  - **% suelo explorado por raíces** → botón **Sugerir franja regada** (criterio NutriPlant: % × ha cultivo).
- **Resultados:** déficit climático (ETo−lluvia), ETc (ETo×Kc), déficit cultivo, riego aplicado, **balance hídrico** (ETc−lluvia−riego) en **mm** y **m³/ha / m³ total**; si hay franja distinta, también mm equivalentes en franja regada.
- **Recuadro «📍 Dato importante — riego en campo»** (cuando **ha cultivo ≠ ha franja regada**; mismo bloque en gratis y PRO):
  - **Riego sugerido** (m³ totales para cubrir balance pendiente o déficit del periodo).
  - **Lámina en franja** (mm en zona humedecida; = balance o déficit × factor cultivo/regada).
  - **Aplicar en franja regada** (m³ en esas ha).
  - Explica que el m³ total no cambia: en goteo/cinta se concentran en menos ha → más mm en franja.
  - **API PRO:** `balance_wetted_mm` = lámina en franja; `balance_mm` = balance sobre ha cultivo.
- **Nota** (recuadro ámbar translúcido): estimación rápida; no considera almacenamiento en suelo, escurrimiento, drenaje profundo ni lixiviación; validar en campo.
- **Tabla Kc FAO-56** (recuadro azul translúcido, colapsable): buscar cultivo; rangos por etapa fenológica.
- **Persistencia:** `nutriplant_free_lamina_riego_v1` (localStorage).
- **Login:** botón debajo de «Agua en suelo y textura». **Dashboard:** icono 🌧️ en barra de calculadoras.
- **API Socio:** `free_tools_catalog` con `tool_id: "lamina_riego"`.
- **Gratis vs PRO:** la herramienta gratis usa **coordenadas que el usuario elige**; el **proyecto suscriptor** usa polígono del predio + datos guardados en `climateAnalysis` (4 años mensuales, rolling 1/7/30, balance con enlace a análisis de suelo del proyecto).

### 🧂 Solubilidad e índice salino (`solubilidad-indice-salino-free.html`)

- Solubilidad (g/L, ~20–25 °C) e **IS** (NaNO₃ = 100).
- IS alto → más estrés osmótico relativo (cuidado en emergencia, solución madre concentrada); no significa “prohibido”.

---

## 4. % meq — criterio NutriPlant (gratis hidro + PRO)

**No mezclar denominadores:**

| Bloque | % sobre qué suma |
|--------|------------------|
| Triángulo aniones | NO₃ + P + SO₄ = 100 % (Cl **fuera**) |
| Triángulo cationes | K + Ca + Mg = 100 % (NH₄ **fuera**) |
| N-NH₄⁺ | % sobre K + Ca + Mg + NH₄ |
| Cl⁻ (fertirriego gráficas PRO) | % sobre NO₃ + P + SO₄ + Cl |

En **hidro solución gratis**, Cl suma a **CE** aunque no esté en el triángulo N-P-S.

---

## 5. API para el GPT (opcional)

```json
POST https://nutriplantpro.com/api/admin-assistant
Authorization: Bearer <NUTRIPLANT_ADMIN_GPT_TOKEN>
{ "action": "free_tools_catalog", "params": {} }
```

Detalle de una herramienta:

```json
{ "action": "free_tools_catalog", "params": { "tool_id": "hidro_solucion" } }
```

---

## 6. Actualización

Si cambias calculadoras en el repo, vuelve a subir este archivo al GPT y redeploy Netlify para que la API traiga el catálogo nuevo (`netlify/functions/lib/free-tools-catalog.js`).

*NutriPlant PRO © 2026 — documento interno admin.*
