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
| Usuario en **inglés** o **US customary** | Las herramientas de agua/clima (incl. 🍃 foliar y 🎯 uniformidad) siguen idioma + sistema de unidades del perfil; la física interna es SI. |
| Usuario dice “en mi pantalla sale X” sin datos | No inventar X; pedir captura o valores, o explicar el criterio de cálculo. |
| Confundir gratis vs PRO | Hidro **gratis** = didáctica global; Hidroponía **proyecto** = por etapa + fertilizantes + guardado en `projects.data`. |

---

## 3. Catálogo de herramientas

### Conversores (login / dashboard)

| Herramienta | Función |
|-------------|---------|
| **Óxido ↔ Elemental** | Bloque superior: P₂O₅, K₂O, CaO, MgO, SO₃, óxidos de micros ↔ elemental (etiquetas fertilizante). **N en ficha = elemental** (no óxido). Recuadro verde aparte: **N↔NO₃, N↔NH₄, S↔SO₄** (ionómetros / informes iónicos — **no confundir SO₄ con SO₃**). |
| **ppm / mmol / meq** | Macros e iones en mmol/L; **micros (Fe, Mn, Zn, B, Cu, Mo) en µmol/L**; ppm del elemento; Mo como MoO₄²⁻; peso equivalente; categoría meq/cmol en conversor de magnitudes. |
| **Magnitudes físicas** | Longitud, área, volumen, masa, presión, concentración, carga iónica. **+ Alcance de raíz — copa/planta** (radio, diámetro u orilla a orilla × plantas/ha → % superficie). **+ Alcance de raíz — cama/banda** (distancia surcos, ancho cama, % raíz en cama → % superficie). |

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

- **Tres pestañas:** (1) **Programa del ciclo** — etapas con título, catálogo Steiner/Hoagland/propias, ternario de la etapa activa, gráficas meq/ppm (aniones ■ línea continua; cationes ● punteada; tips macros/micros). (2) **Diseño objetivo** — CE → meq/L → % meq → ppm; triángulos arrastrables. (3) **Aporte fertilizantes**.
- **Cl⁻** entra en la **suma de CE**; en % meq de triángulo aniónico **no** entra (va aparte con leyenda N-NO₃ vs Cl).
- **N-NH₄⁺** fuera del triángulo K-Ca-Mg; su % es sobre K+Ca+Mg+NH₄.
- **Login / gratis:** persistencia local (`nutriplant_hydro_solucion_free_v1` / programas propios en LS).
- **Dashboard PRO:** botón «Programa del ciclo» en Solución Nutritiva abre la misma UI en modal; el plan multi-etapa se guarda en el proyecto como **`hidroponia.cycleProgram`** (nombre, etapas meq/ppm, activa). Visible en **admin**. En Reportes PDF: casilla **Programa del ciclo** (`hydroCycle`), **independiente** de la sección Hidroponía (diseño activo + fertilizantes).
- **No confundir con:** Análisis → Solución Nutritiva (laboratorio) ni con «Solución por etapa» del módulo PRO (diseño de una etapa activa para cálculo de sales).

**API Socio:** `free_tools_catalog` con `tool_id: "hidro_solucion"`.

### ⏱️ Pulso de riego en hidroponía (`hidro-pulso-riego-free.html`)

**Qué hace:** calcula **litros y minutos** del pulso de riego en contenedor (hidroponía/sustrato) según volumen, agua disponible (ATD), agotamiento, drenaje, macetas y goteros.

**Dónde:** login (modal) + icono ⏱️ en barra del dashboard PRO. No es la pestaña Clima ni el balance hídrico 🌧️ de suelo.

**Flujo UI:**
1. **Contenedor, sustrato y criterio** — V (L); % ATD (catálogo orientativo: coco, perlita, lana de roca… o sustrato personalizado); % agotamiento permitido; % drenaje (lavado de sales). Criterio ideal: reponer el agotamiento de la ATD y sumar el % de drenaje.
2. **Sistema de riego** — nº macetas, goteros/maceta, caudal L/h por gotero.
3. **Resultados** — L netos (sin drenaje), L pulso/maceta (con drenaje), minutos del pulso, L total del turno.

**Fórmulas:**
- `L_neto = V × (ATD%/100) × (agotamiento%/100)`
- `L_pulso = L_neto ÷ (1 − drenaje%/100)`
- `min = (L_pulso ÷ (goteros_por_maceta × L/h)) × 60`
- `L_total = L_pulso × macetas`

**Persistencia:** solo `nutriplant_free_hidro_pulso_riego_v1` (navegador). No se guarda en el proyecto nube.

