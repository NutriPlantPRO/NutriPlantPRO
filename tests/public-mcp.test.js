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
    name: 'Público: mixed auth — free=noauth, suscriptor=oauth2',
    run: function () {
      var list = tools.toolsList();
      var free = list.find(function (t) { return t.name === 'salt_from_meq'; });
      var sub = list.find(function (t) { return t.name === 'list_my_projects'; });
      assert.ok(free);
      assert.ok(sub);
      assert.deepEqual(free.securitySchemes, [{ type: 'noauth' }]);
      assert.deepEqual(free._meta.securitySchemes, [{ type: 'noauth' }]);
      assert.equal(sub.securitySchemes[0].type, 'oauth2');
      assert.ok(sub.securitySchemes[0].scopes.indexOf('nutriplant.subscriber.read') >= 0);
      assert.equal(sub._meta.securitySchemes[0].type, 'oauth2');
    }
  },
  {
    name: 'Público: prompts starter con modos invitado/sesión',
    run: function () {
      var prompts = tools.promptsList();
      assert.ok(prompts.some(function (p) { return p.name === 'alcance_modos'; }));
      var got = tools.promptGet('alcance_modos');
      assert.ok(got && got.messages && got.messages[0]);
      assert.match(got.messages[0].content.text, /SIN cuenta|sesión/i);
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
        fertility: {
          p: 20,
          k: 100,
          ca: 800,
          mg: 100,
          fe: 5,
          zn: 2,
          depthCm: 20,
          reachPct: 100,
          pMethod: 'Bray',
          microMethod: 'DTPA',
          ideal: { p: 30, k: 150 }
        },
        physical: { bulkDensity: 1.2, fieldCapacity: 18, wiltingPoint: 9 },
        cations: { k: 0.5, ca: 8, mg: 1.5, cic: 12, pctCa: 66, pctK: 4 },
        ratios: { caMg: 5.3, caK: 16 },
        phSection: { ph: 6.8, salinity: 1.2 }
      });
      assert.ok(r.kg_ha && r.kg_ha.nutrients.p);
      assert.equal(r.ph, 6.8);
      assert.ok(r.kg_ha.nutrients.p.kg_ha_adjustment != null);
      assert.equal(r.fertility.p_method, 'Bray');
      assert.equal(r.fertility.lab_ppm.fe, 5);
      assert.equal(r.cations_pct_cic.ca, 66);
      assert.ok(r.chart_elements && r.chart_elements.length >= 2);
      assert.ok(r.chart_elements.some(function (e) { return e.id === 'k' && e.status === 'bajo'; }));
      assert.ok(r.chart_elements.some(function (e) { return e.id === 'p'; }));
    }
  },
  {
    name: 'Público: labs foliar/fruta/pasta chart_elements',
    run: function () {
      var read = require('../netlify/functions/lib/public-mcp-subscriber-read.js');
      var f = read.summarizeFoliarReport({
        title: 'F1',
        macros: { N: 2.1, Ca: 0.8, K: 3.2 },
        micros: { Fe: 80, Zn: 20 },
        optimalMacro: { N: 3, Ca: 1.25, K: 2.5 }
      });
      assert.ok(f.macros.Ca.dop_percent < 0);
      assert.ok(f.chart_elements.some(function (e) { return e.id === 'Ca'; }));
      var fr = read.summarizeFrutaReport({
        macros: { N: 1.5, Ca: 0.1 },
        micros: { B: 40 },
        calidad: { brix: 10, materiaSeca: 14 },
        calcio: { caTotal: 15, caSolublePct: 20 }
      });
      assert.ok(fr.micros.B);
      assert.ok(fr.calcio.caTotal);
      assert.ok(fr.chart_elements.length >= 3);
      var p = read.summarizePastaReport({
        general: { cee: 2.1, phe: 6.2 },
        cations: { k_ppm: 40, ca_ppm: 120, mg_ppm: 30, na_ppm: 20 },
        anions: { no3_ppm: 50, so4_ppm: 80, cl_ppm: 40 },
        micros: { fe: 1.2, zn: 0.3 },
        ideal: { k: 50, ca: 150 }
      });
      assert.equal(p.general.ce, 2.1);
      assert.equal(p.cations.k.ppm, 40);
      assert.equal(p.cations.k.diff_vs_ideal_ppm, -10);
      assert.ok(p.chart_elements.length >= 4);
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
            columns: [
              { id: 'col1', materialId: 'nitrato_calcio_granular', name: 'Nitrato de Calcio' },
              { id: 'col2', materialId: 'mkp', name: 'MKP' }
            ],
            weeks: [
              {
                stage: 'Veg',
                totals: { N_NO3: 10, N_NH4: 2, K2O: 20, P2O5: 5, K: 16.6, P: 2.18, Ca: 7, CaO: 10 },
                kgByCol: { col1: 12, col2: 4 }
              },
              {
                stage: 'Rep',
                totals: { N_NO3: 15, K2O: 30, P2O5: 8, K: 24.9, P: 3.49 },
                kgByCol: { col1: 8, col2: 6 }
              }
            ],
            chartWaterByStageM3ha: [40, 50]
          }
        },
        extraccionEtapa: {
          stages: ['Veg', 'Rep'],
          nutrients: [{ id: 'N', label: 'N', total: 100 }],
          pct: { N: [40, 60] },
          waterDepthByStageM3ha: [40, 50]
        }
      }, 1);
      assert.equal(r.has_program, true);
      assert.equal(r.stages_count, 2);
      assert.equal(r.selected_stage.index, 1);
      assert.equal(r.program_contribution_kg_ha_cycle.N_NO3, 25);
      assert.ok(r.stages[0].fertilizers_kg_ha.length >= 2);
      assert.ok(r.stages[0].meq_per_L);
      assert.ok(r.stages[0].percent && r.stages[0].percent.anions_triangle_N_P_S);
      assert.equal(r.chart_lamina_m3ha_by_stage[1], 50);
      assert.ok(r.chart_nutrient_kg_ha_by_stage.N_NO3.length === 2);
      assert.ok(r.objective_distribution_pct && r.objective_distribution_pct.has_data);
      assert.equal(r.objective_distribution_pct.pct_by_nutrient.N[1], 60);
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
          adjustments: { k: 0.4, ca: 6, mg: 1.2, h: 0, na: 0, al: 0 }
        },
        amendments: {
          selected: ['gypsum', 'custom_yeso_mix'],
          soilReachPercent: 50,
          results: {
            isVisible: true,
            amount: '200 kg/ha',
            rawDetails: [
              {
                id: 'gypsum',
                name: 'Yeso Agrícola',
                amount: 400,
                ca: 93.2,
                mg: 0,
                k: 0,
                so4: 223.2,
                si: 0,
                elementoLimitante: { elemento: 'Ca' }
              },
              {
                id: 'custom_yeso_mix',
                name: 'Mix personalizado',
                amount: 200,
                ca: 40,
                mg: 10,
                k: 5,
                so4: 0,
                si: 0,
                isCustom: true
              }
            ],
            rawTotals: { totalCa: 133.2, totalMg: 10, totalK: 5, totalSi: 0, totalNaRemoval: 0 }
          }
        }
      });
      assert.equal(r.has_data, true);
      assert.equal(r.initial_meq.CIC, 8);
      assert.equal(r.current_saturation_pct.Ca, 75);
      assert.equal(r.ideal_meq_cic.Ca, 6);
      assert.equal(r.soil_reach_pct, 50);
      assert.equal(r.doses_count, 2);
      assert.equal(r.doses_kg_ha[0].dose_kg_ha, 200);
      assert.equal(r.doses_kg_ha[1].is_custom, true);
      assert.equal(r.totals_kg_ha.Ca, 66.6);
      assert.ok(r.chart_elements && r.chart_elements.length >= 3);
      assert.ok(r.chart_doses && r.chart_doses.length === 2);
      assert.match(String(r.presentation_hint || ''), /Didáctico|chart_elements/);
    }
  },
  {
    name: 'Público: biblioteca curvas extracción por etapa',
    run: function () {
      var read = require('../netlify/functions/lib/public-mcp-subscriber-read.js');
      var lib = read.extractionLibraryDeep({
        version: 1,
        presets: [
          {
            id: 'c1',
            title: 'Tomate invernadero',
            savedAt: 1700000000000,
            state: {
              axis: 'etapa',
              stages: ['Veg', 'Flor', 'Fruto'],
              nutrients: [
                { id: 'N', label: 'N', total: 200 },
                { id: 'K', label: 'K', total: 250 }
              ],
              pct: { N: [30, 30, 40], K: [20, 40, 40] },
              waterDepthByStageM3ha: [40, 50, 60]
            }
          },
          {
            id: 'c2',
            title: 'Maíz',
            state: {
              stages: ['A', 'B'],
              nutrients: [{ id: 'N', label: 'N', total: 180 }],
              pct: { N: [50, 50] }
            }
          }
        ]
      });
      assert.equal(lib.has_data, true);
      assert.equal(lib.curves_count, 2);
      assert.equal(lib.curves[0].title, 'Maíz');
      assert.ok(lib.curves[1].curve.by_stage.length === 3);
      assert.equal(lib.curves[1].curve.pct_by_nutrient.N[2], 40);
      assert.ok(lib.chart_curves.length === 2);

      var deep = read.buildDeepRead(
        {
          calculators: {
            extraccionEtapa: {
              stages: ['Veg', 'Rep'],
              nutrients: [{ id: 'N', label: 'N', total: 100 }],
              pct: { N: [40, 60] }
            },
            extraccionEtapaPresets: {
              presets: [
                {
                  id: 'legacy1',
                  title: 'Legacy proyecto',
                  state: {
                    stages: ['X'],
                    nutrients: [{ id: 'P', label: 'P', total: 50 }],
                    pct: { P: [100] }
                  }
                }
              ]
            }
          }
        },
        { section: 'distribucion_nutrimental' }
      );
      assert.equal(deep.extraction.has_data, true);
      assert.equal(deep.extraction_library.has_data, true);
      assert.equal(deep.extraction_library.curves[0].id, 'legacy1');
    }
  },
  {
    name: 'Público: clima deep completo lluvia/ET0/balance',
    run: function () {
      var climateRadar = require('../netlify/functions/lib/public-mcp-climate-radar.js');
      var r = climateRadar.summarizeClimateAnalysis({
        lastUpdated: '2026-03-01',
        rainfall: {
          monthsPrev: { '01': 10, '02': 20 },
          monthsCurr: { '01': 5 },
          previousYear: 2025,
          currentYear: 2026,
          years: {
            2025: { months: { '01': 10, '02': 20 }, partial: false },
            2026: { months: { '01': 5 }, partial: true }
          }
        },
        et0: {
          monthsPrev: { '01': 80, '02': 90 },
          monthsCurr: { '01': 70 },
          previousYear: 2025,
          currentYear: 2026
        },
        rolling: { et0_7d: 28, rain_7d: 4, et0_30d: 110, rain_30d: 12 },
        irrigationQuickCalc: { kc: 1.1, cropName: 'Tomate', periodDays: 7, irrigationValue: 20, irrigationUnit: 'mm', cropAreaHa: 2, irrigatedAreaHa: 2 },
        lastReading: { fetchedAt: '2026-03-01T12:00:00Z', temperature: 24, humidity: 55, rainTodayMm: 0, et0TodayMm: 4.2 }
      });
      assert.equal(r.has_data, true);
      assert.equal(r.rainfall.has_data, true);
      assert.ok(r.rainfall.years.length >= 1);
      assert.equal(r.et0.has_data, true);
      assert.equal(r.rolling_windows.et0_7d_mm, 28);
      assert.equal(r.irrigation_quick_calc.kc, 1.1);
      assert.equal(r.tiempo_actual_guardado.temperature_c, 24);
      assert.ok(r.chart_elements && r.chart_elements.some(function (e) { return e.id === 'et0_7d'; }));
      assert.ok(r.chart_months && r.chart_months.length >= 1);
      assert.match(String(r.presentation_hint || ''), /Didáctico|chart_/);
    }
  },
  {
    name: 'Público: radar snapshot arma capas desde meta',
    run: async function () {
      var climateRadar = require('../netlify/functions/lib/public-mcp-climate-radar.js');
      var calls = [];
      var fakeSb = {
        storage: {
          from: function () {
            return {
              createSignedUrl: async function (path, ttl) {
                calls.push({ path: path, ttl: ttl });
                return { data: { signedUrl: 'https://signed.example/' + path }, error: null };
              }
            };
          }
        }
      };
      var snap = await climateRadar.buildRadarImageSnapshot(fakeSb, {
        id: 'req-1',
        created_at: '2026-03-01T00:00:00Z',
        month_key: '2026-03',
        image_storage_path: 'u/p/ndvi.png',
        meta: {
          date_start: '2026-02-20',
          date_end: '2026-03-01',
          ndmi_storage_path: 'u/p/ndmi.png',
          ndre_storage_path: 'u/p/ndre.png',
          rgb_storage_path: 'u/p/rgb.png',
          location_snapshot: { area_hectares: 12.5, center: { lat: 19.1, lng: -99.1 } }
        }
      });
      assert.equal(snap.id, 'req-1');
      assert.match(snap.images.ndvi.signed_url, /ndvi\.png/);
      assert.match(snap.images.ndmi.signed_url, /ndmi\.png/);
      assert.match(snap.images.ndre.signed_url, /ndre\.png/);
      assert.match(snap.images.rgb.signed_url, /rgb\.png/);
      assert.equal(snap.area_hectares, 12.5);
      assert.equal(calls.length, 4);
    }
  },
  {
    name: 'Público: ferti personalizados en catálogo',
    run: function () {
      var read = require('../netlify/functions/lib/public-mcp-subscriber-read.js');
      var r = read.fertigationDeep({
        fertirriego: {
          customMaterials: {
            items: [{ id: 'custom_99', name: 'Mi NPK', N_NO3: 10, P2O5: 20, K2O: 30 }]
          },
          program: {
            timeUnit: 'semana',
            columns: [
              { id: 'c1', materialId: 'mkp', name: 'MKP' },
              { id: 'c2', materialId: 'custom_99', name: 'Mi NPK' }
            ],
            weeks: [{ totals: { N_NO3: 1, P2O5: 2 }, kgByCol: { c1: 5, c2: 12 } }],
            chartWaterByStageM3ha: [100]
          }
        }
      });
      assert.equal(r.has_program, true);
      assert.equal(r.custom_fertilizers_in_program, 1);
      var custom = r.fertilizers_catalog.find(function (f) { return f.material_id === 'custom_99'; });
      assert.ok(custom);
      assert.equal(custom.is_custom, true);
      assert.equal(custom.composition_pct.K2O, 30);
      assert.equal(r.stages[0].fertilizers_kg_ha[1].kg_ha, 12);
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
      assert.match(String(link.section_label || link.section_select || ''), /foliar/i);
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
    name: 'Público: list_my_projects sin sesión → challenge OAuth (mixed auth)',
    run: async function () {
      var res = await handler(
        mcpEvent('POST', {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: { name: 'list_my_projects', arguments: {} }
        })
      );
      assert.equal(res.statusCode, 200);
      assert.match(String(res.headers['WWW-Authenticate'] || ''), /oauth-protected-resource/);
      assert.match(String(res.headers['WWW-Authenticate'] || ''), /insufficient_scope/);
      var body = JSON.parse(res.body);
      assert.equal(body.result.isError, true);
      assert.ok(body.result._meta && body.result._meta['mcp/www_authenticate']);
      assert.match(String(body.result.content[0].text), /Conectar cuenta|sesión/i);
    }
  },
  {
    name: 'Público: initialize declara modos en instructions + v0.7',
    run: async function () {
      var res = await handler(
        mcpEvent('POST', { jsonrpc: '2.0', id: 9, method: 'initialize', params: {} })
      );
      var body = JSON.parse(res.body);
      assert.equal(body.result.serverInfo.version, '0.7.0');
      assert.match(body.result.instructions, /DOS MODOS|Sin cuenta/i);
      assert.ok(body.result.capabilities.prompts);
    }
  }
];
