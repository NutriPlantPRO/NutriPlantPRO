# Manual Técnico NutriPlant PRO — Knowledge para GPT Socio (fuente pública)

**Uso en ChatGPT:** subir en **Configure → Knowledge** (junto con HERRAMIENTAS, ANALISIS-LABORATORIO y opcional `PUBLICACIONES-REDES-CONOCIMIENTO-GPT.md`).  
**Versión manual web:** v2026.05.4 · **21 capítulos** publicados (fase 2 E/F cerrada).  
**Fuente web:** https://nutriplantpro.com/manual-tecnico/index.html  
**API:** `manual_tecnico_catalog` · OpenAPI v1.9.0  
**Versión Knowledge:** 2026-05-21 · **v2026.05.4**

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
| Autoría (`autoria.html`) | Referente Jesús Avila; ≠ modal «Nosotros» en login |
| Pilar G redes | Editorial y canales; ver `publicaciones-redes-sociales` + Knowledge PUBLICACIONES |
| `project_analyses` | Datos reales del suscriptor en nube (privado, API) |

---

## 2. URLs oficiales

| Recurso | URL |
|---------|-----|
| Índice manual | https://nutriplantpro.com/manual-tecnico/index.html |
| Autoría | https://nutriplantpro.com/manual-tecnico/autoria.html |
| Pilar redes | https://nutriplantpro.com/manual-tecnico/capitulos/publicaciones-redes-sociales.html |
| llms.txt manual | https://nutriplantpro.com/manual-tecnico/llms.txt |
| llms.txt sitio | https://nutriplantpro.com/llms.txt |
| Login / herramientas gratis | https://nutriplantpro.com/login.html |

---

## 3. Índice de capítulos publicados (tabla rápida)

| Slug | Título corto |
|------|----------------|
| `unidades-ppm-meq-oxidos` | Unidades ppm, meq, óxidos |
| `porcentaje-meq-aniones-cationes` | % meq triángulos |
| `analisis-suelo-fertilidad-kgha` | Suelo fertilidad kg/ha |
| `enmiendas-balance-cic` | Enmiendas CIC |
| `extraccion-nutrimental-por-etapa` | Extracción por etapa |
| `programa-fertirriego-etapas` | Fertirriego programa |
| `fertirriego-graficas-ionicas` | Gráficas iónicas ferti |
| `granular-mezclas` | Granular mezclas N-P-K |
| `hidroponia-solucion-por-etapa` | Hidroponía por etapa |
| `diseno-solucion-nutritiva-didactica` | Solución didáctica (gratis) |
| `vpd-deficit-presion-vapor` | VPD |
| `agua-dureza-acidificacion-solubilidad` | Dureza, ácido HCO₃, solubilidad/IS |
| `n-mineralizable-agua-disponible-suelo` | N mineralizable, CC−PMP, textura |
| `interacciones-mulder-compatibilidad` | Mulder, matriz C/R/I ferti |
| `analisis-solucion-nutritiva-lab` | Solución lab (licor/drenaje) |
| `analisis-extracto-pasta` | Extracto pasta saturada |
| `analisis-agua-ras-sar` | Agua CE, pH, RAS |
| `analisis-foliar-dop` | Foliar DOP |
| `analisis-fruta-icc` | Fruta ICC |
| `faq-porcentajes-no-suman-100` | FAQ % iónicos |
| `publicaciones-redes-sociales` | Redes y editorial |

URL: `https://nutriplantpro.com/manual-tecnico/capitulos/<slug>.html`

---

## 4. Capítulos — resumen técnico (detalle)

### 4.0 Autoría

**URL:** …/autoria.html · Perfil Jesús Avila Mendoza; visión «la herramienta suma»; LinkedIn personal y empresa. Sin marcas empleadores en copy público.

### 4.1 Unidades

**URL:** …/unidades-ppm-meq-oxidos.html · ppm; meq/L = ppm÷peso eq.; 1 cmol/L = 10 meq/L; meq/100g = cmolc/kg. Óxidos: P₂O₅×0,436, K₂O×0,830, CaO×0,715, MgO×0,603.

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
Extracción total = kg/ton × rendimiento. Requerimiento = Ajuste ÷ (Eficiencia/100). Orden nutrientes N, P₂O₅, K₂O, CaO, MgO, S, SO₄, micros. Fertirriego y granular; herramienta gratis «Distribución por etapa».

### 4.6 Fertirriego programa

**URL:** …/programa-fertirriego-etapas.html · Requerimiento → programa semanal/mensual → aporte agua N-NO₃ → gráficas. Lámina m³/ha.

### 4.7 Gráficas iónicas fertirriego

**URL:** …/fertirriego-graficas-ionicas.html · Fertilizante solo vs + agua; ternarios; Cl aparte.

### 4.8 Granular mezclas

**URL:** …/granular-mezclas.html · % en mezcla × composición material → relación N-P₂O₅-K₂O normalizada al mínimo; kg/ha = dosis × % nutriente/100.