**API Socio:** `free_tools_catalog` con `tool_id: "hidro_pulso_riego"`.

**Errores a evitar:** confundir con lámina/balance 🌧️ de suelo; inventar % ATD sin decir que el catálogo es orientativo; omitir que el drenaje debe validarse en campo.

### 💦 Diagnóstico de agua (`agua-dureza-free.html`)

- Dureza total (ppm CaCO₃, meq/L, °dH/°eH/°fH), Ca/Mg de laboratorio, ácidos para neutralizar HCO₃/CO₃ con residual y volumen (L o m³).
- **Ácidos en catálogo (misma lógica que Análisis → Agua, Hidroponía, admin y PDF):** HNO₃ 55% (11,6 meq/mL; **aporta N-NO₃**; líquido → **mL/m³ y L**), H₂SO₄ 98% (36,7; S; líquido), H₃PO₄ 75%/85% (P; líquido), **Ácido Cítrico Anhidro 99.5%** (**polvo soluble**; 25,9 meq/mL; C₆H₈O₇; **solo acidifica, sin N/P/K**; UI primaria **g/m³ o kg** / **oz o lb** en US customary; mL/L solo equivalencia volumétrica con densidad ~1,665).

### 🌡️ VPD (`vpd-free.html`)

- Mapa + Open-Meteo (lat/lng), VPD ambiental (T aire + HR), VPD avanzado (T hoja o estimada por radiación).
- Rango orientativo óptimo **0,5–1,5 kPa** (misma lógica que dashboard VPD del proyecto).

### 🌤️ Pronóstico agroclimático (`/pronosticoclimatico/`)

**Qué es:** herramienta gratuita de lectura agroclimática por punto + (opcional) servicio de **alertas agroclimáticas semanales** por correo. **No** es el estimador VPD 🌡️ ni la pestaña **Clima** del proyecto PRO.

**Dónde:**
| Entrada | URL / UI |
|---------|----------|
| Página pública | `https://nutriplantpro.com/pronosticoclimatico/` |
| Login (modal) | botón **Pronóstico agroclimático** → `?embed=login` |
| Dashboard PRO (barra) | icono 🌤️ → `?embed=dashboard` |
| Registro alerta | `?view=registro` |
| Reporte personal (correo) | `?token=...` (enlace seguro; no lleva PII en el token) |
| Admin | `admin/agroclimate.html` — solicitudes, mapa, aprobar/pausar, WA, envío manual |

**Herramienta gratis (sin cuenta):** mapa Leaflet (GPS / clic / lat-lng), Kc manual o referencia FAO, generar lectura bajo demanda. Tabla ~**7 d histórico + 7 d pronóstico**: T mín/máx, HR mín/máx, rocío, **Rad máx W/m²**, VPD mín/máx, **ETo**, **ETc = ETo × Kc**, lluvia. Gráfica: barras de **horas VPD** por bandas (&lt;0,5 / 0,5–1,5 / &gt;1,5 kPa) + líneas lluvia/ETo/ETc. PDF en vista personal. Explorar el mapa **no** guarda predio en nube.

**Alertas semanales (servicio aparte de la suscripción PRO):**
1. Usuario solicita desde la herramienta (1 predio por persona).
2. Folio alfanumérico 4 caracteres por WhatsApp → estados `pending_whatsapp` → `pending_review`.
3. Admin aprueba en `agroclimate.html` → `active`.
4. Domingo **17:00** (zona horaria del predio, Open-Meteo `timezone=auto`): correo desde `notifications@nutriplantpro.com` con resumen + link del reporte.
5. WhatsApp = **manual** (botón admin: *«Hola {nombre}. Soy de NutriPlant PRO y te escribo sobre tu solicitud… folio {código}»*). Sin Meta Cloud API.
6. Pausar / baja: admin o solicitud del usuario (enlace de baja abre WA). Cambios permanentes de **Kc o coordenadas**: WhatsApp o edición admin.

**API Socio:** `free_tools_catalog` con `tool_id: "pronostico_agroclimatico"`.

**Errores a evitar:** confundir con VPD gratis; asumir que generar lectura = ya hay alerta activa; inventar folio/estado de un solicitante sin panel admin; decir que es parte del plan $49/5 meses de NutriPlant PRO.

### 🍃 Ventanas de Aplicación Foliar (`ventanas-foliar-free.html`)

