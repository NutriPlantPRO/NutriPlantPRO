'use strict';

/**
 * Oleada 5 — cruces foliar ↔ VPD ↔ programa + deep links al dashboard.
 */
const core = require('./public-mcp-core');
const deep = require('./public-mcp-subscriber-read');

const DASHBOARD_URL = 'https://nutriplantpro.com/dashboard.html';
const LOGIN_URL = 'https://nutriplantpro.com/login.html';
const VPD_OPT_MIN = 0.5;
const VPD_OPT_MAX = 1.5;

/** Claves estables → sección UI dashboard (selectSection / data-section). */
const SECTION_DEEP = {
  inicio: { key: 'inicio', select: 'Inicio', label: 'Inicio' },
  ubicacion: { key: 'ubicacion', select: 'Ubicación', label: 'Ubicación' },
  enmienda: { key: 'enmienda', select: 'Enmienda', label: 'Enmiendas / CIC' },
  enmiendas: { key: 'enmienda', select: 'Enmienda', label: 'Enmiendas / CIC' },
  granular: { key: 'nutricion-granular', select: 'Nutricion Granular', label: 'Nutrición granular' },
  fertirriego: { key: 'fertirriego', select: 'Fertirriego', label: 'Fertirriego' },
  hidroponia: { key: 'hidroponia', select: 'Hidroponia', label: 'Solución nutritiva / hidro' },
  hidro: { key: 'hidroponia', select: 'Hidroponia', label: 'Solución nutritiva / hidro' },
  reporte: { key: 'reporte', select: 'Reporte', label: 'Reportes PDF' },
  suelo: { key: 'suelo', select: 'Análisis: Suelo', label: 'Análisis de suelo' },
  foliar: { key: 'foliar', select: 'Análisis: Foliar', label: 'Análisis foliar' },
  agua: { key: 'agua', select: 'Análisis: Agua', label: 'Análisis de agua' },
  fruta: { key: 'fruta', select: 'Análisis: Fruta', label: 'Análisis de fruta' },
  pasta: { key: 'pasta', select: 'Análisis: Extracto de Pasta', label: 'Extracto de pasta' },
  extracto_pasta: { key: 'pasta', select: 'Análisis: Extracto de Pasta', label: 'Extracto de pasta' },
  solucion_lab: { key: 'extracto', select: 'Análisis: Solución Nutritiva', label: 'Lab solución nutritiva' },
  clima: { key: 'clima', select: 'Análisis: Clima', label: 'Clima / VPD' },
  vpd: { key: 'clima', select: 'Análisis: Clima', label: 'Clima / VPD' }
};

function chapter(slug) {
  const found = core.findChapter(slug);
  return found.ok ? core.chapterCite(found.chapter) : null;
}

