# Manual Técnico NutriPlant PRO — Knowledge para GPT Socio (fuente pública)

**Uso en ChatGPT:** subir en **Configure → Knowledge** (junto con HERRAMIENTAS, ANALISIS-LABORATORIO y opcional `PUBLICACIONES-REDES-CONOCIMIENTO-GPT.md`).  
**Versión manual web:** v2026.07.3 · **25 capítulos** publicados (pilar **1** + pilares A–G).
**Fuente web:** https://nutriplantpro.com/manual-tecnico/index.html  
**API:** `manual_tecnico_catalog` · OpenAPI v2.2.0  
**Versión Knowledge:** 2026-07-18 · **v2026.07.3** (+ NDRE/RGB; Pilot 14→45 d hasta 8 pasadas; máx. 250 ha; Lectura tooltip VPD horas+%)

---

## 1. Qué es y por qué es fuente pública

Biblioteca HTML **abierta, sin cuenta**: metodología alineada con la app NutriPlant PRO.

- Agrónomos, técnicos, productores, buscadores e **IA (GEO)**.
- **Principio:** si el código y el capítulo divergen, gana el código; actualizar capítulo + este Knowledge.
- **Citar siempre** la URL del capítulo cuando expliques criterio NutriPlant en web, posts o respuestas a terceros.

**Distinciones importantes:**

| Concepto | Qué es |
|----------|--------|
| Manual técnico (web) | Metodología pública, capítulos con URL |
| Pilar 1 flujo | Entrada «¿por dónde empiezo?» → `flujo-nutriplant-pro` |
| Autoría (`autoria.html`) | Plataforma NutriPlant + referente Jesús; ≠ modal «Nosotros» en login |
| Pilar G redes | Editorial y canales; ver `publicaciones-redes-sociales` + Knowledge PUBLICACIONES |
| `project_analyses` | Datos reales del suscriptor en nube (privado, API) |

---

## 2. URLs oficiales

| Recurso | URL |
|---------|-----|
| Índice manual | https://nutriplantpro.com/manual-tecnico/index.html |
| Flujo plataforma (Pilar 1) | https://nutriplantpro.com/manual-tecnico/capitulos/flujo-nutriplant-pro.html |
| Autoría | https://nutriplantpro.com/manual-tecnico/autoria.html |
| Pilar redes | https://nutriplantpro.com/manual-tecnico/capitulos/publicaciones-redes-sociales.html |
| llms.txt manual | https://nutriplantpro.com/manual-tecnico/llms.txt |
| llms.txt sitio | https://nutriplantpro.com/llms.txt |
| Login / herramientas gratis | https://nutriplantpro.com/login.html |

---

## 3. Índice de capítulos publicados (tabla rápida)

| Slug | Título corto | Pilar |
|------|----------------|-------|
| `flujo-nutriplant-pro` | Guía rápida: flujo y criterio de uso | H |
| `unidades-ppm-meq-oxidos` | Unidades ppm, meq, óxidos | A |
| `porcentaje-meq-aniones-cationes` | % meq triángulos | A |
| `analisis-suelo-fertilidad-kgha` | Suelo fertilidad kg/ha | B / C |
| `enmiendas-balance-cic` | Enmiendas CIC | B |
| `extraccion-nutrimental-por-etapa` | Extracción y distribución nutrimental por etapa | D |
| `programa-fertirriego-etapas` | Fertirriego programa | D |
| `fertirriego-graficas-ionicas` | Gráficas iónicas ferti | D |
| `granular-mezclas` | Granular: requerimiento, programa y mezclas | D |
| `hidroponia-solucion-por-etapa` | Hidroponía: solución nutritiva por etapa | D |
| `diseno-solucion-nutritiva-didactica` | Solución didáctica (gratis) | D |
| `vpd-deficit-presion-vapor` | VPD, Radar NDVI/NDMI/NDRE/RGB | E |
| `balance-hidrico-riego-clima` | Balance hídrico y riego rápido (Clima) | E |
| `agua-dureza-acidificacion-solubilidad` | Dureza, ácido HCO₃, solubilidad/IS | E |
| `n-mineralizable-agua-disponible-suelo` | N mineralizable, CC−PMP, textura | B |
| `interacciones-mulder-compatibilidad` | Mulder, matriz C/R/I ferti | F |
| `atlas-aminoacidos-vegetales` | Atlas fisiológico vegetal (aminoácidos + ciclo hormonal) | F |
| `huella-carbono-fertilizantes` | Huella CO₂e fertilizantes (estimación) | F |
| `analisis-solucion-nutritiva-lab` | Solución lab (licor/drenaje) | C |
| `analisis-extracto-pasta` | Extracto de pasta saturada (laboratorio) | C |
| `analisis-agua-ras-sar` | Agua CE, pH, RAS | C |
| `analisis-foliar-dop` | Foliar DOP | C |
| `analisis-fruta-icc` | Fruta ICC | C |
| `faq-porcentajes-no-suman-100` | % meq: por qué no todo suma 100 % | A |
| `publicaciones-redes-sociales` | Publicaciones en redes y autoridad técnica | G |