- **Qué es:** clasifica **hora por hora (24 h, incluye noche)** si el ambiente favorece pulverizar en **un solo lote**. Semáforo de 5 colores. **No** compara varias zonas/fincas.
- **Sweet spot (muy favorable, criterio de aplicación):** T **15–25 °C**, HR **50–80 %**, viento **2–8 km/h** (las tres a la vez). DPV aire **0,3–1,2 kPa**, lluvia **0 mm** y sin lluvia ~2 h. Techo 80 % (no 70): costa/trópico; rocío lo atrapa el DPV bajo.
- **Banda más amplia (publicación NutriPlant, referencia):** T 18–28 °C, HR &gt; 60 %, viento 3–12 km/h. Fuera del sweet spot pero dentro de esa banda suele ser **favorable**.
- **Regla:** `clase = máx(T, HR, viento, DPV, lluvia)` — manda el **factor limitante**. DPV = Magnus del **aire** (no T hoja). Escalones default (capítulo público): T ±2/4/7 °C; HR asimétrica (suave 81–90, dura &lt;50); viento calma &lt;1 vs deriva &gt;16; DPV bajo &lt;0,15 = precaución no rojo, alto &gt;1,2 salta a precaución; lluvia 0,1 mm hora / 0,5 mm rojo / prob 50–70 %. Si el usuario cambia min/max, las distancias salen de esos límites.
- **UI:** matriz ~**3 días** Open-Meteo **24 h** (se puede filtrar 05–20 h); toca una hora → interpretación. Noche: aviso de inversión/rocío. Lista «Mejores ventanas». **Idioma ES/EN** y unidades **métrico / US customary** del perfil (T °C/°F, viento km/h/mph); física interna SI.
- **Dónde:** login (debajo de Pronóstico agroclimático) y dashboard icono 🍃.
- **Persistencia:** `nutriplant_free_ventanas_foliar_v1`.
- **≠** VPD 🌡️ (cálculo puntual) · Pronóstico agroclimático 🌤️ (tabla diaria + alertas) · Clima PRO.
- **API Socio:** `free_tools_catalog` `tool_id: "ventanas_foliar"`. Manual: `ventanas-aplicacion-foliar`. Core: `assets/np-foliar-window-core.js`.

**GPT — errores a evitar:**
- Inventar varias filas tipo Arandas/Guzmán/Zamora: en NutriPlant es **un lote**.
- Confundir con análisis foliar DOP (laboratorio).
- Tratar el color como receta de producto o dosis.

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

- Tres pestañas: **Tabla periódica** (elementos esenciales/benéficos), **Peso molecular** (fórmula → PM, % elemental y peso equivalente) y **Formas iónicas / 3D**.
- La pestaña **Formas iónicas / 3D** resume formas absorbidas por planta (NO₃⁻, NH₄⁺, H₂PO₄⁻, HPO₄²⁻, SO₄²⁻, H₃BO₃, MoO₄²⁻, K⁺, Ca²⁺, Mg²⁺), fuentes fertilizantes (KNO₃, Ca(NO₃)₂, MKP, MAP, NH₄NO₃, K₂SO₄/SOP, (NH₄)₂SO₄, MgSO₄·7H₂O, Mg(NO₃)₂·6H₂O, CaCl₂·2H₂O, KCl), quelatos (Fe-EDTA, Fe-DTPA, Fe-EDDHA, Zn-EDTA, Mn-EDTA) y precipitados/baja solubilidad (CaSO₄, Ca₃(PO₄)₂, FePO₄, CaCO₃, MgCO₃, Ca(HCO₃)₂, Mg(HCO₃)₂).
- Modelo 3D: usa PubChem + 3Dmol cuando la estructura está disponible. Si no hay estructura usable, muestra **modelo NutriPlant con enlaces explícitos** para conservar arquitectura visual básica: trigonal plana (`NO₃⁻`, `CO₃²⁻`, `H₃BO₃`), tetraédrica (`NH₄⁺`, `SO₄²⁻`, `PO₄³⁻`, `H₂PO₄⁻`, `HPO₄²⁻`), unidad iónica representativa en sales e hidratos, unidad mineral representativa en precipitados y complejo quelatado representativo en EDTA/DTPA/EDDHA. No presentarlo como cristalografía exacta.

### 🧬 Atlas Fisiológico Vegetal (`atlas-aminoacidos-vegetales-free.html`)

Dos pestañas en la misma herramienta (login/dashboard, icono 🧬):

