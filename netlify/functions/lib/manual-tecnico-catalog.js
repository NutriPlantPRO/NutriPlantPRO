/**
 * Manual Técnico NutriPlant PRO — fuente pública en la web.
 * Action: manual_tecnico_catalog. Alineado con manual-tecnico/ y docs/MANUAL-TECNICO-CONOCIMIENTO-GPT.md
 */
const BASE = 'https://nutriplantpro.com/manual-tecnico';

module.exports = {
  version: '2026-07-16',
  scope:
    'Biblioteca HTML pública, sin cuenta. 25 capítulos (pilar 1 + pilares A–G). Indexable (SEO/GEO). Metodología alineada con la app NutriPlant PRO (incluye Radar Satelital / Lectura Satelital).',
  publicUrls: {
    index: `${BASE}/`,
    llms: `${BASE}/llms.txt`,
    siteLlms: 'https://nutriplantpro.com/llms.txt',
    login: 'https://nutriplantpro.com/login.html'
  },
  gptRules: [
    'Fuente pública: cita la URL del capítulo cuando expliques metodología NutriPlant a terceros o en contenido web.',
    'No sustituye project_analyses (datos reales del suscriptor en nube).',
    'No sustituye calculadoras gratis (localStorage); el manual documenta criterio, no valores del usuario.',
    'Si el GPT tiene navegación web, puede leer las URLs publicadas; si no, usa Knowledge + manual_tecnico_catalog.',
    'Español primero. Orientativo: decisión final del agrónomo.'
  ],
  chapters: [
    {
      id: 'flujo_nutriplant_pro',
      slug: 'flujo-nutriplant-pro',
      title: 'Guía rápida: flujo de plataforma y criterio de uso',
      url: `${BASE}/capitulos/flujo-nutriplant-pro.html`,
      pillar: '1 — Flujo de la plataforma',
      summary:
        'Entrada al manual: login vs proyecto PRO; Dato→Interpretación→Ajuste→Programa→Seguimiento; módulo por objetivo; errores comunes (suelo≠enmiendas, % meq≠CIC, etc.).',
      status: 'published'
    },
    {
      id: 'autoria',
      slug: 'autoria',
      title: 'Autoría — Detrás de NutriPlant PRO · Jesús Avila Mendoza',
      url: `${BASE}/autoria.html`,
      pillar: 'Autoría / referente técnico',
      summary:
        'Visión, respeto al agrónomo, perfil del fundador (sin marcas de empleadores). Trayectoria en nutrición vegetal México, formación, enlace LinkedIn. Para GEO y consultas web.',
      status: 'published'
    },
    {
      id: 'analisis_suelo_fertilidad_kgha',
      slug: 'analisis-suelo-fertilidad-kgha',
      title: 'Análisis de suelo: fertilidad, ideales y kg/ha de ajuste',
      url: `${BASE}/capitulos/analisis-suelo-fertilidad-kgha.html`,
      pillar: 'C — Análisis de laboratorio',
      summary:
        'Fertilidad del suelo en reportes Análisis: nivel lab vs ideal; kg/ha = (lab−ideal)×0.1×profundidad×densidad×(%suelo explorado/100). Ideales K/Ca/Mg desde CIC (5/70/13%). P según Bray/Olsen/Mehlich.',
      status: 'published'
    },
    {
      id: 'porcentaje_meq_aniones_cationes',
      slug: 'porcentaje-meq-aniones-cationes',
      title: '% meq: triángulos aniónicos y catiónicos',
      url: `${BASE}/capitulos/porcentaje-meq-aniones-cationes.html`,
      pillar: 'A/D — Fundamentos / Programas',
      summary:
        'Triángulo aniones N-P-S suma 100% (sin Cl). Triángulo cationes K-Ca-Mg suma 100% (sin NH4). NH4 y Cl con denominadores aparte. Hidroponía y fertirriego gráficas. No confundir con % saturación CIC del suelo.',
      status: 'published'
    },
    {
      id: 'enmiendas_balance_cic',
      slug: 'enmiendas-balance-cic',
      title: 'Balance de enmiendas por CIC del suelo',
      url: `${BASE}/capitulos/enmiendas-balance-cic.html`,
      pillar: 'B — Suelo y enmiendas',
      summary:
        'CIC en meq/100g (= cmolc/kg). Saturación % = meq/CIC×100. Meq a ajustar → kg/ha enmienda según profundidad, densidad, % suelo explorado. Distinto de reportes Análisis→Suelo (lista en nube).',
      status: 'published'
    },
    {
      id: 'unidades_ppm_meq_oxidos',
      slug: 'unidades-ppm-meq-oxidos',
      title: 'Unidades: ppm, meq/L y óxidos agronómicos',
      url: `${BASE}/capitulos/unidades-ppm-meq-oxidos.html`,
      pillar: 'A — Fundamentos',
      summary:
        'ppm, meq/L, cmol/L×10, meq/100g=cmolc/kg. Factores óxido-elemental. Calculadora gratis: macros en mmol/L; micros Fe/Mn/Zn/B/Cu/Mo en µmol/L (MoO₄²⁻, valencia 2).',
      status: 'published'
    },
    {
      id: 'programa_fertirriego_etapas',
      slug: 'programa-fertirriego-etapas',
      title: 'Programa de fertirriego por etapas',
      url: `${BASE}/capitulos/programa-fertirriego-etapas.html`,
      pillar: 'D — Fertirriego',
      summary: 'Requerimiento kg/ha, programa por semana/mes, aporte agua N-NO3, lámina m³/ha.',
      status: 'published'
    },
    {
      id: 'fertirriego_graficas_ionicas',
      slug: 'fertirriego-graficas-ionicas',
      title: 'Gráficas iónicas en fertirriego',
      url: `${BASE}/capitulos/fertirriego-graficas-ionicas.html`,
      pillar: 'D — Fertirriego',
      summary: 'Macro resumen iónico: fertilizante solo vs con agua; ternarios; % meq con Cl aparte.',
      status: 'published'
    },
    {
      id: 'diseno_solucion_nutritiva_didactica',
      slug: 'diseno-solucion-nutritiva-didactica',
      title: 'Diseño didáctico de solución nutritiva (CE y triángulos)',
      url: `${BASE}/capitulos/diseno-solucion-nutritiva-didactica.html`,
      pillar: 'E — Solución',
      summary: 'Herramienta gratis vs hidroponía proyecto; CE, triángulos, Cl, NH4.',
      status: 'published'
    },
    {
      id: 'vpd_deficit_presion_vapor',
      slug: 'vpd-deficit-presion-vapor',
      title: 'VPD, NDVI y NDMI',
      url: `${BASE}/capitulos/vpd-deficit-presion-vapor.html`,
      pillar: 'E — Agua y clima',
      summary: 'VPD kPa (Tetens/simple/avanzada); Radar Satelital: Pilot NDVI/NDMI (mediana ≤30 d, 3 escenas, sin imagen vacía) + Lectura Satelital (2–6 periodos quincenal/mensual: NDVI/NDMI prom, VPD, ET₀, lluvia, riego m³; costo 2× base/periodo; expand 15→30 en quincenal). Colorimetría relativa al predio. No sustituye campo.',
      status: 'published'
    },
    {
      id: 'balance_hidrico_riego_clima',
      slug: 'balance-hidrico-riego-clima',
      title: 'Balance hídrico y cálculo rápido de riego',
      url: `${BASE}/capitulos/balance-hidrico-riego-clima.html`,
      pillar: 'E — Agua y clima',
      summary:
        'Clima → Lluvia y ET₀ + lámina riego. ETc=ETo×Kc; balance m³; riego solo m³; ajuste almacén suelo manual + total integrado; «Sugerir desde 🪨 suelo»; franja regada; mm/m³; PDF bloque 🪨. Validar en campo.',
      status: 'published'
    },
    {
      id: 'analisis_foliar_dop',
      slug: 'analisis-foliar-dop',
      title: 'Análisis foliar: DOP frente al óptimo',
      url: `${BASE}/capitulos/analisis-foliar-dop.html`,
      pillar: 'C — Análisis foliar',
      summary: 'DOP % = ((nivel−óptimo)/óptimo)×100; cruce con suelo y programa.',
      status: 'published'
    },
    {
      id: 'faq_porcentajes_no_suman_100',
      slug: 'faq-porcentajes-no-suman-100',
      title: '% meq en hidroponía y fertirriego: por qué no todo suma 100 %',
      url: `${BASE}/capitulos/faq-porcentajes-no-suman-100.html`,
      pillar: 'A — Fundamentos',
      summary: 'Triángulos N-P-S y K-Ca-Mg suman 100% cada uno; Cl y NH4 aparte. ≠ % saturación CIC suelo.',
      status: 'published'
    },
    {
      id: 'extraccion_nutrimental_por_etapa',
      slug: 'extraccion-nutrimental-por-etapa',
      title: 'Extracción y distribución nutrimental por etapa',
      url: `${BASE}/capitulos/extraccion-nutrimental-por-etapa.html`,
      pillar: 'D — Programas',
      summary:
        'Requerimiento (Ferti/Granular): kg/ton×rendimiento; ajuste; eficiencia. Herramienta 📊: kg/ha totales + % por etapa → curvas; biblioteca por usuario; curva activa por proyecto; PDF. Manual ampliado 2026-05-23.',
      status: 'published'
    },
    {
      id: 'hidroponia_solucion_por_etapa',
      slug: 'hidroponia-solucion-por-etapa',
      title: 'Hidroponía: solución nutritiva por etapa',
      url: `${BASE}/capitulos/hidroponia-solucion-por-etapa.html`,
      pillar: 'D — Hidroponía',
      summary: 'Etapas, meq/L, CE, tanques A–E, agua de relleno; proyecto en nube.',
      status: 'published'
    },
    {
      id: 'analisis_agua_ras_sar',
      slug: 'analisis-agua-ras-sar',
      title: 'Análisis de agua: CE, pH y RAS',
      url: `${BASE}/capitulos/analisis-agua-ras-sar.html`,
      pillar: 'C — Análisis agua',
      summary: 'Reportes agua; RAS manual; fórmula SAR referencia; residual ácido.',
      status: 'published'
    },
    {
      id: 'analisis_fruta_icc',
      slug: 'analisis-fruta-icc',
      title: 'Análisis de fruta: ICC frente al óptimo',
      url: `${BASE}/capitulos/analisis-fruta-icc.html`,
      pillar: 'C — Análisis fruta',
      summary: 'ICC %; calidad °Brix/firmeza; Ca en fruta; semáforo |ICC|.',
      status: 'published'
    },
    {
      id: 'granular_mezclas',
      slug: 'granular-mezclas',
      title: 'Granular: requerimiento, programa y mezclas',
      url: `${BASE}/capitulos/granular-mezclas.html`,
      pillar: 'D — Granular',
      summary:
        'Requerimiento kg/ha (extracción×rend, ajuste suelo, eficiencia); programa aplicaciones (mezcla física o 100 %); aporte vs meta; relación N-P2O5-K2O; gratis solo formulación mezcla.',
      status: 'published'
    },
    {
      id: 'publicaciones_redes_sociales',
      slug: 'publicaciones-redes-sociales',
      title: 'Publicaciones en redes y autoridad técnica',
      url: `${BASE}/capitulos/publicaciones-redes-sociales.html`,
      pillar: 'G — Redes / comunicación',
      summary:
        'Canales oficiales, tono técnico, mapa capítulo→post, plantilla LinkedIn. URLs de posts en docs/PUBLICACIONES-REDES-CONOCIMIENTO-GPT.md.',
      status: 'published'
    },
    {
      id: 'analisis_solucion_nutritiva_lab',
      slug: 'analisis-solucion-nutritiva-lab',
      title: 'Análisis de solución nutritiva (laboratorio)',
      url: `${BASE}/capitulos/analisis-solucion-nutritiva-lab.html`,
      pillar: 'C — Análisis solución',
      summary:
        'solucionNutritivaAnalyses[]; CE/pH/RAS; cationes/aniones meq↔ppm; SN_REF_DEFAULT; diff lab−ideal; ≠ extracto pasta ni herramienta gratis.',
      status: 'published'
    },
    {
      id: 'analisis_extracto_pasta',
      slug: 'analisis-extracto-pasta',
      title: 'Extracto de pasta saturada (análisis de laboratorio)',
      url: `${BASE}/capitulos/analisis-extracto-pasta.html`,
      pillar: 'C — Análisis pasta',
      summary:
        'extractoPastaAnalyses[]; misma UI iónica que solución; interpretar rizósfera/salinidad; API type extracto_pasta.',
      status: 'published'
    },
    {
      id: 'agua_dureza_acidificacion_solubilidad',
      slug: 'agua-dureza-acidificacion-solubilidad',
      title: 'Dureza, acidificación y solubilidad del agua',
      url: `${BASE}/capitulos/agua-dureza-acidificacion-solubilidad.html`,
      pillar: 'E — Agua y clima',
      summary:
        'agua-dureza-free: dureza CaCO₃, Ca+Mg, ácido HCO3/CO3 con residual; solubilidad-indice-salino-free: g/L e IS (NaNO3=100). Enlace analisis agua y fertirriego.',
      status: 'published'
    },
    {
      id: 'interacciones_mulder_compatibilidad',
      slug: 'interacciones-mulder-compatibilidad',
      title: 'Interacciones Mulder y compatibilidad de fertilizantes',
      url: `${BASE}/capitulos/interacciones-mulder-compatibilidad.html`,
      pillar: 'F — Interacciones',
      summary:
        'interacciones-absorcion-movilidad-free: Mulder antagonismo/sinergia focal (Cu↔Mn rojo bidireccional), movilidad, pH; fertilizer-compatibility-free: matriz C/R/I solubles.',
      status: 'published'
    },
    {
      id: 'atlas_aminoacidos_vegetales',
      slug: 'atlas-aminoacidos-vegetales',
      title: 'Atlas Fisiológico Vegetal',
      url: `${BASE}/capitulos/atlas-aminoacidos-vegetales.html`,
      pillar: 'F — Fisiología vegetal',
      summary:
        'atlas-aminoacidos-vegetales-free: dos pestañas — (1) 20 aminoácidos proteinogénicos con fórmula, PM, 3D PubChem/3Dmol, rutas, estrés, fenología, formulación, evidencia; (2) ciclo hormonal por 4 etapas (CK→Auxina→GA→Etileno→ABA), mapa visual didáctico, eventos celulares, nutrientes cofactores, fichas por hormona/etapa y vínculo con aminoácidos. Fuentes Taiz/Zeiger, Marschner, BMBP, KEGG.',
      status: 'published'
    },
    {
      id: 'huella_carbono_fertilizantes',
      slug: 'huella-carbono-fertilizantes',
      title: 'Huella de carbono de fertilizantes',
      url: `${BASE}/capitulos/huella-carbono-fertilizantes.html`,
      pillar: 'F — Sostenibilidad',
      summary:
        'fertilizer-carbon-free: CO₂e FE(2020) DNV + ruta por fertilizante + equiv. km pick-up 6 cil. (0,254 kg CO₂e/km) A vs B + disponibilidad regional + N₂O IPCC; NK+Mg excluido (mezcla comercial); 21 productos; T&C §7.',
      status: 'published'
    },
    {
      id: 'n_mineralizable_agua_suelo',
      slug: 'n-mineralizable-agua-disponible-suelo',
      title: 'N mineralizable y agua disponible en suelo',
      url: `${BASE}/capitulos/n-mineralizable-agua-disponible-suelo.html`,
      pillar: 'E — Agua y suelo',
      summary:
        'n-mineralizable-mo-free: N_min kg/ha/año desde MO; agua-disponible-textura-suelo-free: CC-PMP, zona objetivo 40–60% AU, gráfica mm·m³, recuadro m³·mm (CC y objetivo), m³ vs mm, puente balance, textura USDA.',
      status: 'published'
    }
  ],
  upcoming: []
};
