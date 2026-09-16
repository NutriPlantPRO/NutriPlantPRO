'use strict';

var assert = require('node:assert/strict');
var core = require('../netlify/functions/lib/public-mcp-core.js');
var tools = require('../netlify/functions/lib/public-mcp-tools.js');
var mcpAuth = require('../netlify/functions/lib/public-mcp-auth.js');
var handler = require('../netlify/functions/nutriplant-public-mcp.js').handler;

function mcpEvent(method, body, headers) {
  return {
    httpMethod: method,
    path: '/mcp',
    headers: Object.assign({ host: 'nutriplantpro.com', 'x-forwarded-proto': 'https' }, headers || {}),
    body: typeof body === 'string' ? body : JSON.stringify(body || {})
  };
}

module.exports = [
  {
    name: 'Público: 1 meq/L Ca = 20.04 ppm',
    run: function () {
      var r = core.convertNutrientUnits({ nutrient: 'Ca', value: 1, from: 'meq_L' });
      assert.equal(r.ok, true);
      assert.equal(r.ppm, 20.04);
    }
  },
  {
    name: 'Público: 1 meq Ca → nitrato de calcio g/m³ y N-NO3 arrastrado',
    run: function () {
      var r = core.saltFromMeq({ nutrient: 'Ca', meq_L: 1, salt_id: 'nitrato_calcio_granular' });
      assert.equal(r.ok, true);
      assert.ok(r.dose.g_per_m3 > 100 && r.dose.g_per_m3 < 120);
      assert.ok(r.also_contributes.N_NO3.meq_L > 1);
      assert.equal(r.salt.tank, 'A');
      assert.match(r.chapter.url, /hidroponia/);
    }
  },
  {
    name: 'Público: VPD 2 kPa es banda alta',
    run: function () {
      var r = core.calculateVpd({ vpd_kPa: 2, crop: 'jitomate' });
      assert.equal(r.ok, true);
      assert.equal(r.band, 'alto');
      assert.equal(r.crop, 'jitomate');
    }
  },
  {
    name: 'Público: VPD Tetens 28 °C 45 % HR',
    run: function () {
      var r = core.calculateVpd({ temperature_C: 28, rh_pct: 45 });
      assert.equal(r.ok, true);
      assert.ok(r.vpd_kPa > 1.5);
      assert.equal(r.band, 'alto');
    }
  },
  {
    name: 'Público: lookup VPD cita capítulo',
    run: function () {
      var r = core.lookupChapter({ q: 'VPD' });
      assert.equal(r.ok, true);
      assert.match(r.chapter.url, /vpd-deficit-presion-vapor/);
    }
  },
  {
    name: 'Público: muro — tools sin acciones admin',
    run: function () {
      var names = tools.toolsList().map(function (t) {
        return t.name;
      });
      assert.ok(names.indexOf('list_catalog') >= 0);
      assert.ok(names.indexOf('lookup_free_tool') >= 0);
      assert.ok(names.indexOf('salt_from_meq') >= 0);
      assert.ok(names.indexOf('list_my_projects') >= 0);
      ['subscription_roster', 'admin_stats', 'nutriplantAdminQuery', 'list_users'].forEach(function (bad) {
        assert.equal(names.indexOf(bad), -1);
      });
    }
  },
  {
    name: 'Público: lookup_free_tool VPD da URL',
    run: function () {
      var r = core.lookupFreeTool({ q: 'vpd' });
      assert.equal(r.ok, true);
      assert.equal(r.tool.id, 'vpd');
      assert.match(r.tool.url, /vpd-free/);
    }
  },
  {
    name: 'Público: list_catalog incluye flow_chapter y URL free tools',
    run: function () {
      var r = core.listCatalog();
      assert.equal(r.ok, true);
      assert.match(r.flow_chapter.url, /flujo-nutriplant-pro/);
      assert.ok(r.free_tools.tools.length > 10);
      assert.ok(r.free_tools.tools.some(function (t) {
        return t.id === 'lamina_riego' && /http/.test(t.url);
      }));
    }
  },
  {
    name: 'Público: flow_status sugiere lab si no hay análisis',
    run: function () {
      var sub = require('../netlify/functions/lib/public-mcp-subscriber.js');
      var st = sub.flowStatus({
        crop: 'jitomate',
        modules: {},
        analyses: {
          suelo: { reports_count: 0 },
          agua: { reports_count: 0 },
          foliar: { reports_count: 0 },
          fruta: { reports_count: 0 },
          extracto_pasta: { reports_count: 0 },
          solucion_nutritiva: { reports_count: 0 }
        }
      });
      assert.equal(st.next_step.step, 'dato');
      assert.match(st.next_step.action, /análisis/i);
    }
  },
  {
    name: 'Público: oleada 4 labs suelo kg/ha',
    run: function () {
      var read = require('../netlify/functions/lib/public-mcp-subscriber-read.js');
      var r = read.summarizeSoilReport({
        title: 'Lab1',
        date: '2026-01-01',
        fertility: { p: 20, k: 100, ca: 800, mg: 100, depthCm: 20, reachPct: 100, ideal: { p: 30, k: 150 } },
        physical: { bulkDensity: 1.2 },
        cations: { k: 0.5, ca: 8, mg: 1.5, cic: 12 },
        phSection: { ph: 6.8 }
      });
      assert.ok(r.kg_ha && r.kg_ha.nutrients.p);
      assert.equal(r.ph, 6.8);
      assert.ok(r.kg_ha.nutrients.p.kg_ha_adjustment != null);
    }
  },
  {
    name: 'Público: oleada 4 fertirriego etapas',
    run: function () {
      var read = require('../netlify/functions/lib/public-mcp-subscriber-read.js');
      var r = read.fertigationDeep({
        fertirriego: {
          program: {
            timeUnit: 'semana',
            weeks: [
              { stage: 'Veg', totals: { N_NO3: 10, N_NH4: 2, K2O: 20, P2O5: 5 } },
              { stage: 'Rep', totals: { N_NO3: 15, K2O: 30, P2O5: 8 } }
            ],
            chartWaterByStageM3ha: [40, 50]
          }
        }
      }, 1);
      assert.equal(r.has_program, true);
      assert.equal(r.stages_count, 2);
      assert.equal(r.selected_stage.index, 1);
      assert.equal(r.program_contribution_kg_ha_cycle.N_NO3, 25);
    }
  },
  {
    name: 'Público: oleada 4 hidro cycleProgram',
    run: function () {
      var read = require('../netlify/functions/lib/public-mcp-subscriber-read.js');
      var r = read.hydroDeep({
        hidroponia: {
          stages: [{ id: 'a', name: 'Activa', meq: { K: 5, Ca: 7, Mg: 2, N_NO3: 10 }, ce: 2.1 }],
          activeStageId: 'a',
          fertilizers: [{ id: 'kno3', name: 'KNO3', tank: 'B' }],
          cycleProgram: {
            programName: 'Ciclo tomate',
            activeStageId: 's1',
            stages: [
              { id: 's1', name: 'Inicio', meq: { N_NO3: 8, K: 4, Ca: 6 }, ppm: { Fe: 1.5 } }
            ]
          }
        }
      });
      assert.equal(r.has_program, true);
      assert.equal(r.cycle_program.program_name, 'Ciclo tomate');
      assert.equal(r.active_design_stage.name, 'Activa');
    }
  },
  {
    name: 'Público: oleada 4 enmiendas CIC',
    run: function () {
      var read = require('../netlify/functions/lib/public-mcp-subscriber-read.js');
      var r = read.amendmentsDeep({
        soilAnalysis: {
          initial: { k: 0.4, ca: 6, mg: 1.2, h: 0.4, na: 0, al: 0, cic: 8 },
          properties: { ph: 6.5, density: 1.2, depth: 20 },
          adjustments: { k: 0, ca: 0, mg: 0 }
        }
      });
      assert.equal(r.has_data, true);
      assert.equal(r.initial_meq.CIC, 8);
    }
  },
  {
    name: 'Público: oleada 4 buildDeepRead section programs',
    run: function () {
      var read = require('../netlify/functions/lib/public-mcp-subscriber-read.js');
      var r = read.buildDeepRead(
        {
          fertirriego: { program: { weeks: [{ totals: { N_NO3: 1 } }] } },
          soilAnalyses: [{ title: 'S', fertility: { p: 1 }, physical: {} }]
        },
        { section: 'programs' }
      );
      assert.ok(r.programs && r.programs.fertirriego.has_program);
      assert.equal(r.labs, null);
    }
  },
  {
    name: 'Público: oleada 5 deep link URL',
    run: function () {
      var cross = require('../netlify/functions/lib/public-mcp-cross.js');
      var link = cross.buildDashboardDeepLink('proj-abc', 'foliar');
      assert.match(link.url, /np_project=proj-abc/);
      assert.match(link.url, /np_section=foliar/);
      assert.equal(link.section_select, 'Análisis: Foliar');
      var links = cross.projectDeepLinks('proj-abc', 'Lote 1');
      assert.equal(links.ok, true);
      assert.ok(links.links.some(function (l) { return l.section === 'vpd' && /np_section=clima/.test(l.url); }));
    }
  },
  {
    name: 'Público: oleada 5 cross VPD alto + Ca foliar bajo',
    run: function () {
      var cross = require('../netlify/functions/lib/public-mcp-cross.js');
      var r = cross.crossProjectSignals(
        {
          foliarAnalyses: [{ title: 'F1', date: '2026-01-01', macros: { Ca: 0.8, K: 3.2 } }],
          vpdAnalysis: { environmental: { vpd: 2.2 } },
          fertirriego: { program: { weeks: [{ stage: 'Veg', totals: { CaO: 40, K2O: 80, N_NO3: 20 } }] } }
        },
        { project_id: 'p1', project_name: 'Demo' }
      );
      assert.equal(r.ok, true);
      assert.ok(r.snapshot.foliar_ca && r.snapshot.foliar_ca.dop_percent < -10);
      assert.equal(r.snapshot.vpd.band, 'alto');
      assert.ok(r.warnings.some(function (w) { return w.id === 'vpd_alto_y_ca_foliar_bajo'; }));
      assert.match(r.deep_links.foliar.url, /np_section=foliar/);
    }
  },
  {
    name: 'Público: oleada 5 cross_manual_signals',
    run: function () {
      var cross = require('../netlify/functions/lib/public-mcp-cross.js');
      var r = cross.crossManualSignals({ foliar_ca_dop_pct: -25, vpd_kPa: 2.1 });
      assert.equal(r.ok, true);
      assert.ok(r.warnings.some(function (w) { return w.id === 'vpd_alto_y_ca_foliar_bajo'; }));
      var empty = cross.crossManualSignals({});
      assert.equal(empty.ok, false);
    }
  },
  {
    name: 'Público: tools oleada 5 registradas',
    run: function () {
      var names = tools.toolsList().map(function (t) { return t.name; });
      ['interpret_project_cross', 'project_deep_links', 'cross_manual_signals'].forEach(function (n) {
        assert.ok(names.indexOf(n) >= 0, n);
      });
    }
  },
  {
    name: 'Público: meq_triangle_balance K-Ca-Mg',
    run: function () {
      var freeCalc = require('../netlify/functions/lib/public-mcp-free-calc.js');
      var r = freeCalc.meqTriangleBalance({ k_meq: 2, ca_meq: 4, mg_meq: 2, n_no3_meq: 5, p_meq: 1, s_meq: 2 });
      assert.equal(r.ok, true);
      var ca = r.cations_K_Ca_Mg.percents.find(function (p) { return p.ion === 'Ca'; });
      assert.equal(ca.pct, 50);
    }
  },
  {
    name: 'Público: uniformidad DU 100% caudales iguales',
    run: function () {
      var freeCalc = require('../netlify/functions/lib/public-mcp-free-calc.js');
      var r = freeCalc.calculateIrrigationUniformity({ samples: [4, 4, 4, 4, 4, 4, 4, 4] });
      assert.equal(r.ok, true);
      assert.equal(r.result.du, 100);
    }
  },
  {
    name: 'Público: foliar window sweet spot',
    run: function () {
      var freeCalc = require('../netlify/functions/lib/public-mcp-free-calc.js');
      var r = freeCalc.classifyFoliarWindow({ temperature_C: 20, rh_pct: 60, wind_kmh: 5 });
      assert.equal(r.ok, true);
      assert.equal(r.classification.classInfo.key, 'muy_favorable');
    }
  },
  {
    name: 'Público: ISH con semanas y kc',
    run: function () {
      var freeCalc = require('../netlify/functions/lib/public-mcp-free-calc.js');
      var r = freeCalc.calculateIsh({
        kc: 1,
        fp: 0.25,
        weeks: [
          { et0_mm: 20, rain_mm: 10, irrigation_mm: 10 },
          { et0_mm: 20, rain_mm: 5, irrigation_mm: 10 }
        ]
      });
      assert.equal(r.ok, true);
      assert.ok(r.result.ish != null && r.result.ish >= 0 && r.result.ish <= 100);
    }
  },
  {
    name: 'Público: tools oleada 2 registradas',
    run: function () {
      var names = tools.toolsList().map(function (t) { return t.name; });
      [
        'calculate_vpd_at_point',
        'meq_triangle_balance',
        'calculate_irrigation_uniformity',
        'classify_foliar_window',
        'calculate_ish',
        'convert_oxide_elemental',
        'soil_cic_balance',
        'water_hardness',
        'calculate_irrigation_balance',
        'granular_mix_blend'
      ].forEach(function (n) {
        assert.ok(names.indexOf(n) >= 0, n);
      });
    }
  },
  {
    name: 'Público: convert_oxide_elemental P2O5→P',
    run: function () {
      var freeCalc = require('../netlify/functions/lib/public-mcp-free-calc.js');
      var r = freeCalc.convertOxideElemental({ form: 'P2O5', value: 2.291, direction: 'to_elemental' });
      assert.equal(r.ok, true);
      assert.ok(Math.abs(r.result - 1) < 0.001);
    }
  },
  {
    name: 'Público: soil_cic_balance ideal Ca 75%',
    run: function () {
      var freeCalc = require('../netlify/functions/lib/public-mcp-free-calc.js');
      var r = freeCalc.soilCicBalance({ k_meq: 0.5, ca_meq: 5, mg_meq: 1.5, h_meq: 1, na_meq: 0, al_meq: 0 });
      assert.equal(r.ok, true);
      assert.equal(r.cic_meq_100g, 8);
      assert.equal(r.ideal_meq.Ca, 6);
      assert.equal(r.ideal_meq.K, 0.4);
    }
  },
  {
    name: 'Público: water_hardness class blanda',
    run: function () {
      var freeCalc = require('../netlify/functions/lib/public-mcp-free-calc.js');
      var r = freeCalc.waterHardness({ hardness_ppm: 40 });
      assert.equal(r.ok, true);
      assert.equal(r.class_es, 'Blanda');
    }
  },
  {
    name: 'Público: irrigation_balance manual',
    run: async function () {
      var freeCalc = require('../netlify/functions/lib/public-mcp-free-calc.js');
      var r = await freeCalc.calculateIrrigationBalance({
        kc: 1,
        et0_mm: 35,
        rain_mm: 10,
        irrigation_mm: 20,
        crop_ha: 1
      });
      assert.equal(r.ok, true);
      assert.equal(r.etc_mm, 35);
      assert.equal(r.deficit_crop_mm, 25);
      assert.equal(r.balance_mm, 5);
    }
  },
  {
    name: 'Público: granular_mix_blend Urea+MAP',
    run: function () {
      var freeCalc = require('../netlify/functions/lib/public-mcp-free-calc.js');
      var r = freeCalc.granularMixBlend({
        materials: [
          { name: 'Urea', pct: 50 },
          { name: 'MAP', pct: 50 }
        ],
        dose_kg_ha: 200
      });
      assert.equal(r.ok, true);
      assert.equal(r.blend_pct.N, 28.5);
      assert.equal(r.blend_pct.P2O5, 26);
      assert.equal(r.supply_kg_ha.N, 57);
    }
  },
  {
    name: 'Público: tools oleada 3 registradas',
    run: function () {
      var names = tools.toolsList().map(function (t) { return t.name; });
      [
        'calculate_n_mineralizable',
        'calculate_hydro_pulse',
        'convert_physical_units',
        'lookup_solubility_is',
        'mulder_interactions',
        'distribute_extraction_by_stage',
        'soil_available_water',
        'fertilizer_compatibility',
        'fertilizer_composition_from_formula',
        'agroclimate_forecast_at_point',
        'calculate_fertilizer_carbon'
      ].forEach(function (n) {
        assert.ok(names.indexOf(n) >= 0, n);
      });
    }
  },
  {
    name: 'Público: N mineralizable fórmula',
    run: function () {
      var x = require('../netlify/functions/lib/public-mcp-free-calc-extra.js');
      var r = x.calculateNMineralizable({ depth_cm: 30, bulk_density: 1.2, reach_pct: 70, om_pct: 2, n_in_om_pct: 5, mineralization_pct: 2 });
      assert.equal(r.ok, true);
      assert.equal(r.mass_kg_ha.n_mineralizable_year, 50.4);
    }
  },
  {
    name: 'Público: pulso hidro minutos',
    run: function () {
      var x = require('../netlify/functions/lib/public-mcp-free-calc-extra.js');
      var r = x.calculateHydroPulse({
        container_L: 10,
        aw_pct: 40,
        depletion_pct: 50,
        drain_pct: 20,
        dripper_lph: 2
      });
      assert.equal(r.ok, true);
      assert.equal(r.minutes, 75);
    }
  },
  {
    name: 'Público: composición KNO3',
    run: function () {
      var x = require('../netlify/functions/lib/public-mcp-free-calc-extra.js');
      var r = x.fertilizerCompositionFromFormula({ formula: 'KNO3' });
      assert.equal(r.ok, true);
      assert.ok(r.product_weighted_pct.N > 13 && r.product_weighted_pct.N < 15);
      assert.ok(r.product_weighted_pct.K2O > 45);
    }
  },
  {
    name: 'Público: compatibilidad MAP vs nitrato Ca = I',
    run: function () {
      var x = require('../netlify/functions/lib/public-mcp-free-calc-extra.js');
      var r = x.fertilizerCompatibility({ a: 'map', b: 'nitrato_calcio_granular' });
      assert.equal(r.ok, true);
      assert.equal(r.level, 'I');
    }
  },
  {
    name: 'Público: Mulder K antagoniza Mg',
    run: function () {
      var x = require('../netlify/functions/lib/public-mcp-free-calc-extra.js');
      var r = x.mulderInteractions({ ion: 'k' });
      assert.equal(r.ok, true);
      assert.ok(r.antagonists.some(function (a) { return a.id === 'mg'; }));
    }
  },
  {
    name: 'Público: agua útil Franco',
    run: function () {
      var x = require('../netlify/functions/lib/public-mcp-free-calc-extra.js');
      var r = x.soilAvailableWater({ texture: 'Franco', depth_cm: 30, area_ha: 1 });
      assert.equal(r.ok, true);
      assert.ok(r.available_water_pct > 0);
    }
  },
  {
    name: 'Público: extracción por etapa suma kg',
    run: function () {
      var x = require('../netlify/functions/lib/public-mcp-free-calc-extra.js');
      var r = x.distributeExtractionByStage({
        totals_kg_ha: { N: 100 },
        stages: [
          { name: 'veg', pct: 40 },
          { name: 'rep', pct: 60 }
        ]
      });
      assert.equal(r.ok, true);
      assert.equal(r.by_stage[0].kg_ha.N, 40);
      assert.equal(r.by_stage[1].kg_ha.N, 60);
    }
  },
  {
    name: 'Público: solubilidad urea',
    run: function () {
      var x = require('../netlify/functions/lib/public-mcp-free-calc-extra.js');
      var r = x.lookupSolubilityIs({ q: 'urea' });
      assert.equal(r.ok, true);
      assert.ok(r.results.length >= 1);
      assert.equal(r.results[0].class_es, 'Alta');
    }
  },
  {
    name: 'Público: magnitudes ha→m2',
    run: function () {
      var x = require('../netlify/functions/lib/public-mcp-free-calc-extra.js');
      var r = x.convertPhysicalUnits({ value: 1, from: 'ha', to: 'm2' });
      assert.equal(r.ok, true);
      assert.equal(r.result, 10000);
    }
  },
  {
    name: 'Público: huella carbono urea',
    run: function () {
      var x = require('../netlify/functions/lib/public-mcp-free-calc-extra.js');
      var r = x.calculateFertilizerCarbon({
        area_ha: 1,
        rows: [{ fertilizer_id: 'urea', dose: 100, dose_unit: 'kg_ha' }]
      });
      assert.equal(r.ok, true);
      assert.ok(r.result && r.result.totals && r.result.totals.total_kg_co2e > 0);
    }
  },
  {
    name: 'Público: OAuth PKCE firma y verifica código',
    run: function () {
      var secret = 'test-secret-not-admin';
      var verifier = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-aa';
      var payload = {
        v: 1,
        at: 'access',
        ru: 'https://chatgpt.com/connector/oauth/callback',
        cc: mcpAuth.pkceS256(verifier),
        exp: Date.now() + 60000
      };
      var code = mcpAuth.signCode(payload, secret);
      var back = mcpAuth.verifyCode(code, secret);
      assert.equal(back.at, 'access');
      assert.equal(back.cc, mcpAuth.pkceS256(verifier));
      assert.equal(mcpAuth.allowedRedirect(payload.ru), true);
      assert.equal(mcpAuth.allowedRedirect('https://evil.example/cb'), false);
    }
  },
  {
    name: 'Público: OAuth deriva secreto de variable ya existente',
    run: function () {
      var prev = process.env.NUTRIPLANT_PUBLIC_MCP_OAUTH_SECRET;
      var prevAgro = process.env.AGROCLIMATE_TOKEN_SECRET;
      delete process.env.NUTRIPLANT_PUBLIC_MCP_OAUTH_SECRET;
      process.env.AGROCLIMATE_TOKEN_SECRET = 'seed-agro-test';
      var a = mcpAuth.oauthSecret();
      var b = mcpAuth.oauthSecret();
      assert.ok(a && a.length === 64);
      assert.equal(a, b);
      process.env.NUTRIPLANT_PUBLIC_MCP_OAUTH_SECRET = 'explicit-wins';
      assert.equal(mcpAuth.oauthSecret(), 'explicit-wins');
      if (prev == null) delete process.env.NUTRIPLANT_PUBLIC_MCP_OAUTH_SECRET;
      else process.env.NUTRIPLANT_PUBLIC_MCP_OAUTH_SECRET = prev;
      if (prevAgro == null) delete process.env.AGROCLIMATE_TOKEN_SECRET;
      else process.env.AGROCLIMATE_TOKEN_SECRET = prevAgro;
    }
  },
  {
    name: 'Público: MCP initialize no pide admin',
    run: async function () {
      var res = await handler(
        mcpEvent('POST', { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} })
      );
      assert.equal(res.statusCode, 200);
      var body = JSON.parse(res.body);
      assert.equal(body.result.serverInfo.name, 'NutriPlant PRO');
      assert.match(body.result.instructions, /No hay roster admin|otros clientes|plugin público/);
    }
  },
  {
    name: 'Público: salt_from_meq via MCP sin token',
    run: async function () {
      var res = await handler(
        mcpEvent('POST', {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'salt_from_meq',
            arguments: { nutrient: 'Ca', meq_L: 1, salt_id: 'nitrato de calcio' }
          }
        })
      );
      var body = JSON.parse(res.body);
      var parsed = JSON.parse(body.result.content[0].text);
      assert.equal(parsed.ok, true);
      assert.ok(parsed.dose.g_per_m3 > 100);
    }
  },
  {
    name: 'Público: list_my_projects sin sesión → 401 OAuth',
    run: async function () {
      var res = await handler(
        mcpEvent('POST', {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: { name: 'list_my_projects', arguments: {} }
        })
      );
      assert.equal(res.statusCode, 401);
      assert.match(String(res.headers['WWW-Authenticate'] || ''), /oauth-protected-resource/);
    }
  }
];