#### Pestaña Aminoácidos
- Biblioteca interactiva de los **20 aminoácidos proteinogénicos** con enfoque en nutrición y fisiología vegetal.
- Incluye nombre común, nombre L-alpha (glicina: no quiral), abreviaturas, fórmula molecular, peso molecular, familia química, rutas metabólicas en plantas, función fisiológica, beneficios agronómicos, fenología, estrés, precursores metabólicos, categorías funcionales, nivel de evidencia y bibliografía base.
- **Modelo 3D:** usa **3Dmol.js + PubChem SDF 3D** cuando hay conexión; permite rotación, zoom y selección de átomos con etiqueta. Colores CPK/Jmol: C gris, H blanco, O rojo, N azul, S amarillo.
- **Filtros principales:** estrés, fenología y formulación nutricional. Filtros secundarios: categoría funcional y nivel de evidencia.
- **Categorías funcionales automáticas:** metabolismo del nitrógeno, fotosíntesis, respuesta al estrés, desarrollo radicular, crecimiento vegetativo, floración, cuajado, llenado de fruto, defensa vegetal, antioxidantes, precursor hormonal y transporte de nitrógeno.
- **Fuentes criterio:** PubChem, KEGG, PlantCyc, Plant Physiology and Development, Biochemistry & Molecular Biology of Plants, Marschner y artículos científicos. No presentar beneficios como garantía de campo; dependen de cultivo, dosis, fuente, mezcla, vía de aplicación y condición ambiental.

#### Pestaña Ciclo hormonal
- **Mapa visual didáctico** (no valores de laboratorio): curvas suaves de tendencia relativa de 5 fitohormonas en 4 etapas fenológicas.
- **Secuencia de transición:** Citoquinina → Auxina → Giberelinas → Etileno → ABA. Los puntos blancos marcan el **cambio de mando** hormonal (cruce entre curvas).
- **Etapas:**
  - **I — Germinación y Establecimiento:** evento *Iniciación celular (División celular)*; hormonas CK + Auxina; nutrientes N, Ca, P, Zn, Mg, K, Mn.
  - **II — Crecimiento Vegetativo:** evento *Crecimiento celular · Madurez celular*; hormonas Auxina + GA; nutrientes Ca, Cu, Mg, B, Mn, N, Zn, NO₃.
  - **III — Floración y Reproducción:** evento *Senescencia* (transición reproductiva); hormonas GA + Etileno; nutrientes Ca, B, Mg, N amínico.
  - **IV — Maduración y senescencia:** evento *Cierre del ciclo fisiológico*; hormonas Etileno + ABA; nutrientes B, Cu, P, K, Mo, Mg, N amínico.
- **Transiciones en el gráfico:** Iniciación (CK→Auxina), Crecimiento (Auxina→GA), Madurez (GA→Etileno), Senescencia (Etileno→ABA).
- **Fichas por hormona/etapa:** rol fisiológico, interpretación agronómica, nutrientes cofactores y aminoácidos vinculados (p. ej. triptófano→auxinas, metionina→etileno).
- **Criterio GPT:** modelo general válido para la mayoría de cultivos; el timing varía por especie, variedad, clima y manejo. No es curva de laboratorio ni protocolo único por cultivo.
- **Aviso:** cualquier desequilibrio hormonal-nutricional en una transición puede reducir irreversiblemente la expresión genética.
- **Fuentes:** Taiz & Zeiger, Marschner, BMBP, KEGG (biosíntesis hormonal).

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

**Pestaña Agua:** CC, PMP (% vol.), profundidad (cm), área (ha), % suelo explorado — superficie/franja (%), θ opcional.

- Volumen suelo (m³) ≈ área_ha × profundidad_cm / 10 (equiv. área × 10 000 × prof/100).
- Agua útil ref. ≈ volumen × (CC−PMP)/100 × (% superficie/100).
- **Zona objetivo riego (40–60% agua útil):** entre PMP y CC, no % del CC absoluto. Objetivo bajo = PMP + 0,4×(CC−PMP); objetivo alto = PMP + 0,6×(CC−PMP). Franja **violeta** en gráfica + recuadro morado «hasta objetivo (60% AU)» cuando θ está bajo esa zona.
- **Gráfica:** barra horizontal; título incluye «Proporción de agua por estado · % volumétrico de referencia (eje horizontal)»; debajo del eje, marcas 0–40% y bloque «Objetivo riego»; renglones PMP/CC/θ/lámina con **mm · m³** en cada línea.
- Con θ: recuadro **azul principal** (m³ · mm hasta CC en franja) + texto «Aplica X m³… eso son Y mm — no son dos riegos». Recuadro **violeta** opcional hasta objetivo 60% AU (menor que hasta CC si θ ya está alto).
- **m³ vs mm:** `m³ = mm × ha × 10`. En campo **aplicar m³** en franja. mm en franja = lámina en suelo humedecido; mm ref. ha cultivo = mismos m³ ÷ (ha cultivo × 10) — solo referencia, no segunda dosis. Ej.: 10 m³ en 0,5 ha = 2 mm franja = 1 mm ref. 1 ha.
- Publica puente `nutriplant_bridge_soil_water_v1` (m³ CC, m³ objetivo, exceso, ha franja, mm, zona objetivo). Persistencia: `nutriplant_free_agua_disponible_textura_v1`.