URL: `https://nutriplantpro.com/manual-tecnico/capitulos/<slug>.html`

---

## 4. Capítulos — resumen técnico (detalle)

### 4.0 Flujo plataforma (Pilar 1 — leer primero si «¿por dónde empiezo?»)

**URL:** …/flujo-nutriplant-pro.html  
- NutriPlant PRO = plataforma (login herramientas gratis vs dashboard PRO proyecto en nube).  
- Cadena: **Dato → Interpretación → Ajuste → Programa → Seguimiento**.  
- Flujo 5 pasos: diagnóstico (Análisis) → Enmiendas → Extracción → Fertirriego/Granular/Hidro → seguimiento (foliar, VPD/NDVI, campo).  
- Tabla **módulo según objetivo** (Análisis, Enmiendas, Extracción, Fertirriego, Granular, Hidroponía, VPD, herramientas gratis).  
- **Errores comunes:** suelo ≠ enmiendas; % meq solución ≠ % CIC; CE ≠ composición iónica; gratis ≠ proyecto PRO; kg/ha/DOP/ICC no son receta; no neutralizar 100 % HCO₃; NDVI/VPD no sustituyen campo.

### 4.0b Autoría

**URL:** …/autoria.html · NutriPlant PRO como **plataforma** para agrónomos; visión «la herramienta suma»; perfil Jesús Avila Mendoza; LinkedIn personal y empresa. Sin marcas empleadores en copy público.

### 4.1 Unidades

**URL:** …/unidades-ppm-meq-oxidos.html · ppm; meq/L = ppm÷peso eq. elemental; 1 cmol/L = 10 meq/L; meq/100g = cmolc/kg. Óxidos: P₂O₅×0,436, K₂O×0,830, CaO×0,715, MgO×0,603.

**µmol/L en microelementos (calculadora gratis ppm/meq):** Fe, Mn, Zn, B, Cu, Mo muestran **µmol/L** (no mmol/L). **µmol/L = (ppm ÷ PA elemento) × 1000**; mmol/L = µmol/L ÷ 1000; meq/L = mmol/L × valencia. ppm = mg/L del **elemento**. Formas: Fe²⁺, Mn²⁺, Zn²⁺, Cu²⁺, H₃BO₃ (B), **MoO₄²⁻** (Mo, PA 95,95, valencia 2). Ejemplo: 3 ppm Fe ≈ 53,7 µmol/L. Macros e iones de solución siguen en **mmol/L**.

### 4.2 % meq triángulos

**URL:** …/porcentaje-meq-aniones-cationes.html  
- Aniones N-P-S = 100 % (sin Cl). Cationes K-Ca-Mg = 100 % (sin NH₄). NH₄ y Cl: denominadores aparte.  
- Pesos eq.: N14 P31 S16 K39,1 Ca20,04 Mg12,15 Cl35,45.  
- ≠ % saturación CIC suelo.

### 4.3 Suelo fertilidad kg/ha

**URL:** …/analisis-suelo-fertilidad-kgha.html · Pantalla Análisis → Suelo → Fertilidad.

```
factor = 0,1 × profundidad_cm × densidad × (suelo_explorado_% / 100)
kg/ha = (lab − ideal) × factor
```

Ideales K/Ca/Mg desde CIC (5/70/13 %). P: Bray 40, Olsen 25, Mehlich 40 ppm. Orientativo, no dosis automática.