### 4.9 Hidroponía por etapa

**URL:** …/hidroponia-solucion-por-etapa.html · Proyecto nube; etapas; CE ≈ Σmeq/20; tanques A–E; agua relleno resta objetivo. ≠ herramienta gratis didáctica.

### 4.10 Solución didáctica (gratis)

**URL:** …/diseno-solucion-nutritiva-didactica.html · login localStorage; triángulos, CE, Cl, NH₄.

### 4.11 VPD

**URL:** …/vpd-deficit-presion-vapor.html · VPD kPa desde T y HR; proyecto + calculadora gratis.

### 4.12 Dureza, acidificación y solubilidad (agua)

**URL:** …/agua-dureza-acidificacion-solubilidad.html  
- **Dureza:** ppm CaCO₃ ↔ meq/L (÷50,043); °dH/°e/°fH; clase USGS (&lt;60 blanda … ≥180 muy dura). Dureza lab = Ca×2,498 + Mg×4,118 (ppm CaCO₃).  
- **Ácido:** meq/L a neutralizar = (HCO₃⁻ + CO₃²⁻) − residual; mL/m³ = meq/L×1000÷meq/mL ácido. Ácidos app: HNO₃ 55 %, H₂SO₄ 98 %, H₃PO₄ 75/85 %. No neutralizar 100 % por defecto.  
- **IS:** NaNO₃=100; solubilidad g/L tabla gratis. IS alto = más osmótico relativo, no «prohibido». Herramientas: `agua_dureza`, `solubilidad_is` en free_tools_catalog.

### 4.13 Mulder y compatibilidad (Pilar F)

**URL:** …/interacciones-mulder-compatibilidad.html  
- **Mulder:** rojo = antagonismo bidireccional en aristas; azul = sinergia **solo desde ion seleccionado** (ficha lateral = ion focal). Referencias: K⁺ vs Ca/Mg/NH₄; P alto vs Zn/Fe/Cu/Mn/Ca; SO₄ vs Mo; NO₃ sinergia K, NH₄, Mo.  
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

**URL:** …/analisis-extracto-pasta.html · `extractoPastaAnalyses[]`. Misma estructura iónica; interpretación = solución en pasta saturada / rizósfera. API `extracto_pasta`. No mezclar con solución nutritiva.

### 4.17 Agua RAS

**URL:** …/analisis-agua-ras-sar.html · CE, pH, cationes, aniones, residual ácido. **RAS en app = campo manual.** Fórmula referencia: RAS = Na ÷ √((Ca+Mg)/2) en meq/L. Guías: &lt;3 bajo, 3–6 mod, &gt;6–8 alto riesgo sodio.

### 4.18 Foliar DOP

**URL:** …/analisis-foliar-dop.html · DOP % = ((nivel−óptimo)/óptimo)×100.

### 4.19 Fruta ICC

**URL:** …/analisis-fruta-icc.html · ICC % misma fórmula que DOP. Semáforo |ICC|: ≤10 verde, 10–25 amarillo, 25–50 naranja, &gt;50 rojo. Calidad °Brix, firmeza; Ca total/soluble/ligado.

### 4.20 FAQ % iónicos

**URL:** …/faq-porcentajes-no-suman-100.html · Identificar pantalla y denominador (§4.2).

### 4.21 Publicaciones en redes (pilar G)

**URL:** …/publicaciones-redes-sociales.html  
Canales oficiales; tono técnico; mapa capítulo→post; plantilla LinkedIn. **Posts con URL:** Knowledge `PUBLICACIONES-REDES-CONOCIMIENTO-GPT.md` §8 (**24 posts** LinkedIn empresa NutriPlant PRO; IDs `li_*`). Para redactar o «como el post de P-Zn»: ese doc §8b + capítulo citado.

---

## 5. Cómo debe usarlo el GPT Socio

| Pregunta | Fuente |
|----------|--------|
| Metodología / citar web / GEO | Este Knowledge + URL capítulo |
| Índice o slug | `manual_tecnico_catalog` o §3 |
| Redactar post LinkedIn/IG | `PUBLICACIONES-REDES-CONOCIMIENTO-GPT.md` + capítulo §4 |
| Datos proyecto suscriptor | `project_analyses` / `project_detail` |
| Calculadora gratis | `free_tools_catalog` / HERRAMIENTAS |
| 6 pestañas Análisis | `lab_analyses_catalog` |

**Búsqueda web (si activa):** priorizar nutriplantpro.com/manual-tecnico sobre blogs genéricos.

---

## 6. Fase 2 manual

**Cerrada en web (v2026.05.4):** Mulder/compatibilidad · N mineralizable/agua en suelo. Mantenimiento: alinear capítulo si cambia código en `*-free.html`.

Plan histórico: `docs/MANUAL-TECNICO-NUTRIPLANT-PLAN.md`

---

*Alineado con manual-tecnico/ v2026.05.4 en repo*