**Pestaña Textura:** % arena, limo, arcilla → clase USDA (triángulo arrastrable); presets CC/PMP ilustrativos.

**GPT — preguntas frecuentes:**
- «¿Riego m³ o mm?» → **m³ en franja**; mm es la misma agua en otra unidad.
- «¿Por qué 1 mm cultivo y 2 mm franja con mismos m³?» → distinta ha de referencia; el volumen no cambia.
- «¿Hasta CC u objetivo?» → CC = techo físico; objetivo 60% AU = referencia agronómica para no sobre-regar.

### 💧 Lámina de riego y balance hídrico (`lamina-riego-free.html`)

- **Ubicación:** mapa + GPS + lat/lng (mismo patrón que **VPD**). Open-Meteo en ese punto → **lluvia** y **ETo FAO-56** (respaldo satelital).
- **Periodos:** **1 y 7 días** (acumulados del periodo). No incluye 30 días (sí en dashboard PRO).
- **Calculadora** (misma lógica que pestaña **Clima → Lluvia/Riego** del proyecto):
  - ETo y lluvia activas (satélite o **valores de campo** manuales).
  - **Macrotúnel / invernadero:** lluvia fijada en 0 mm.
  - **Kc** editable (sin precargar; tabla FAO-56 de referencia abajo).
  - **Riego en franja regada (periodo):** solo **m³** (volumen total aplicado en la franja; ya no hay selector mm — evita confusión). Requiere «Superficie regada»; la lámina en mm se calcula en resultados.
  - **🪨 Referencia almacén suelo:** desplegable **— Sin ajuste —** / **Déficit (+ riego)** / **Exceso (− riego)** + m³ en franja (manual). Botón **«Sugerir desde 🪨 suelo»** prellena desde puente (prioriza m³ hasta **objetivo 60% AU** si θ &lt; zona 40–60% AU; si no, hasta CC). **Solo suma o resta al total integrado** si el usuario deja valor; vacío = no considerar. Persistencia: `irr-soil-mode`, `irr-soil-m3` (gratis) / `soilStorageMode`, `soilStorageM3` (PRO).
  - **Superficie cultivo (ha)** y **superficie regada (ha)** (franja humedecida; vacío = misma que cultivo).
  - **% suelo explorado por raíces** → **Sugerir franja regada**; recuadro **Criterio NutriPlant** + tablas Kc y **% suelo explorado por sistema** (desplegables).
- **Resultados:** déficit climático, ETc, déficit cultivo, riego aplicado (m³ en franja), **balance** en mm y m³. Balance = **déficit m³ cultivo − riego m³ en franja**. Si hay ajuste 🪨 manual: líneas «Ajuste almacén suelo» y **«Total integrado (clima ± almacén suelo)»**; recuadro azul usa total integrado.
- **m³ vs mm:** priorizar **m³ en franja** para operar; `m³ = mm × ha × 10`. Mismo m³ → más mm en franja que mm ref. ha cultivo (ej. 10 m³ en 0,5 ha = 2 mm franja; ref. 1 ha = 1 mm).
- **Recuadro «📍 Dato importante — riego en campo»** (cuando **ha cultivo ≠ ha franja regada**; mismo bloque en gratis y PRO):
  - **Riego sugerido** (m³ totales para cubrir balance pendiente o déficit del periodo).
  - **Lámina en franja** (mm en zona humedecida; = balance o déficit × factor cultivo/regada).
  - **Aplicar en franja regada** (m³ en esas ha).
  - Explica que el m³ total no cambia: en goteo/microaspersor se concentran en menos ha → más mm en franja.
  - **API PRO:** `balance_mm` = balance mm ref. ha cultivo (desde balance m³ ÷ 10×ha cultivo); `balance_wetted_mm` = lámina equivalente en franja regada.
- **Nota** (recuadro ámbar translúcido): estimación rápida; ajuste 🪨 almacén suelo es opcional y manual; no considera escurrimiento, drenaje profundo ni lixiviación; validar en campo.
- **Reporte PDF (PRO):** sección Clima puede incluir balance hídrico guardado + bloque 🪨 suelo (sesión navegador, zona objetivo).
- **Tabla Kc FAO-56** y **Referencia % suelo explorado por sistema** (pestañas desplegables bajo el resumen).
- **Persistencia:** `nutriplant_free_lamina_riego_v1` (localStorage).
- **Login:** botón debajo de «Agua en suelo y textura». **Dashboard:** icono 🌧️ en barra de calculadoras.
- **API Socio:** `free_tools_catalog` con `tool_id: "lamina_riego"`.
- **Gratis vs PRO:** la herramienta gratis usa **coordenadas que el usuario elige**; el **proyecto suscriptor** usa polígono del predio + datos guardados en `climateAnalysis` (4 años mensuales, rolling 1/7/30, balance con enlace a análisis de suelo del proyecto).