### 4.4 Enmiendas CIC

**URL:** …/enmiendas-balance-cic.html · Dashboard Enmiendas. CIC = suma catiónica meq/100g. Saturación % = meq/CIC×100. Rangos K 3–7, Ca 65–75, Mg 10–15, Na 0–1, Al 0–1, H 0–10 %. `soilAnalysis` (enmienda) vs `soilAnalyses[]` (reportes Análisis).

### 4.5 Extracción por etapa

**URL:** …/extraccion-nutrimental-por-etapa.html  

**Dos niveles (no confundir):**

| Nivel | Dónde | Qué hace |
|-------|--------|----------|
| **Requerimiento** | Fertirriego / Granular → pestaña Requerimiento | Extracción total = kg/ton × rendimiento; Requerimiento real = Ajuste ÷ (Eficiencia/100). Orden nutrientes N, P₂O₅, K₂O, CaO, MgO, S, SO₄, micros. |
| **Curva fenológica 📊** | Herramienta «Distribución nutrimental por etapa» (`extraccion-etapa-free.html`) | Sobre **kg/ha totales** ya definidos, reparte **% por etapa** → kg/ha por etapa + gráficas. No pide cultivo/rendimiento en pantalla. |

**Herramienta 📊 — pasos:** (1) Extracción total kg/ha por nutriente. (2) % por etapa (suma 100 %/nutriente; etapas editables). (3) Resultado kg/ha etapa = total × (%/100). (4) Gráfica macros/micros.

**Dónde abrirla:** Login (gratis, solo localStorage) · Dashboard botón 📊 (autosave en **proyecto activo** + barra **Mis curvas guardadas**).

**Biblioteca personal (solo dashboard):** curvas con título guardadas **por usuario** (Supabase perfil + LS `np_extraccion_etapa_presets_user_{userId}`). Guardar / elegir / eliminar. **No se pierden** al borrar un proyecto. **No se reparten solas** entre proyectos: en cada proyecto cargas la curva que quieras.

**Dos capas:** biblioteca = plantillas reutilizables · curva activa del proyecto = `calculators.extraccionEtapa` (+ LS `np_extraccion_etapa_{userId}_{projectId}`). Reporte PDF y chat app usan la curva **del proyecto**, no toda la biblioteca.

**Qué NO hace 📊:** no calcula dosis ni fertilizantes; no sustituye programa semanal/mensual de Fertirriego/Granular; no sincroniza sola con el programa.

Los % por etapa son decisión del técnico; la app no impone curva universal fija.

### 4.6 Fertirriego programa

**URL:** …/programa-fertirriego-etapas.html · Requerimiento → programa semanal/mensual → aporte agua N-NO₃ → gráficas. Lámina m³/ha.

### 4.7 Gráficas iónicas fertirriego

**URL:** …/fertirriego-graficas-ionicas.html · Fertilizante solo vs + agua; ternarios; Cl aparte.

### 4.8 Granular: requerimiento, programa y mezclas

**URL:** …/granular-mezclas.html  
- **Requerimiento** (Dashboard → Nutrición granular): extracción total = kg/ton × rendimiento; requerimiento real = Ajuste ÷ (Eficiencia/100). Ajuste kg/ha editable por reservas/déficit suelo (criterio agrónomo; no obligatorio desde reporte lab). Eficiencias default granular: N 65 %, P₂O₅ 40 %, K₂O 85 %, CaO/MgO/SO₄ 85 %, micros 80 %, SiO₂ 85 % (editables).  
- **Programa:** aplicaciones numeradas; **mezcla física** (% TM por material, habitualmente 100 %) o **fertilizante al 100 %**; dosis kg/ha por aplicación → aporte nutriente = dosis × (% nutriente en mezcla / 100). Total programa = suma de aplicaciones; resumen **Aporte − Requerimiento = Diferencia**. Sin aporte por agua (≠ fertirriego).  
- **Formulación:** % nutriente en mezcla = Σ(% TM × % material); relación N-P₂O₅-K₂O normalizada al mínimo de los tres; kg/ha = dosis × %/100.  
- **Gratis** (`granular-mix-free`): solo formulación de mezcla + kg/ha según dosis (localStorage). **Proyecto nube:** requerimiento + programa + resumen. Modo óxido/elemental como fertirriego.

