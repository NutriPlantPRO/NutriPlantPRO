# Manual Técnico NutriPlant PRO — Knowledge para GPT Socio (fuente pública)

**Uso en ChatGPT:** subir en **Configure → Knowledge** (junto con HERRAMIENTAS, ANALISIS-LABORATORIO y opcional `PUBLICACIONES-REDES-CONOCIMIENTO-GPT.md`).  
**Versión manual web:** v2026.05.7 · **22 capítulos** publicados (pilar **1** + pilares A–G).  
**Fuente web:** https://nutriplantpro.com/manual-tecnico/index.html  
**API:** `manual_tecnico_catalog` · OpenAPI v2.2.0  
**Versión Knowledge:** 2026-05-23 · **v2026.05.6**

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
| `vpd-deficit-presion-vapor` | VPD, NDVI y NDMI | E |
| `agua-dureza-acidificacion-solubilidad` | Dureza, ácido HCO₃, solubilidad/IS | E |
| `n-mineralizable-agua-disponible-suelo` | N mineralizable, CC−PMP, textura | B |
| `interacciones-mulder-compatibilidad` | Mulder, matriz C/R/I ferti | F |
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

### 4.11 VPD, NDVI y NDMI

**URL:** …/vpd-deficit-presion-vapor.html · VPD kPa (Tetens / simple / avanzada); lectura satelital multiespectral NDVI (vigor) y NDMI (humedad/canopeo); proyecto + calculadora gratis. Apoyo a decisión, no sustituye recorrido de campo.

**Créditos Radar (NDVI+NDMI juntos, una generación):** superficie del polígono trazado en Ubicación → ≤30 ha = **1** · >30 ha = **2** · >100 ha = **3**. Tope mensual base **20** créditos/cuenta (+ bonus admin). Ver historial / «Ver en mapa» no gasta. Regenerar en el mismo mes sí consume de nuevo según ha. Sincronizar predio a nube para que el área sea correcta.

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
- **Agua:** vol m³ = ha×10000×(prof_cm/100); útil % = CC−PMP; vol útil = vol×(CC−PMP)/100×(zona_radical/100). Con θ actual: déficit = max(0,CC−θ); lámina mm = déficit/100×prof×10.  
- **Textura:** triángulo USDA; rangos típicos CC/PMP ilustrativos por clase. Herramientas: `n_mineralizable`, `agua_textura`.

### 4.15 Solución nutritiva (lab)

**URL:** …/analisis-solucion-nutritiva-lab.html · `solucionNutritivaAnalyses[]`. CE, pH, RAS manual. Cationes/aniones meq↔ppm (pesos eq. Ca 20,04, K 39,1, NO₃ 14…). Rangos SN_REF_DEFAULT; ideal editable; diff = lab − ideal. ≠ extracto pasta ≠ diseño didáctico gratis.

### 4.16 Extracto de pasta

**URL:** …/analisis-extracto-pasta.html · Misma estructura iónica que solución nutritiva; interpretación = disponibilidad en rizósfera (pasta saturada), no licor de fertirriego. ≠ solución nutritiva lab.

### 4.17 Agua RAS

**URL:** …/analisis-agua-ras-sar.html · CE, pH, cationes, aniones, residual ácido. **RAS en app = campo manual.** Fórmula referencia: RAS = Na ÷ √((Ca+Mg)/2) en meq/L. Guías: &lt;3 bajo, 3–6 mod, &gt;6–8 alto riesgo sodio.

### 4.18 Foliar DOP

**URL:** …/analisis-foliar-dop.html · DOP % = ((nivel−óptimo)/óptimo)×100.

### 4.19 Fruta ICC

**URL:** …/analisis-fruta-icc.html · ICC % misma fórmula que DOP. Semáforo |ICC|: ≤10 verde, 10–25 amarillo, 25–50 naranja, &gt;50 rojo. Calidad °Brix, firmeza; Ca total/soluble/ligado.

### 4.20 FAQ % meq (hidroponía y fertirriego)

**URL:** …/faq-porcentajes-no-suman-100.html · Título web: «% meq en hidroponía y fertirriego: por qué no todo suma 100 %». Triángulos N-P-S y K-Ca-Mg suman 100 % cada uno; Cl y NH₄ aparte. ≠ % saturación CIC suelo (§4.2).

### 4.21 Publicaciones en redes (pilar G)

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
| 6 pestañas Análisis | `lab_analyses_catalog` |

**Búsqueda web (si activa):** priorizar nutriplantpro.com/manual-tecnico sobre blogs genéricos.

---

## 6. Mantenimiento manual

**Versión web v2026.05.6:** 22 capítulos · capítulo extracción ampliado (herramienta 📊, biblioteca, flujo técnico, PDF) · Pilar H flujo · granular ampliado · buscador índice.

Plan histórico: `docs/MANUAL-TECNICO-NUTRIPLANT-PLAN.md`

---

*Alineado con manual-tecnico/ v2026.05.7 en repo*