### 📈 Rendimiento hídrico — ISH (`ish-rendimiento-free.html`)

- **Qué es:** **Índice de Satisfacción Hídrica (ISH)** del ciclo → techo de **rendimiento relativo al agua** (no predice cosecha comercial).
- **Fórmula:** `ISH = 100 × [1 − Σ(Dᵢ + Fₚ·Eᵢ) / Σ ETcᵢ]`. Semanas (máx. **52**). Curva **solo baja o se mantiene** (denominador = Σ ETc del ciclo completo).
- **Dónde:** login/dashboard (icono 📈). **PRO:** Clima → subpestaña **Rendimiento hídrico** (misma física; polígono + nube `climateAnalysis.ish`).
- **Entradas:** fechas de ciclo; mapa/GPS/lat-lng (gratis) o centro de polígono (PRO); **Obtener lluvia y ET₀** (Open-Meteo) o manual; **Kc** + tabla FAO; **Fp** default **0,25**; macrotúnel = lluvia 0; riego opcional por semana **mm ↔ m³/ha** (1 mm = 10 m³/ha; US: in · US gal/acre) + **% efectivo**.
- **PRO extra:** traer riego de Lluvia/Riego **solo si el periodo allá es 7 días**; sync Kc con balance; PDF/Admin.
- **Lectura orientativa:** ≥85 % agua casi no limita (modelo); 70–85 % estrés acumulado; &lt;70 % techo hídrico tocado. Validar en campo.
- **≠ lámina_riego / balance:** esa responde «¿cuántos m³ en 1/7/30 d?»; ISH responde «¿cuánto del techo hídrico del ciclo se sostuvo?».
- **Persistencia:** `nutriplant_free_ish_rendimiento_v1` (localStorage).
- **API Socio:** `free_tools_catalog` con `tool_id: "ish_rendimiento"`. Manual: capítulo `ish-rendimiento-hidrico`.
- **Core:** `assets/np-ish-core.js` (misma lógica free + PRO).

**GPT — preguntas frecuentes:**
- «¿ISH = rendimiento real?» → **No**; techo relativo al agua. Nutrición, sanidad, variedad, etc. también pesan.
- «¿Por qué la curva no sube?» → el modelo acumula merma con Σ ETc del ciclo; una semana buena no borra déficit previo.
- «¿Fp?» → pondera exceso frente a déficit (0 = solo sequía; 1 = exceso = déficit). Default 0,25.
- «¿Misma que lámina?» → **No**. Lámina = balance de periodo / m³ a aplicar; ISH = satisfacción del ciclo.

### 🎯 Uniformidad de riego (`uniformidad-riego-free.html`)

- **Qué es:** cómo se **reparte** el agua (y el fertirriego) entre goteros o zonas. Varios **lotes** con título editable y **Muestra 1, 2, 3…**. Unidad al inicio: caudal L/h (o gph), volumen mL/cm³/L/fl oz/gal, o lámina mm/in.
- **Campo:** caudal individual y promedio; **DU 25%** = media del 25% más bajo / media total (n/4 redondeado); **CU Christiansen**; CV; filas en rojo = cuarto bajo; agua **mm y m³/ha** (1 mm = 10 m³/ha) o **in y US gal/acre** si US customary, si hay horas + marco de plantación o lámina.
- **Fertirriego:** el nutriente viaja con el agua. Cuarto bajo ≈ dosis prevista × DU/100; zona alta ≈ dosis × (qmáx/q̄). Opcional: kg/ha (o lb/acre) o kg/m³ (o lb/1000 US gal).
- **Diseño EU (Keller–Karmeli):** `EU = 100 × (1 − 1.27 × CVf / √ep) × (qmin / q̄)`; `q = qn × (P/Pn)^x` (x típico 0,5). Ejemplo de tabla crítica: CVf 0,03, ep 2, qn 0,51 L/h, Pn 5,5 MCA, Pin 11,25 MCA → **EU 91,1%**. Presiones **MCA o PSI** y caudal **L/h o gph** según perfil.
- **UI:** **Idioma ES/EN** + métrico/US del usuario; física interna SI (mm, L/h, MCA, kg/ha).
- **Bandas DU:** ≥90 excelente · 80–90 buena · 70–80 aceptable · &lt;70 revisar sistema. Recomendado ≥16 goteros/lote.
- **Dónde:** login (junto a ISH) y dashboard icono 🎯.
- **Persistencia:** `nutriplant_free_uniformidad_riego_v1`.
- **≠** lámina 🌧️ (m³ a aplicar) · ISH 📈 (techo de ciclo) · pulso ⏱️ (L y minutos en hidro).
- **API Socio:** `free_tools_catalog` `tool_id: "uniformidad_riego"`. Manual: `uniformidad-riego`. Core: `assets/np-irrigation-uniformity-core.js`.