### 4.9 Hidroponía por etapa

**URL:** …/hidroponia-solucion-por-etapa.html · Proyecto nube; etapas; CE ≈ Σmeq/20; tanques A–E; agua relleno resta objetivo. ≠ herramienta gratis didáctica.

### 4.10 Solución didáctica (gratis)

**URL:** …/diseno-solucion-nutritiva-didactica.html · login localStorage; triángulos, CE, Cl, NH₄.

### 4.11 VPD y Radar Satelital (NDVI / NDMI / NDRE / RGB)

**URL:** …/vpd-deficit-presion-vapor.html · VPD kPa (Tetens / simple / avanzada); módulo **Radar Satelital** (antes Ubicación) con Pilot Copernicus/Sentinel-2: **NDVI** (vigor), **NDMI** (humedad relativa del dosel), **NDRE** (clorofila / estado del dosel, red edge), **RGB** (vista natural). Apoyo a decisión, no sustituye recorrido de campo.

**Cómo se arma la imagen (Pilot y Lectura):** mismas pasadas Sentinel-2 → **mediana por píxel** + máscara **SCL** (nubes/sombra). Las **cuatro capas** salen juntas de la misma generación. Resolución típica ~**10 m**/píxel (NDRE/NDMI usan bandas nativas ~20 m remuestreadas).

**Colorimetría índices (NDVI/NDMI/NDRE):** escala **relativa al predio y a la fecha** (P10–P90). Rojo/naranja = menor nivel relativo; amarillo/verde claro = intermedio; verde intenso (o azul verdoso en NDMI) = mayor nivel relativo. No es escala absoluta ni diagnóstico solo por color.

**RGB (vista natural):** no usa Menor/Mayor. **Verde** ≈ planta viva; **rojo/café/rosado** ≈ suelo desnudo o rastrojo (color natural de la tierra, no “bajo vigor”). Útil para ubicar el predio y contrastar con índices.

**Tope de área:** máximo **250 ha**. Si el polígono es mayor: mensaje «Radar máximo 250 ha; divide el polígono» (no gasta crédito). Ranchos grandes → lotes separados.

**Pilot (pestaña Polígono / NDVI y NDMI):** ventanas **14 → 21 → 30 → 45 d**; hasta **8 pasadas** (mediana + SCL). Solo corta si ~**100%** útiles; si no, guarda lo mejor (≥~15% cobertura útil). Si &lt;~15% no guarda imagen vacía. Muestra fechas satelitales y % útil. Capas: NDVI → NDMI → NDRE → RGB. Créditos internos: base **20/mes** (+ bonus). Costo por generación: ≤30 ha = **1** · >30 ha = **2** · >100 ha = **3** (las cuatro capas juntas). Ver historial / «Ver en mapa» no gasta.

**Lectura Satelital (pestaña 2):** histórico del **mismo predio** con **2–6 periodos** (fecha final elegida), **quincenal (15 d)** o **mensual**. Por periodo: NDVI/NDMI/NDRE promedio, miniaturas NDVI|NDMI|NDRE|RGB, VPD promedio + horas VPD por banda (Open-Meteo), ET₀ y lluvia acumulados, riego m³↔mm. En la gráfica, el tooltip de horas VPD muestra **horas y %** de cada rango (&lt;0.5 / 0.5–1.5 / &gt;1.5) respecto al total de horas del periodo (p. ej. 15 d ≈ 360 h). Si hay **Kc** en Clima (`irrigationQuickCalc.kc`), la gráfica añade **ETc = ET₀ × Kc** por periodo (eje mm; Kc constante). Hasta **6 pasadas**/periodo; quincena incompleta puede ampliar al mes (`lookback_expanded`, *). Costo **fijo por consulta**: **3 créditos** ≤30 ha, **4** si >30 ha. Persistencia `location.lecturaSatelital`. PDF/admin: tabla, gráfica, miniaturas.
### 4.11b Balance hídrico y cálculo rápido de riego (Clima)

**URL:** …/balance-hidrico-riego-clima.html · **Dashboard PRO → Clima → Lluvia y ET₀** → calculadora de balance hídrico.