function num(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function buildDashboardDeepLink(projectId, sectionKey) {
  const sec = SECTION_DEEP[String(sectionKey || '').toLowerCase()] || null;
  const params = new URLSearchParams();
  if (projectId) params.set('np_project', String(projectId));
  if (sec) params.set('np_section', sec.key);
  const qs = params.toString();
  return {
    url: DASHBOARD_URL + (qs ? '?' + qs : ''),
    login_url: LOGIN_URL,
    section_key: sec ? sec.key : null,
    section_select: sec ? sec.select : null,
    section_label: sec ? sec.label : null,
    note:
      'Abre dashboard ya logueado. El dashboard lee np_project + np_section y abre proyecto/sección. Sin sesión → login.'
  };
}

function projectDeepLinks(projectId, projectName) {
  const keys = [
    'foliar',
    'vpd',
    'fertirriego',
    'hidroponia',
    'granular',
    'suelo',
    'enmienda',
    'agua',
    'ubicacion'
  ];
  return {
    ok: true,
    domain: 'nutriplant_subscriber',
    project_id: projectId || null,
    project_name: projectName || null,
    dashboard_home: DASHBOARD_URL,
    links: keys.map((k) => {
      const built = buildDashboardDeepLink(projectId, k);
      return {
        section: k,
        label: built.section_label,
        url: built.url
      };
    }),
    free_tools_hub: LOGIN_URL,
    note: 'Deep links al UI del suscriptor. Requiere cuenta iniciada en el navegador.'
  };
}

function pickFoliarCa(labs) {
  const rep =
    labs && labs.foliar && Array.isArray(labs.foliar.reports) && labs.foliar.reports[0]
      ? labs.foliar.reports[0]
      : null;
  if (!rep || !rep.macros) return null;
  const ca = rep.macros.Ca || rep.macros.ca;
  if (!ca) return null;
  return {
    value: num(ca.value),
    optimal: num(ca.optimal),
    dop_percent: num(ca.dop_percent),
    title: rep.title,
    date: rep.date
  };
}

function pickFoliarK(labs) {
  const rep =
    labs && labs.foliar && Array.isArray(labs.foliar.reports) && labs.foliar.reports[0]
      ? labs.foliar.reports[0]
      : null;
  if (!rep || !rep.macros) return null;
  const k = rep.macros.K || rep.macros.k;
  if (!k) return null;
  return {
    value: num(k.value),
    optimal: num(k.optimal),
    dop_percent: num(k.dop_percent)
  };
}

function pickVpd(vpdBlock) {
  if (!vpdBlock || !vpdBlock.has_data) return null;
  const env = vpdBlock.environmental || {};
  const adv = vpdBlock.advanced || {};
  const v =
    num(env.vpd) != null
      ? num(env.vpd)
      : num(adv.vpd) != null
        ? num(adv.vpd)
        : vpdBlock.max_vpd_from_current_range
          ? num(vpdBlock.max_vpd_from_current_range.vpd)
          : null;
  if (v == null) return null;
  let band = 'optimo';
  if (v < VPD_OPT_MIN) band = 'bajo';
  else if (v > VPD_OPT_MAX) band = 'alto';
  return {
    vpd_kPa: v,
    band,
    range_platform: [VPD_OPT_MIN, VPD_OPT_MAX],
    source: env.vpd != null ? 'environmental' : adv.vpd != null ? 'advanced' : 'range_max'
  };
}

function pickProgramCaK(programs) {
  const out = { fertirriego: null, hidroponia: null, granular: null };
  if (programs && programs.fertirriego && programs.fertirriego.has_program) {
    const st = programs.fertirriego.selected_stage || (programs.fertirriego.stages && programs.fertirriego.stages[0]);
    const t = (st && st.totals_kg_ha) || {};
    out.fertirriego = {
      stage: st ? st.label || st.stage_name : null,
      CaO_kg_ha: num(t.CaO),
      K2O_kg_ha: num(t.K2O),
      N_kg_ha: num(t.N)
    };
  }
  if (programs && programs.hidroponia && programs.hidroponia.has_program) {
    const st = programs.hidroponia.active_design_stage || null;
    const meq = (st && st.meq_L) || {};
    out.hidroponia = {
      stage: st ? st.name : null,
      Ca_meq_L: num(meq.Ca),
      K_meq_L: num(meq.K),
      N_NO3_meq_L: num(meq.N_NO3)
    };
  }
  if (programs && programs.granular && programs.granular.has_program) {
    out.granular = {
      applications_count: programs.granular.applications_count || 0
    };
  }
  return out;
}

/**
 * Cruce de señales del expediente: no inventa; solo relaciona lo que hay.
 */
function crossProjectSignals(data, params) {
  const detail = deep.buildDeepRead(data || {}, params || { section: 'all' });
  const foliarCa = pickFoliarCa(detail.labs);
  const foliarK = pickFoliarK(detail.labs);
  const vpd = pickVpd(detail.vpd);
  const program = pickProgramCaK(detail.programs);
  const signals = [];
  const warnings = [];

  if (foliarCa && foliarCa.dop_percent != null) {
    if (foliarCa.dop_percent < -10) {
      signals.push({
        id: 'foliar_ca_bajo',
        severity: 'attention',
        text:
          'Foliar Ca bajo vs óptimo (DOP ' +
          foliarCa.dop_percent +
          '%). Revisar aporte Ca del programa y agua; Ca es poco móvil.'
      });
    } else if (foliarCa.dop_percent > 20) {
      signals.push({
        id: 'foliar_ca_alto',
        severity: 'info',
        text: 'Foliar Ca por encima del óptimo (DOP ' + foliarCa.dop_percent + '%).'
      });
    }
  }

  if (foliarK && foliarK.dop_percent != null && foliarK.dop_percent > 15 && foliarCa && foliarCa.dop_percent != null && foliarCa.dop_percent < 0) {
    warnings.push({
      id: 'k_vs_ca_foliar',
      text: 'K foliar relativo alto con Ca relativo bajo: posible antagonismo K↔Ca (Mulder). No confundir con VPD.'
    });
  }

  if (vpd) {
    if (vpd.band === 'alto') {
      signals.push({
        id: 'vpd_alto',
        severity: 'attention',
        text:
          'VPD ' +
          vpd.vpd_kPa +
          ' kPa (banda alta vs 0,5–1,5). Priorizar riego / microclima; Ca en punta puede fallar por baja transpiración relativa mal manejada — ≠ ventana foliar.'
      });
    } else if (vpd.band === 'bajo') {
      signals.push({
        id: 'vpd_bajo',
        severity: 'info',
        text: 'VPD ' + vpd.vpd_kPa + ' kPa (banda baja). Revisar humedad/ventilación; ≠ dosis de Ca del programa.'
      });
    }
  }

  if (vpd && vpd.band === 'alto' && foliarCa && foliarCa.dop_percent != null && foliarCa.dop_percent < -10) {
    warnings.push({
      id: 'vpd_alto_y_ca_foliar_bajo',
      text:
        'Cruce: VPD alto + Ca foliar bajo. No es “aplicar foliar porque VPD”. Primero clima/riego; Ca vía programa/agua; foliar solo si ventana y etiqueta lo permiten.',
      chapters: [
        chapter('vpd-deficit-presion-vapor'),
        chapter('analisis-foliar-dop'),
        chapter('ventanas-aplicacion-foliar')
      ]
    });
  }

  if (program.fertirriego && foliarCa && foliarCa.dop_percent != null && foliarCa.dop_percent < -10) {
    const caO = program.fertirriego.CaO_kg_ha;
    signals.push({
      id: 'programa_vs_foliar_ca',
      severity: 'info',
      text:
        'Hay programa fertirriego' +
        (program.fertirriego.stage ? ' (' + program.fertirriego.stage + ')' : '') +
        (caO != null ? ' con CaO≈' + caO + ' kg/ha en etapa' : '') +
        '. Contrastar con Ca foliar bajo: ¿etapa actual, agua, y fruta/punta?'
    });
  }

  if (program.hidroponia && foliarCa && foliarCa.dop_percent != null && foliarCa.dop_percent < -10) {
    const caMeq = program.hidroponia.Ca_meq_L;
    signals.push({
      id: 'hidro_vs_foliar_ca',
      severity: 'info',
      text:
        'Hidro/diseño activo' +
        (caMeq != null ? ' Ca≈' + caMeq + ' meq/L' : '') +
        '. Si Ca foliar sigue bajo, revisar % meq K-Ca-Mg y agua de aporte — ≠ enmienda CIC.'
    });
  }

  if (!foliarCa && !vpd && !program.fertirriego && !program.hidroponia) {
    warnings.push({
      id: 'sin_datos_cruce',
      text: 'Faltan piezas para cruzar (foliar y/o VPD y/o programa). Carga labs o conecta el módulo en la web.'
    });
  }

  const projectId = params && params.project_id;
  const links = projectDeepLinks(projectId, params && params.project_name);

  return {
    ok: true,
    domain: 'nutriplant_subscriber',
    snapshot: {
      foliar_ca: foliarCa,
      foliar_k: foliarK,
      vpd,
      program
    },
    signals,
    warnings,
    do_not_mix: [
      'VPD ≠ ventana de aplicación foliar ≠ lámina/ISH',
      'DOP foliar ≠ kg/ha suelo ≠ % CIC enmiendas',
      '% meq solución ≠ saturación CIC'
    ],
    deep_links: {
      foliar: buildDashboardDeepLink(projectId, 'foliar'),
      vpd: buildDashboardDeepLink(projectId, 'vpd'),
      fertirriego: buildDashboardDeepLink(projectId, 'fertirriego'),
      hidroponia: buildDashboardDeepLink(projectId, 'hidroponia')
    },
    chapters: {
      flujo: chapter('flujo-nutriplant-pro'),
      vpd: chapter('vpd-deficit-presion-vapor'),
      foliar: chapter('analisis-foliar-dop'),
      foliar_window: chapter('ventanas-aplicacion-foliar'),
      meq: chapter('porcentaje-meq-aniones-cationes')
    },
    all_module_links: links.links,
    note: 'Cruce orientativo sobre datos del expediente. Decide el agrónomo.'
  };
}

/** Cruce sin cuenta: solo si el usuario pasa cifras a mano. */
function crossManualSignals(params) {
  const foliarCaDop = num(params && (params.foliar_ca_dop_pct || params.ca_dop));
  const vpd = num(params && (params.vpd_kPa || params.vpd));
  const caMeq = num(params && (params.program_ca_meq || params.ca_meq));
  const signals = [];
  const warnings = [];
  if (vpd != null) {
    let band = 'optimo';
    if (vpd < VPD_OPT_MIN) band = 'bajo';
    else if (vpd > VPD_OPT_MAX) band = 'alto';
    signals.push({ id: 'vpd', band, vpd_kPa: vpd, range: [VPD_OPT_MIN, VPD_OPT_MAX] });
  }
  if (foliarCaDop != null) {
    signals.push({ id: 'foliar_ca_dop', dop_percent: foliarCaDop });
  }
  if (caMeq != null) signals.push({ id: 'program_ca_meq', ca_meq_L: caMeq });
  if (vpd != null && vpd > VPD_OPT_MAX && foliarCaDop != null && foliarCaDop < -10) {
    warnings.push({
      id: 'vpd_alto_y_ca_foliar_bajo',
      text: 'VPD alto + Ca foliar bajo: no mezclar con ventana foliar; primero clima/riego y programa.'
    });
  }
  if (vpd == null && foliarCaDop == null && caMeq == null) {
    return {
      ok: false,
      error: 'Sin cuenta: indica foliar_ca_dop_pct y/o vpd_kPa y/o program_ca_meq. Con cuenta usa interpret_project_cross.'
    };
  }
  return {
    ok: true,
    domain: 'nutriplant_public',
    signals,
    warnings,
    do_not_mix: [
      'VPD ≠ ventana foliar ≠ lámina',
      'DOP foliar ≠ programa meq sin contexto de etapa'
    ],
    chapters: {
      vpd: chapter('vpd-deficit-presion-vapor'),
      foliar: chapter('analisis-foliar-dop'),
      foliar_window: chapter('ventanas-aplicacion-foliar')
    },
    free_tools: {
      vpd: core.lookupFreeTool({ q: 'vpd' }),
      foliar_window: core.lookupFreeTool({ q: 'ventanas_foliar' })
    }
  };
}

module.exports = {
  SECTION_DEEP,
  DASHBOARD_URL,
  buildDashboardDeepLink,
  projectDeepLinks,
  crossProjectSignals,
  crossManualSignals
};