**GPT — errores a evitar:**
- Confundir DU de campo (muestras) con EU de diseño (presiones + CVf).
- Decir que un DU alto basta: no dice si la lámina es suficiente (eso es el balance).
- Inventar que el fertirriego se reparte más uniforme que el agua.

### 🧂 Solubilidad e índice salino (`solubilidad-indice-salino-free.html`)

- Solubilidad (g/L, ~20–25 °C) e **IS** (NaNO₃ = 100).
- IS alto → más estrés osmótico relativo (cuidado en emergencia, solución madre concentrada); no significa “prohibido”.

### 🌍 Huella de carbono de fertilizantes (`fertilizer-carbon-free.html`)

- **Alcance:** estimación **CO₂e de referencia** (educativa/comparativa). **No** certificación, inventario oficial ni datos de marcas comerciales. Marco legal: T&amp;C §7 (`terminos-condiciones.html#huella-carbono`). Manual: capítulo `huella-carbono-fertilizantes`.
- **Persistencia:** `nutriplant_free_fertilizer_carbon_v2` (localStorage). Escenarios `scenario_a` / `scenario_b`.
- **Login / dashboard:** icono 🌍 en barra de calculadoras.

#### Tres componentes del total CO₂e

| Bloque | Método | Notas |
|--------|--------|-------|
| **Fabricación** | kg CO₂e/kg por región | **Productos N** (urea, AN, CAN, UAN): calibrados vs **Fertilizers Europe (2020)** — promedios regionales DNV. Urea/UAN: excl. CO₂ capturado en producto. Otros: literatura LCA. |
| **Transporte** (opcional) | 3 tramos × masa × km × factor | Carretera ≈ **0,062**; marítimo ≈ **0,010** kg CO₂e/t·km (DESNZ). |
| **Campo — N₂O** | IPCC Tier 1 | EF1 = **0,01**; GWP **273**. |

#### Productos en catálogo (2026-06 calibración FE)

Lista agrupada en UI: **Granulados · Hidrosolubles · Líquidos · Orgánicos** (`physical_form` en JSON).

| Grupo | Productos |
|-------|-----------|
| **Granulados** | Urea, AN, CAN, DAP, sulfato de amonio, KCl, NPK 15-15-15 |
| **Hidrosolubles** | Nitrato calcio, MAP, MKP, SOP, fosfonitrato, sulfato amonio soluble, nitrato potasio, nitrato magnesio, sulfato magnesio, KCl soluble, NKS, cloruro calcio (NK+Mg no: es mezcla comercial — usar KNO₃ + fuente Mg) |
| **Líquidos** | UAN 30-0-0 |
| **Orgánicos** | Compost genérico |

Panel en UI: **「Calibración vs Fertilizers Europe (EU)」** — tabla FE vs NutriPlant (Δ debe ser 0 en productos N EU).

#### Disponibilidad regional de productos (v2026-06-23)

- El desplegable de fertilizantes se **filtra por origen de fabricación** de cada fila (`methodology.availability_profiles` en JSON).
- Perfiles: `fe_n_global` (urea, AN, CAN, UAN), `granular_np` (DAP, NPK, KCl…), `soluble_fertigation` (MAP, nitrato calcio, MKP, solubles…), `organic_local` (compost).
- Niveles por región: `primary`, `secondary`, `import_typical`, **`not_applicable`**.
- Si el origen **no produce** el producto (p. ej. hidrosoluble con origen **MX, BR o LATAM**), **no aparece en la lista** ni se calcula fabricación estimada.
- **`import_typical`:** sí calcula con factor regional exportador; badge `↗ imp.` en UI.
- **Factor propio** (EPD/LCA por fila): el usuario puede ingresar fabricación aunque el origen no sea productor referenciado.
- **Mezclas comerciales** (NK+Mg, etc.): **no** en catálogo huella — sin factor LCA único por región; usar KNO₃ + fuente Mg por separado o factor propio del blend.
- Comparador rápido A vs B: solo productos válidos para **ambos** orígenes elegidos.