| Concepto | Detalle |
|----------|---------|
| Periodo | 1, 7 o 30 días (acumulados) |
| ETo / lluvia | Satélite (ventanas rodantes Open-Meteo) o manual; macrotúnel = lluvia 0 |
| Kc | Usuario lo ingresa; tabla FAO-56 solo consulta |
| Fórmulas | ETc = ETo × Kc; déficit climático = ETo − lluvia; déficit cultivo = ETc − lluvia; **balance m³ = déficit m³ cultivo − riego m³ en franja**; balance mm ref. cultivo = balance m³ ÷ (10 × ha cultivo) |
| Volumen | 1 mm sobre X ha = X × 10 m³; **riego aplicado solo en m³** en franja; mm franja = m³ ÷ (ha regada × 10) — mm solo en resultados |
| Franja regada | Déficit en mm/m³ sobre **ha cultivo**; riego siempre en **franja humedecida (m³)**; mm en franja = mm cultivo × (ha cultivo ÷ ha regada); m³ totales **no** se dividen. Ej.: 90 m³ = 9 mm ref. 1 ha = 15 mm en 0,6 ha franja |
| Puente 🪨 suelo | Desplegable Sin ajuste / Déficit (+ riego) / Exceso (− riego) + m³ manual; **«Sugerir desde 🪨 suelo»** prellena desde `nutriplant_bridge_soil_water_v1` (prioriza m³ hasta **objetivo 60% AU** si θ &lt; zona 40–60%; si no, hasta CC). Solo integra al **total integrado (clima ± almacén)** si hay valor; ≠ riego ya aplicado |
| Total integrado | Balance climático ± ajuste almacén suelo manual (m³); líneas «Ajuste almacén suelo» y «Total integrado» en resumen; recuadro azul usa total integrado cuando aplica |
| Recuadro «Dato importante» | Si hay franja distinta: riego sugerido (m³), lámina en franja (mm), aplicar en franja (m³). Criterio NutriPlant + enlace a tabla % suelo explorado |
| Tablas desplegables | Kc FAO-56 (consulta) y **% suelo explorado por sistema** (aguacate, berry, hortaliza…) |
| % alcance raíces | Sugiere franja (ha cultivo × % ÷ 100); **no altera déficit ETc**. Estimar %: **Conversor magnitudes** → alcance raíz (copa circular o cama/banda) o tabla en N mineralizable |
| Persistencia | `climateAnalysis.irrigationQuickCalc` + `rolling` en JSON proyecto; ajuste suelo: `soilStorageMode`, `soilStorageM3` (PRO) / `irr-soil-mode`, `irr-soil-m3` (gratis) |
| Gráfica Clima | Vista Gráficas: lluvia + ET₀ por año; con Kc → línea **ETc = ET₀ × Kc** del año en curso (Kc constante). Misma lógica en PDF/Admin |
| Límite | No integración automática de almacén en ETc (solo ajuste manual opcional); no escurrimiento, drenaje ni lixiviación; validar en campo |
| PDF | Reporte Clima puede incluir balance guardado + bloque 🪨 suelo (sesión navegador) |

**API admin:** `project_climate` mode=saved (snapshot) | live | rainfall_refresh | rolling | **all** (recomendado «actualizado»). Campos live: `rolling_windows_ahora`, `irrigation_quick_calc_live`. Solo lectura; no altera al suscriptor.

### 4.12 Dureza, acidificación y solubilidad (agua)

**URL:** …/agua-dureza-acidificacion-solubilidad.html  
- **Dureza:** ppm CaCO₃ ↔ meq/L (÷50,043); °dH/°e/°fH; clase USGS (&lt;60 blanda … ≥180 muy dura). Dureza lab = Ca×2,498 + Mg×4,118 (ppm CaCO₃).  
- **Ácido:** meq/L a neutralizar = (HCO₃⁻ + CO₃²⁻) − residual; mL/m³ = meq/L×1000÷meq/mL ácido. Ácidos app: HNO₃ 55 %, H₂SO₄ 98 %, H₃PO₄ 75/85 %. No neutralizar 100 % por defecto.  
- **IS:** NaNO₃=100; solubilidad g/L tabla gratis. IS alto = más osmótico relativo, no «prohibido». Herramientas: `agua_dureza`, `solubilidad_is` en free_tools_catalog.

### 4.13 Mulder y compatibilidad (Pilar F)

**URL:** …/interacciones-mulder-compatibilidad.html  
- **Mulder:** rojo = antagonismo bidireccional en aristas; azul = sinergia **solo desde ion seleccionado** (ficha lateral = ion focal). Referencias: K⁺ vs Ca/Mg/NH₄; P alto vs Zn/Fe/Cu/Mn/Ca; **Cu²⁺ ↔ Mn²⁺** competencia entre micros (rojo en diagrama); SO₄ vs Mo; NO₃ sinergia K, NH₄, Mo.  
- **Movilidad:** N,P,K,Mg móviles (hoja vieja); Ca,B punta; Fe,Mn,Zn,Cu según especie/pH. Mecanismos: masa, difusión, interceptación.  
- **Compatibilidad:** matriz C/R/I alineada FERT_SOLUBLES; C compatible, R precaución (solubilidad/salting-out), I precipitado en madre concentrada. Tanques A/B. Herramientas: `interacciones`, `fertilizer_compatibility`.

### 4.14 N mineralizable y agua en suelo

**URL:** …/n-mineralizable-agua-disponible-suelo.html  
- **N_min (kg N/ha/año):** 10000×(P/100)×DA×1000×(R/100)×(MO/100)×(N_MO/100)×(T_min/100); P cm, DA g/cm³, T_min 1–3 %/año. Orden magnitud, no ensayo lab.  
- **Agua:** vol m³ = ha×10000×(prof_cm/100); útil % = CC−PMP; vol útil = vol×(CC−PMP)/100×(% superficie/100). **Zona objetivo 40–60% AU** (entre PMP y CC): objetivo alto = PMP + 0,6×(CC−PMP); franja violeta en gráfica. **Gráfica:** título «Proporción de agua por estado · % volumétrico de referencia»; stats bajo barra con **mm · m³**. Con θ: recuadro azul (m³·mm hasta CC) + «Aplica X m³… no son dos riegos»; recuadro violeta hasta objetivo 60% AU. **m³ vs mm:** `m³ = mm × ha × 10`; aplicar m³ en franja; mm ref. ha = m³÷(ha×10). Puente `nutriplant_bridge_soil_water_v1` (m³ CC, m³ objetivo, exceso) → balance «Sugerir desde 🪨 suelo». Textura USDA.
- Herramientas: `n_mineralizable`, `agua_textura`, `lamina_riego` (puente `nutriplant_bridge_soil_water_v1`).

### 4.15 Huella de carbono de fertilizantes (Pilar F — sostenibilidad)

**URL:** …/huella-carbono-fertilizantes.html  
- **Posicionamiento:** referencia **global abierta** NutriPlant; calibración **Fertilizers Europe (2020)** en urea, AN, CAN, UAN (promedios regionales DNV). No PCF por planta.  
- **Fabricación EU (kg CO₂e/kg, FE 2020 = NutriPlant):** urea 0,878 · AN 1,112 · CAN 0,951 · UAN 0,782 (excl. CO₂ en producto urea/UAN).  
- **Transporte (3 tramos):** DESNZ. **Campo N₂O:** IPCC Tier 1. Programa A vs B. CAN/UAN en catálogo desde v2026-06-23.  
- **Disponibilidad regional:** listado filtrado por origen fab. (`availability_profiles`); hidrosolubles no disponibles con origen MX/BR/LATAM (`not_applicable`); factor propio permite EPD de importación.  
- **Mezclas comerciales:** **NK+Mg no está en catálogo** (v2026-06-26) — es blend KNO₃ + Mg sin factor LCA único por región; modelar como nitrato potasio + nitrato/sulfato Mg, o factor propio. **21 productos** en JSON.  
- **Ruta por fertilizante:** cada fila con origen, km 3 tramos, país/puerto destino; clic en fila edita panel 🏭→🌾.  
- **Equivalencia pick-up A vs B:** km ilustrativos en pick-up mediana 6 cil. (0,254 kg CO₂e/km DESNZ); total A, B y diferencia — no compensación.  
- **Herramienta:** `fertilizer_carbon`; LS `nutriplant_free_fertilizer_carbon_v2`. Panel calibración FE en UI.