#### Ruta logística por fertilizante (v2026-06-25)

- Cada fila tiene **ruta propia**: origen fab., km origen/mar/campo, país destino y puerto/costa (`application_country_iso`, `entry_point_id`, `transport_*_km` en la fila).
- **Clic en fila** → panel superior 🏭→🌾 edita ese producto; `active_row_index` por escenario.
- **+ Agregar fertilizante** copia la ruta del seleccionado. **Estimar km** solo al activo.
- Columna **🛣️ Ruta** en tabla: resumen (ej. «China → México · 9.315 km»).
- Superficie (ha) y unidad de dosis: nivel escenario (compartidos).

#### Transporte en 3 tramos

1. **Origen (carretera):** fábrica → puerto de exportación en región productora. km referencia por región fab. (ej. CN 220, EU 90, US 110, MX 95, BR 160, IN 280, MENA 70, GLOBAL 120).
2. **Marítimo:** puerto exportación → puerto del **país destino**. Tabla `route_estimates.maritime_km`; **0 km** si producción y destino en la misma región/país.
3. **Destino (carretera):** puerto de llegada → campo. Depende del **puerto/costa** elegido (`road_km`) o ~150 km por defecto nacional.

**País en lista = destino de aplicación** (donde se usa el fertilizante), no afirmación de que ese país lo produce. Selector **puerto/costa** en MX, US, BR, CO, CL, CA, AU, AR, PE (en MX incluye Golfo, Pacífico, Topolobampo/Sinaloa, etc.).

Botón **「📍 Estimar km (referencia)」:** rellena los 3 km del **fertilizante seleccionado** (origen fab. + país destino + puerto). Distancias de rutas comerciales típicas — **no** GPS ni logística real del usuario (±30–50 % incertidumbre global).

#### Programa A vs Programa B

- Cada escenario: listado de fertilizantes; **cada uno con su ruta y región fab.**; transporte calculado **por fila**.
- Resumen: totales CO₂e, desglose fabricación / transporte (origen+mar+destino) / N₂O, delta absoluta y % entre A y B.
- **Equivalencia pick-up 🛻 (ilustrativa):** km en **pick-up mediana 6 cil. gasolina** equivalentes al total de cada programa y a la diferencia B−A. Factor **0,254 kg CO₂e/km** (`equivalencies.pickup_medium_6cyl`, DESNZ/DEFRA 2024 large car/4×4). Fórmula: `km ≈ kg CO₂e ÷ 0,254`. **No es compensación ni certificación.** Ej.: 588 kg CO₂e ≈ 2.315 km.

#### Benchmark de eficiencia por origen

- Para filas con factor **estimado** (no custom del usuario): compara fabricación actual vs mínimo y máximo teólico del mismo producto según tabla LCA regional.
- **Score 0–100:** ≥75 eficiente; 50–74 moderado; 25–49 mejorable; &lt;25 poco eficiente. Transporte y N₂O no entran en este score.

#### Fuentes citadas en la app

IPCC 2019 Refinement Cap. 11 (N₂O suelo), IPCC AR6 (GWP), DESNZ/DEFRA (transporte), US EPA AP-42 §14.1, US LCI, promedios regionales LCA públicos.

#### Errores frecuentes (GPT)

| Error | Corrección |
|-------|------------|
| Confundir país destino con país productor | Fabricación = región LCA; país lista = aplicación en campo |
| Tratar resultado como certificado | Siempre decir «estimación de referencia»; T&amp;C §7 |
| Inventar totales CO₂e del usuario | Pedir valores o explicar fórmulas; no asumir localStorage |
| Un solo km de transporte | Son **3 tramos** independientes |
| Elegir hidrosoluble con origen MX/BR como productor local | No aplica — filtrado por `not_applicable`; usar origen EU/CN/US o factor propio |
| Mezclar con datos del proyecto PRO | La calculadora **no lee** granular/fertirriego guardado en Supabase |
| Creer que km pick-up es compensación | Es **equivalencia ilustrativa** (DESNZ 0,254 kg CO₂e/km); no créditos de carbono |
| Un solo km/ruta para todo el programa | Transporte y ruta son **por fertilizante** (filas distintas pueden tener rutas distintas) |
| Buscar NK+Mg en huella de carbono | **No está** — mezcla comercial; usar nitrato potasio + nitrato/sulfato Mg (2 filas) o factor propio |

- **API Socio:** `free_tools_catalog` con `tool_id: "fertilizer_carbon"`.
- **Gratis vs PRO:** dosis del programa nutricional del suscriptor están en `projects.data`; hay que trasladarlas manualmente a la calculadora gratis si el usuario quiere huella de su programa guardado.

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