### 4.15b Atlas Fisiológico Vegetal (Pilar F — fisiología vegetal)

**URL:** …/atlas-aminoacidos-vegetales.html
- **Herramienta gratuita:** `atlas-aminoacidos-vegetales-free.html` (login/dashboard, icono 🧬). Dos pestañas: **Aminoácidos** y **Ciclo hormonal**.

#### Aminoácidos (pestaña 1)
- Biblioteca interactiva de los 20 aminoácidos proteinogénicos con enfoque en nutrición, fisiología vegetal y aplicación agronómica responsable.
- **Cada tarjeta:** nombre común, nombre L-alpha (glicina: no quiral), abreviaturas 3/1 letras, fórmula, peso molecular, familia química, rutas metabólicas, función fisiológica, beneficios agronómicos, fenología, estrés, precursores, categorías funcionales, evidencia y bibliografía base.
- **Modelo 3D:** 3Dmol.js + PubChem SDF 3D cuando hay conexión; CPK/Jmol: C gris, H blanco, O rojo, N azul, S amarillo; rotación 360°, zoom y selección de átomos.
- **Filtros:** estrés, fenología, formulación nutricional, categoría funcional y evidencia. Categorías: metabolismo del N, fotosíntesis, respuesta al estrés, desarrollo radicular, crecimiento vegetativo, floración, cuajado, llenado, defensa vegetal, antioxidantes, precursor hormonal y transporte de N.
- **Ejemplos de criterio:** prolina = estrés osmótico/hídrico/salino; triptófano = precursor de rutas de auxina; glutamato/glutamina/asparagina/arginina = metabolismo y transporte de N; cisteína = glutatión/defensa antioxidante; fenilalanina = fenilpropanoides/lignina/defensa; metionina = SAM/etileno/poliaminas.
- **Evidencia:** Alta/Media/Baja; no convertir rutas metabólicas en promesa de campo. La respuesta depende de cultivo, dosis, fuente comercial, mezcla, vía de aplicación, estado nutricional, ambiente y validación.
- **Fuentes:** PubChem, KEGG, PlantCyc, Plant Physiology and Development, Biochemistry & Molecular Biology of Plants, Marschner y artículos científicos.

#### Ciclo hormonal (pestaña 2)
- **Mapa visual didáctico** de tendencias relativas de actividad hormonal (no valores de laboratorio). Curvas suaves + puntos de transición donde una fitohormona cede a la siguiente.
- **Secuencia:** Citoquinina → Auxina → Giberelinas → Etileno → ABA.
- **Etapas y eventos:**
  - **I Germinación y Establecimiento** — Iniciación celular (división); CK + Auxina; N, Ca, P, Zn, Mg, K, Mn.
  - **II Crecimiento Vegetativo** — Crecimiento celular · Madurez celular; Auxina + GA; Ca, Cu, Mg, B, Mn, N, Zn, NO₃.
  - **III Floración y Reproducción** — Senescencia (transición reproductiva); GA + Etileno; Ca, B, Mg, N amínico.
  - **IV Maduración y senescencia** — Cierre del ciclo fisiológico; Etileno + ABA; B, Cu, P, K, Mo, Mg, N amínico.
- **Transiciones gráfico:** Iniciación (CK→Auxina), Crecimiento (Auxina→GA), Madurez (GA→Etileno), Senescencia (Etileno→ABA).
- **Rol por hormona:** CK = división/brotación; Auxina = polaridad/elongación; GA = crecimiento/floración; Etileno = maduración/senescencia (Metionina→SAM→etileno); ABA = estrés/cierre (carotenoides).
- **Criterio agronómico:** marco general para mayoría de cultivos; timing y balance hormonal varían por especie, genética, ambiente y manejo. Cruce con programa de fertirriego, análisis y fenología real del cultivo.
- **Aviso:** desequilibrio hormonal-nutricional en transición puede reducir irreversiblemente expresión genética.
- **Fuentes:** Taiz & Zeiger, Marschner, BMBP, KEGG biosíntesis hormonal.

### 4.16 Solución nutritiva (lab)

**URL:** …/analisis-solucion-nutritiva-lab.html · `solucionNutritivaAnalyses[]`. CE, pH, RAS manual. Cationes/aniones meq↔ppm (pesos eq. Ca 20,04, K 39,1, NO₃ 14…). Rangos SN_REF_DEFAULT; ideal editable; diff = lab − ideal. ≠ extracto pasta ≠ diseño didáctico gratis.

### 4.17 Extracto de pasta

**URL:** …/analisis-extracto-pasta.html · Misma estructura iónica que solución nutritiva; interpretación = disponibilidad en rizósfera (pasta saturada), no licor de fertirriego. ≠ solución nutritiva lab.

### 4.18 Agua RAS

**URL:** …/analisis-agua-ras-sar.html · CE, pH, cationes, aniones, residual ácido. **RAS en app = campo manual.** Fórmula referencia: RAS = Na ÷ √((Ca+Mg)/2) en meq/L. Guías: &lt;3 bajo, 3–6 mod, &gt;6–8 alto riesgo sodio.

### 4.19 Foliar DOP

**URL:** …/analisis-foliar-dop.html · DOP % = ((nivel−óptimo)/óptimo)×100.

### 4.20 Fruta ICC

**URL:** …/analisis-fruta-icc.html · ICC % misma fórmula que DOP. Semáforo |ICC|: ≤10 verde, 10–25 amarillo, 25–50 naranja, &gt;50 rojo. Calidad °Brix, firmeza; Ca total/soluble/ligado.

### 4.21 FAQ % meq (hidroponía y fertirriego)

**URL:** …/faq-porcentajes-no-suman-100.html · Título web: «% meq en hidroponía y fertirriego: por qué no todo suma 100 %». Triángulos N-P-S y K-Ca-Mg suman 100 % cada uno; Cl y NH₄ aparte. ≠ % saturación CIC suelo (§4.2).

### 4.22 Publicaciones en redes (pilar G)

**URL:** …/publicaciones-redes-sociales.html  
Canales oficiales; tono técnico; mapa capítulo→post; plantilla LinkedIn. **Posts con URL:** Knowledge `PUBLICACIONES-REDES-CONOCIMIENTO-GPT.md` §8 (**24 posts** LinkedIn empresa NutriPlant PRO; IDs `li_*`). Para redactar o «como el post de P-Zn»: ese doc §8b + capítulo citado.

---

## 5. Cómo debe usarlo el GPT Socio

| Pregunta | Fuente |
|----------|--------|
| «¿Por dónde empiezo en NutriPlant?» | Capítulo `flujo-nutriplant-pro` (§4.0) |
| «¿Cómo convierto ppm de Fe a µmol/L?» / micros en conversor | §4.1 + HERRAMIENTAS (conversor µmol) + `free_tools_catalog` `conversor_unidades_nutrientes` |
| Metodología / citar web / GEO | Este Knowledge + URL capítulo |
| Índice o slug | `manual_tecnico_catalog` o §3 |
| Redactar post LinkedIn/IG | `PUBLICACIONES-REDES-CONOCIMIENTO-GPT.md` + capítulo §4 |
| Datos proyecto suscriptor | `project_analyses` / `project_detail` |
| Calculadora gratis | `free_tools_catalog` / HERRAMIENTAS |
| Aminoácidos vegetales, estrés, fenología o formulación | `atlas-aminoacidos-vegetales` + HERRAMIENTAS `atlas_aminoacidos_vegetales` |
| Ciclo hormonal, fitohormonas, etapas fenológicas o nutrición por etapa | `atlas-aminoacidos-vegetales` §7 + HERRAMIENTAS `atlas_aminoacidos_vegetales` pestaña Ciclo hormonal |
| 6 pestañas Análisis | `lab_analyses_catalog` |

**Búsqueda web (si activa):** priorizar nutriplantpro.com/manual-tecnico sobre blogs genéricos.

---

## 6. Mantenimiento manual

**Versión web v2026.07.1:** 25 capítulos · Atlas de Aminoácidos Vegetales 🧬 · huella carbono fertilizantes (21 productos; NK+Mg excluido como mezcla comercial) · calculadora 🌍 (ruta por fila, pick-up A vs B) · Pilar 1 flujo · buscador índice.

Plan histórico: `docs/MANUAL-TECNICO-NUTRIPLANT-PLAN.md`

---

*Alineado con manual-tecnico/ v2026.07.1 en repo*
