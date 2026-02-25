/**
 * NutriPlant PRO - Renderizador compartido de reportes de análisis
 * Usado por: panel de admin y (opcional) panel de usuario para ver un reporte
 * Una sola fuente de verdad: tablas horizontales, mismas etiquetas que ve el usuario.
 */
(function (global) {
    function defaultEscape(s) {
        if (s == null) return '';
        var str = String(s);
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    function formatNum(val, maxDecimals) {
        if (val === '—' || val === '' || val == null) return (val === '' || val == null) ? '—' : String(val);
        var n = parseFloat(String(val).replace(',', '.'));
        if (isNaN(n)) return String(val);
        maxDecimals = maxDecimals == null ? 2 : maxDecimals;
        return n.toFixed(maxDecimals);
    }

    function renderAnalysisReport(obj, options) {
        if (!obj || typeof obj !== 'object') return '';
        var escapeHtml = (options && typeof options.escapeHtml === 'function') ? options.escapeHtml : defaultEscape;

        var skip = { title: 1, name: 1, meta: 1, date: 1, calculatedAt: 1, id: 1 };
        function flatten(o, prefix) {
            prefix = prefix || '';
            var rows = [];
            for (var k in o) {
                if (!Object.prototype.hasOwnProperty.call(o, k) || skip[k]) continue;
                var v = o[k];
                var key = prefix ? prefix + '.' + k : k;
                if (v !== null && typeof v === 'object' && !Array.isArray(v) && prefix.length < 20) {
                    rows = rows.concat(flatten(v, key));
                } else if (Array.isArray(v)) {
                    rows.push({ k: key, v: v.length ? JSON.stringify(v).slice(0, 80) + (JSON.stringify(v).length > 80 ? '…' : '') : '[]' });
                } else {
                    rows.push({ k: key, v: v === '' ? '—' : String(v) });
                }
            }
            return rows;
        }

        var paramLabels = { ca: 'Ca', mg: 'Mg', k: 'K', na: 'Na', al: 'Al', h: 'H', cic: 'CIC', pctca: '% Ca', pctmg: '% Mg', pctk: '% K', pctna: '% Na', pctal: '% Al', pcth: '% H', no3: 'NO₃', so4: 'SO₄', hco3: 'HCO₃', cl: 'Cl', po4: 'PO₄', co3: 'CO₃', fe: 'Fe', mn: 'Mn', zn: 'Zn', cu: 'Cu', b: 'B', mo: 'Mo', n_nh4: 'N-NH₄' };
        var DEFAULT_REF = { ca: '140–220', mg: '40–70', k: '180–300', na: '—', so4: '60–110', hco3: '—', cl: '—', co3: '—', po4: '30–60', no3: '140–200', fe: '1.5–3.0', mn: '0.3–1.0', zn: '0.05–0.3', cu: '0.03–0.1', b: '0.2–0.5', mo: '0.01–0.05', n_nh4: '—' };
        function getRefDisplay(idealVal, param) {
            if (idealVal != null && idealVal !== '' && String(idealVal).trim() !== '') return String(idealVal).trim();
            return DEFAULT_REF[param] || '—';
        }
        function paramLabel(p) {
            return paramLabels[p] || (p.replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }));
        }
        function statusFromValRef(val, ref) {
            if (val === '—' || ref === '—' || val === '' || ref === '') return { text: '—', cls: '' };
            var v = parseFloat(String(val).replace(',', '.'));
            var r = parseFloat(String(ref).replace(',', '.'));
            if (isNaN(v) || isNaN(r) || r === 0) return { text: '—', cls: '' };
            var pct = ((v - r) / r) * 100;
            if (Math.abs(pct) <= 10) return { text: 'Dentro', cls: 'badge-ok' };
            if (pct < 0) return { text: 'Bajo', cls: 'badge-low' };
            return { text: 'Alto', cls: 'badge-high' };
        }

        var groupTitles = { general: 'General', cations: 'Cationes intercambiables y CIC', anions: 'Aniones', micros: 'Micronutrientes', ideal: 'Parámetros de referencia', physical: 'Propiedades físicas', phSection: 'pH y salinidad', fertility: 'Fertilidad del suelo', ratios: 'Relaciones entre cationes' };
        function friendlyLabel(key) {
            var part = key.split('.').pop() || key;
            return part.replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
        }
        var RATIO_LABELS = { camg: 'Ca/Mg', mgk: 'Mg/K', camgk: '(Ca+Mg)/K', cak: 'Ca/K' };
        var AGUA_ACIDS = [
            { id: 'acido_nitrico_55', name: 'Ácido Nítrico 55%', meqPerMl: 11.6 },
            { id: 'acido_sulfurico_98', name: 'Ácido Sulfúrico 98%', meqPerMl: 36.7 },
            { id: 'acido_fosforico_75', name: 'Ácido Fosfórico 75%', meqPerMl: 12.0 },
            { id: 'acido_fosforico_85', name: 'Ácido Fosfórico 85%', meqPerMl: 14.6 }
        ];
        var SOIL_PHYSICAL_LABELS = { texturalClass: 'Clase textural', saturationPoint: 'Punto saturación %', fieldCapacity: 'Capacidad de campo %', wiltingPoint: 'Punto marchitamiento %', hydraulicConductivity: 'Cond. hidráulica cm/h', bulkDensity: 'Densidad aparente g/cm³' };
        var SOIL_PH_LABELS = { ph: 'pH (1:2 agua)', phBuffer: 'pH Buffer', totalCarbonates: 'Carbonatos totales %', salinity: 'Salinidad CE dS/m' };
        var SOIL_FERTILITY_LABELS = { pMethod: 'Método P', mo: 'MO %', nNo3: 'N-NO₃ ppm', p: 'P', k: 'K', ca: 'Ca', mg: 'Mg', na: 'Na', s: 'S', fe: 'Fe', mn: 'Mn', b: 'B', zn: 'Zn', cu: 'Cu', moly: 'Mo', al: 'Al', depthCm: 'Profundidad (cm)', reachPct: 'Suelo explorado por raíces (%)' };
        var SOIL_DEFAULT_REF = { texturalClass: '—', saturationPoint: '—', fieldCapacity: '—', wiltingPoint: '—', hydraulicConductivity: '—', bulkDensity: '—', ph: '6.0–7.5', phBuffer: '—', totalCarbonates: '—', salinity: '—', pMethod: '—', mo: '3', nNo3: '20', p: '40', k: '—', ca: '—', mg: '—', na: '0', s: '15', fe: '20', mn: '20', b: '1', zn: '3', cu: '1.5', al: '0', moly: '0.1' };
        function getSoilRefDisplay(idealVal, param, fertilityIdeal) {
            if (fertilityIdeal && fertilityIdeal[param] != null && fertilityIdeal[param] !== '' && String(fertilityIdeal[param]).trim() !== '') return String(fertilityIdeal[param]).trim();
            if (idealVal != null && idealVal !== '' && String(idealVal).trim() !== '') return String(idealVal).trim();
            return SOIL_DEFAULT_REF[param] || '—';
        }

        var rows = flatten(obj);
        if (!rows.length) return '<div class="admin-analysis-data-wrap"><p class="admin-analysis-empty" style="color:#64748b; font-size: 12px; margin: 0;">Sin datos adicionales.</p></div>';

        var byGroup = {};
        for (var i = 0; i < rows.length; i++) {
            var r = rows[i];
            var group = r.k.indexOf('.') >= 0 ? r.k.split('.')[0] : 'Otros';
            if (!byGroup[group]) byGroup[group] = [];
            byGroup[group].push(r);
        }

        var ideal = obj.ideal || {};
        var fertilityIdeal = (obj.fertility && obj.fertility.ideal && typeof obj.fertility.ideal === 'object') ? obj.fertility.ideal : {};
        var isSoilType = !!(byGroup['physical'] || byGroup['phSection'] || (byGroup['fertility'] && !byGroup['cations']));
        var hasAguaSignature = Object.prototype.hasOwnProperty.call(obj, 'm3Riego') || Object.prototype.hasOwnProperty.call(obj, 'acidId');
        var isAguaType = !!(hasAguaSignature && obj.anions && (obj.anions.hco3_meq != null || obj.anions.co3_meq != null));
        var isExtractoType = !isSoilType && !isAguaType && !!byGroup['ratios'];
        var isSolucionType = !isSoilType && !isAguaType && !isExtractoType;
        var isFoliarType = !isSoilType && !isAguaType && !!obj.macros && !!obj.micros && !obj.calidad && !obj.calcio;
        var isFrutaType = !isSoilType && !isAguaType && !!obj.macros && !!obj.micros && !!obj.calidad && !!obj.calcio;
        var FOLIAR_OPTIMAL_MACRO = { N: 3, P: 0.275, K: 2.5, Ca: 1.25, Mg: 0.4, S: 0.325 };
        var FOLIAR_OPTIMAL_MICRO = { Fe: 150, Mn: 160, Zn: 60, Cu: 15, B: 62.5, Mo: 2.55 };
        var FRUTA_OPTIMAL_MACRO = { N: 1.80, P: 0.25, K: 1.50, Ca: 0.25, Mg: 0.20, S: 0.18 };
        var FRUTA_OPTIMAL_MICRO = { Fe: 80, Mn: 40, Zn: 35, Cu: 10, B: 50, Mo: 0.5 };
        var FRUTA_OPTIMAL_CALIDAD = { materiaSeca: 15, brix: 12, firmeza: 5, acidezTitulable: 0.5 };
        var FRUTA_OPTIMAL_CALCIO = { caTotal: 20, caSolublePct: 18, caLigadoPct: 25, caInsolublePct: 55 };
        var FRUTA_CALIDAD_LABELS = { materiaSeca: 'Materia Seca (%)', brix: '°Brix', firmeza: 'Firmeza (kg/cm²)', acidezTitulable: 'Acidez titulable (%)' };
        var FRUTA_CALCIO_LABELS = { caTotal: 'Ca total (mg/100 g MF)', caSolublePct: '% Ca soluble', caLigadoPct: '% Ca ligado', caInsolublePct: '% Ca insoluble' };

        function getSoilParamLabel(grp, p) {
            if (grp === 'physical') return SOIL_PHYSICAL_LABELS[p] || friendlyLabel(p);
            if (grp === 'phSection') return SOIL_PH_LABELS[p] || friendlyLabel(p);
            if (grp === 'fertility') return SOIL_FERTILITY_LABELS[p] || friendlyLabel(p);
            return friendlyLabel(p);
        }

        function foliarDOPIconStatus(dop) {
            if (dop === null || typeof dop !== 'number' || isNaN(dop)) return { icon: '—', status: '—' };
            var abs = Math.abs(dop);
            var icon = abs <= 10 ? '🟢' : abs <= 25 ? '🔶' : abs <= 50 ? '🟠' : '🔴';
            var status = abs <= 10 ? 'Óptimo' : (dop < 0 ? (abs > 50 ? 'Muy bajo' : 'Bajo') : (abs > 50 ? 'Muy alto' : 'Alto'));
            return { icon: icon, status: status };
        }

        function buildFoliarReadOnly() {
            function row(n, value, optimal, isMacro) {
                var v = parseFloat(String(value == null ? '' : value).replace(',', '.'));
                var o = parseFloat(String(optimal == null ? '' : optimal).replace(',', '.'));
                var dop = (!isNaN(v) && !isNaN(o) && o !== 0) ? ((v - o) / o) * 100 : NaN;
                var st = foliarDOPIconStatus(dop);
                var vDisp = isNaN(v) ? '—' : formatNum(v, isMacro ? 3 : 2);
                var oDisp = isNaN(o) ? '—' : formatNum(o, isMacro ? 3 : 2);
                var dDisp = isNaN(dop) ? '—' : (st.icon + ' ' + (dop >= 0 ? '+' : '') + formatNum(dop, 1) + '%');
                return '<tr><td class="col-concept">' + escapeHtml(n) + '</td><td>' + escapeHtml(vDisp) + '</td><td>' + escapeHtml(oDisp) + '</td><td>' + escapeHtml(dDisp) + '</td><td>' + escapeHtml(st.status) + '</td></tr>';
            }

            var macros = obj.macros || {};
            var micros = obj.micros || {};
            var optMacro = obj.optimalMacro || {};
            var optMicro = obj.optimalMicro || {};

            var macroRows = ['N', 'P', 'K', 'Ca', 'Mg', 'S'].map(function (n) {
                var o = (optMacro[n] !== undefined && optMacro[n] !== '') ? optMacro[n] : FOLIAR_OPTIMAL_MACRO[n];
                return row(n, macros[n], o, true);
            }).join('');
            var microRows = ['Fe', 'Mn', 'Zn', 'Cu', 'B', 'Mo'].map(function (n) {
                var o = (optMicro[n] !== undefined && optMicro[n] !== '') ? optMicro[n] : FOLIAR_OPTIMAL_MICRO[n];
                return row(n, micros[n], o, false);
            }).join('');

            var out = '<div class="admin-analysis-data-wrap">';
            out += '<p class="admin-analysis-legend"><strong>DOP</strong> = ((Valor − Óptimo) / Óptimo) × 100.</p>';
            out += '<div class="admin-analysis-group"><div class="admin-analysis-group-title">Macronutrientes (% MS)</div>';
            out += '<table class="admin-analysis-rel-table admin-soil-table-horizontal"><thead><tr><th class="col-concept">Elemento</th><th>Resultado (%)</th><th>Óptimo (%)</th><th>DOP</th><th>Estado</th></tr></thead><tbody>' + macroRows + '</tbody></table></div>';
            out += '<div class="admin-analysis-group"><div class="admin-analysis-group-title">Micronutrientes (mg/kg)</div>';
            out += '<table class="admin-analysis-rel-table admin-soil-table-horizontal"><thead><tr><th class="col-concept">Elemento</th><th>Resultado (mg/kg)</th><th>Óptimo (mg/kg)</th><th>DOP</th><th>Estado</th></tr></thead><tbody>' + microRows + '</tbody></table></div>';
            out += '<div class="admin-analysis-group" style="margin-top:12px;padding:10px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;"><strong>Regla visual (fija):</strong> 🟢 |DOP| ≤ 10% &nbsp;|&nbsp; 🔶 10–25% &nbsp;|&nbsp; 🟠 25–50% &nbsp;|&nbsp; 🔴 &gt;50%</div>';
            out += '</div>';
            return out;
        }

        function frutaICCIconStatus(icc) {
            if (icc === null || typeof icc !== 'number' || isNaN(icc)) return { icon: '—', status: '—' };
            var abs = Math.abs(icc);
            var icon = abs <= 10 ? '🟢' : abs <= 25 ? '🔶' : abs <= 50 ? '🟠' : '🔴';
            var status = abs <= 10 ? 'Óptimo' : (icc < 0 ? (abs > 50 ? 'Muy bajo' : 'Bajo') : (abs > 50 ? 'Muy alto' : 'Alto'));
            return { icon: icon, status: status };
        }

        function frutaIconFromICC(icc) {
            if (icc === null || typeof icc !== 'number' || isNaN(icc)) return '—';
            var abs = Math.abs(icc);
            if (abs <= 10) return '🟢';
            if (abs <= 25) return '🟡';
            if (abs <= 50) return '🟠';
            return '🔴';
        }

        function buildFrutaReadOnly() {
            function n(v) { var x = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isNaN(x) ? NaN : x; }
            function d(v, dec) { return isNaN(v) ? '—' : formatNum(v, dec); }
            function iccRow(label, value, optimal, resultDec, optDec) {
                var v = n(value), o = n(optimal);
                var icc = (!isNaN(v) && !isNaN(o) && o !== 0) ? ((v - o) / o) * 100 : NaN;
                var st = frutaICCIconStatus(isNaN(icc) ? null : icc);
                var iccText = isNaN(icc) ? '—' : (st.icon + ' ' + (icc >= 0 ? '+' : '') + formatNum(icc, 1) + '%');
                return '<tr><td class="col-concept">' + escapeHtml(label) + '</td><td>' + escapeHtml(d(v, resultDec)) + '</td><td>' + escapeHtml(d(o, optDec)) + '</td><td>' + escapeHtml(iccText) + '</td><td>' + escapeHtml(st.status) + '</td></tr>';
            }
            function calcioRow(label, value, optimal) {
                var v = n(value), o = n(optimal);
                var icc = (!isNaN(v) && !isNaN(o) && o !== 0) ? ((v - o) / o) * 100 : NaN;
                var icon = frutaIconFromICC(isNaN(icc) ? null : icc);
                return '<tr><td class="col-concept">' + escapeHtml(label) + '</td><td>' + escapeHtml(d(v, 2)) + '</td><td>' + escapeHtml(d(o, 2)) + '</td><td>' + escapeHtml(icon) + '</td></tr>';
            }

            var macros = obj.macros || {};
            var micros = obj.micros || {};
            var calidad = obj.calidad || {};
            var calcio = obj.calcio || {};
            var optMacro = obj.optimalMacro || {};
            var optMicro = obj.optimalMicro || {};
            var optCalidad = obj.optimalCalidad || {};
            var optCalcio = obj.optimalCalcio || {};

            var macroRows = ['N', 'P', 'K', 'Ca', 'Mg', 'S'].map(function (k) {
                var o = (optMacro[k] !== undefined && optMacro[k] !== '') ? optMacro[k] : FRUTA_OPTIMAL_MACRO[k];
                return iccRow(k, macros[k], o, 3, 3);
            }).join('');
            var microRows = ['Fe', 'Mn', 'Zn', 'Cu', 'B', 'Mo'].map(function (k) {
                var o = (optMicro[k] !== undefined && optMicro[k] !== '') ? optMicro[k] : FRUTA_OPTIMAL_MICRO[k];
                return iccRow(k, micros[k], o, 2, 2);
            }).join('');
            var calidadKeys = ['materiaSeca', 'brix', 'firmeza', 'acidezTitulable'];
            var calidadRows = calidadKeys.map(function (k) {
                var o = (optCalidad[k] !== undefined && optCalidad[k] !== '') ? optCalidad[k] : FRUTA_OPTIMAL_CALIDAD[k];
                return iccRow(FRUTA_CALIDAD_LABELS[k], calidad[k], o, 2, 2);
            }).join('');
            var calcioKeys = ['caTotal', 'caSolublePct', 'caLigadoPct', 'caInsolublePct'];
            var calcioRows = calcioKeys.map(function (k) {
                var o = (optCalcio[k] !== undefined && optCalcio[k] !== '') ? optCalcio[k] : FRUTA_OPTIMAL_CALCIO[k];
                return calcioRow(FRUTA_CALCIO_LABELS[k], calcio[k], o);
            }).join('');

            var out = '<div class="admin-analysis-data-wrap">';
            out += '<p class="admin-analysis-legend"><strong>ICC</strong> = ((Valor − Óptimo) / Óptimo) × 100.</p>';
            out += '<div class="admin-analysis-group"><div class="admin-analysis-group-title">Macronutrientes en fruta (%)</div><table class="admin-analysis-rel-table admin-soil-table-horizontal"><thead><tr><th class="col-concept">Elemento</th><th>Resultado (%)</th><th>Óptimo (%)</th><th>ICC</th><th>Estado</th></tr></thead><tbody>' + macroRows + '</tbody></table></div>';
            out += '<div class="admin-analysis-group"><div class="admin-analysis-group-title">Micronutrientes (mg/kg)</div><table class="admin-analysis-rel-table admin-soil-table-horizontal"><thead><tr><th class="col-concept">Elemento</th><th>Resultado (mg/kg)</th><th>Óptimo (mg/kg)</th><th>ICC</th><th>Estado</th></tr></thead><tbody>' + microRows + '</tbody></table></div>';
            out += '<div class="admin-analysis-group"><div class="admin-analysis-group-title">Calidad de Fruta</div><table class="admin-analysis-rel-table admin-soil-table-horizontal"><thead><tr><th class="col-concept">Determinación</th><th>Resultado</th><th>Óptimo</th><th>ICC</th><th>Estado</th></tr></thead><tbody>' + calidadRows + '</tbody></table></div>';
            out += '<div class="admin-analysis-group"><div class="admin-analysis-group-title">Calcio en Fruta (mg/100 g MF)</div><table class="admin-analysis-rel-table admin-soil-table-horizontal"><thead><tr><th class="col-concept">Determinación</th><th>Resultado</th><th>Óptimo</th><th>Estado (semáforo)</th></tr></thead><tbody>' + calcioRows + '</tbody></table></div>';
            out += '<div class="admin-analysis-group" style="margin-top:12px;padding:10px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;"><strong>Regla visual (fija):</strong> 🟢 |ICC| ≤ 10% &nbsp;|&nbsp; 🟡 10–25% &nbsp;|&nbsp; 🟠 25–50% &nbsp;|&nbsp; 🔴 &gt;50%</div>';
            out += '</div>';
            return out;
        }

        function buildSoilStyleTable(grp) {
            var items = byGroup[grp] || [];
            var labMap = {};
            var idealMap = {};
            for (var i = 0; i < items.length; i++) {
                var r = items[i];
                var key = r.k;
                var suffix = key.replace(grp + '.', '');
                if (suffix.indexOf('ideal.') === 0) {
                    idealMap[suffix.replace('ideal.', '')] = r.v;
                } else if (suffix !== 'ideal' && suffix.indexOf('.') < 0) {
                    labMap[suffix] = r.v;
                }
            }
            var params = Object.keys(labMap).filter(function (p) { return p !== 'ideal'; });
            if (params.length === 0) return null;
            var onlyLab = (grp === 'physical' || grp === 'phSection');
            if (onlyLab) {
                var tbl = '<table class="admin-analysis-rel-table admin-soil-table admin-soil-table-horizontal"><thead><tr><th class="col-concept">Concepto</th>';
                params.forEach(function (p) { tbl += '<th>' + escapeHtml(getSoilParamLabel(grp, p)) + '</th>'; });
                tbl += '</tr></thead><tbody><tr><td class="col-concept">Dato laboratorio</td>';
                params.forEach(function (p) {
                    var lab = labMap[p];
                    tbl += '<td>' + escapeHtml(lab !== undefined && lab !== null && lab !== '' ? formatNum(lab) : '—') + '</td>';
                });
                tbl += '</tr></tbody></table>';
                return tbl;
            }
            var FERTILITY_CONTEXT_KEYS = ['pMethod', 'depthCm', 'reachPct'];
            var tableParams = (grp === 'fertility')
                ? params.filter(function (p) { return FERTILITY_CONTEXT_KEYS.indexOf(p) < 0; })
                : params;
            var out = '';
            if (grp === 'fertility' && (labMap.pMethod != null || labMap.depthCm != null || labMap.reachPct != null)) {
                var parts = [];
                if (labMap.pMethod !== undefined && labMap.pMethod !== null && String(labMap.pMethod).trim() !== '') parts.push('Método P: ' + escapeHtml(String(labMap.pMethod).trim()));
                if (labMap.depthCm !== undefined && labMap.depthCm !== null && String(labMap.depthCm).trim() !== '') parts.push('Profundidad: ' + escapeHtml(String(labMap.depthCm).trim()) + ' cm');
                if (labMap.reachPct !== undefined && labMap.reachPct !== null && String(labMap.reachPct).trim() !== '') parts.push('Suelo explorado por raíces: ' + escapeHtml(String(labMap.reachPct).trim()) + ' %');
                if (parts.length) out += '<p class="admin-analysis-legend" style="margin-bottom:10px;">' + parts.join(' · ') + '</p>';
            }
            if (tableParams.length === 0) return out || null;
            var idealSource = (grp === 'fertility') ? fertilityIdeal : {};
            var tbl = '<table class="admin-analysis-rel-table admin-soil-table admin-soil-table-horizontal"><thead><tr><th class="col-concept">Concepto</th>';
            tableParams.forEach(function (p) { tbl += '<th>' + escapeHtml(getSoilParamLabel(grp, p)) + '</th>'; });
            tbl += '</tr></thead><tbody>';
            var labCells = [], refCells = [], statusCells = [], kgHaCells = [];
            tableParams.forEach(function (p) {
                var lab = labMap[p];
                var idealVal = (idealSource[p] != null && idealSource[p] !== '') ? idealSource[p] : (idealMap[p] != null ? idealMap[p] : null);
                var refDisplay = getSoilRefDisplay(idealVal, p, grp === 'fertility' ? fertilityIdeal : null);
                var refNum = (idealVal != null && idealVal !== '' && !isNaN(parseFloat(String(idealVal)))) ? String(idealVal).trim() : '—';
                var status = statusFromValRef(lab, refNum);
                labCells.push('<td>' + escapeHtml(lab !== undefined && lab !== null && lab !== '' ? formatNum(lab) : '—') + '</td>');
                refCells.push('<td>' + escapeHtml(refDisplay) + '</td>');
                statusCells.push('<td class="' + status.cls + '">' + escapeHtml(status.text) + '</td>');
                if (grp === 'fertility') {
                    var bulk = parseFloat(obj.physical && obj.physical.bulkDensity) || 0;
                    if (bulk <= 0) bulk = 1;
                    var depth = parseFloat(labMap.depthCm) || 20;
                    var reach = parseFloat(labMap.reachPct) || 100;
                    var factor = 0.1 * depth * bulk * (reach / 100);
                    var labNum = (lab !== undefined && lab !== null && lab !== '') ? parseFloat(String(lab).replace(',', '.')) : NaN;
                    var idealNum = (idealVal != null && idealVal !== '' && !isNaN(parseFloat(String(idealVal)))) ? parseFloat(String(idealVal).replace(',', '.')) : NaN;
                    var diff = isNaN(labNum) ? NaN : (isNaN(idealNum) ? labNum : (labNum - idealNum));
                    var kgHa = isNaN(diff) ? '—' : formatNum(diff * factor);
                    kgHaCells.push('<td>' + escapeHtml(kgHa) + '</td>');
                }
            });
            tbl += '<tr><td class="col-concept">Dato laboratorio</td>' + labCells.join('') + '</tr>';
            tbl += '<tr><td class="col-concept">Nivel ideal</td>' + refCells.join('') + '</tr>';
            if (grp === 'fertility' && kgHaCells.length) {
                tbl += '<tr class="admin-soil-kgha-row"><td class="col-concept">kg/ha (diferencia)</td>' + kgHaCells.join('') + '</tr>';
            } else {
                tbl += '<tr><td class="col-concept">Estado</td>' + statusCells.join('') + '</tr>';
            }
            tbl += '</tbody></table>';
            return out + tbl;
        }

        var CATION_ORDER = ['ca', 'mg', 'k', 'na', 'al', 'h', 'cic', 'pctca', 'pctmg', 'pctk', 'pctna', 'pctal', 'pcth'];
        var FLUID_CATION_ORDER = ['ca', 'mg', 'na', 'k'];
        var CATION_MEQ_COLS = ['ca', 'mg', 'k', 'na', 'al', 'h', 'cic'];
        var CATION_PCT_COLS = ['pctca', 'pctmg', 'pctk', 'pctna', 'pctal', 'pcth'];
        var CATION_PCT_REF = { pctca: '65-75', pctmg: '10-15', pctk: '3-7', pctna: '0-1', pctal: '0-1', pcth: '0-10' };
        var ANION_ORDER = ['no3', 'so4', 'hco3', 'cl', 'po4', 'co3'];
        var MICRO_ORDER = ['fe', 'mn', 'zn', 'cu', 'b', 'mo', 'n_nh4'];

        function buildSoilCationsTable() {
            var c = obj.cations || {};
            function val(p) { var v = c[p]; return v !== undefined && v !== null && v !== '' ? formatNum(v) : '—'; }
            function pctVal(p) {
                var key = 'pct' + p.charAt(3).toUpperCase() + p.slice(4);
                var v = c[key] != null && c[key] !== '' ? c[key] : c[p];
                return v !== undefined && v !== null && v !== '' ? formatNum(v) + '%' : '—';
            }
            var boxStyle = 'min-width:280px;padding:0;background:#fff;border-radius:8px;border:1px solid #bae6fd;overflow:hidden;';
            var headerStyle = 'margin:0;padding:10px 12px;font-weight:600;font-size:0.95rem;background:#e0f2fe;color:#0369a1;border-bottom:1px solid #bae6fd;';
            var tableStyle = 'width:100%;border-collapse:collapse;font-size:0.9rem;';
            var thStyle = 'padding:10px 12px;text-align:center;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;color:#334155;';
            var tdStyle = 'padding:10px 12px;text-align:center;border:1px solid #e2e8f0;';
            var html = '<div class="soil-cations-structure" style="display:flex;flex-wrap:wrap;gap:16px 20px;">';
            html += '<div class="soil-cations-meq-block" style="' + boxStyle + '">';
            html += '<p class="soil-block-title" style="' + headerStyle + '">Concentraciones (meq/100g)</p>';
            html += '<div style="padding:12px;"><table style="' + tableStyle + '"><thead><tr>';
            ['ca', 'mg', 'k', 'na', 'al', 'h'].forEach(function (p) { html += '<th style="' + thStyle + '">' + escapeHtml(paramLabel(p)) + '</th>'; });
            html += '</tr></thead><tbody><tr>';
            ['ca', 'mg', 'k', 'na', 'al', 'h'].forEach(function (p) { html += '<td style="' + tdStyle + '">' + val(p) + '</td>'; });
            html += '</tr></tbody></table></div></div>';
            html += '<div class="soil-cations-pct-box" style="' + boxStyle + '">';
            html += '<p class="soil-block-title soil-block-title-blue" style="' + headerStyle + '">CIC y saturación (%)</p>';
            html += '<div style="padding:12px;"><table style="' + tableStyle + '"><thead><tr>';
            html += '<th style="' + thStyle + '">CIC (meq/100g)</th>';
            CATION_PCT_COLS.forEach(function (p) { html += '<th style="' + thStyle + '">' + escapeHtml(paramLabel(p)) + '</th>'; });
            html += '</tr></thead><tbody><tr>';
            html += '<td style="' + tdStyle + '">' + val('cic') + '</td>';
            CATION_PCT_COLS.forEach(function (p) { html += '<td style="' + tdStyle + '">' + pctVal(p) + '</td>'; });
            html += '</tr></tbody></table></div></div></div>';
            return html;
        }

        function buildWaterGeneralCards() {
            var g = obj.general || {};
            function gv(k) { return (g[k] !== undefined && g[k] !== null && String(g[k]).trim() !== '') ? formatNum(g[k]) : '—'; }
            var wrap = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;">';
            function card(label, value, tone) {
                var bg = tone === 'blue' ? '#eff6ff' : tone === 'green' ? '#ecfdf5' : '#f8fafc';
                var bd = tone === 'blue' ? '#bfdbfe' : tone === 'green' ? '#bbf7d0' : '#e2e8f0';
                var tx = tone === 'blue' ? '#1d4ed8' : tone === 'green' ? '#047857' : '#334155';
                return '<div style="border:1px solid ' + bd + ';background:' + bg + ';border-radius:10px;padding:10px 12px;">'
                    + '<div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.02em;">' + escapeHtml(label) + '</div>'
                    + '<div style="margin-top:4px;font-size:20px;line-height:1.1;font-weight:700;color:' + tx + ';">' + escapeHtml(value) + '</div>'
                    + '</div>';
            }
            wrap += card('CE', gv('ce'), 'blue');
            wrap += card('pH', gv('ph'), 'green');
            wrap += card('RAS', gv('ras'), 'slate');
            wrap += '</div>';
            return wrap;
        }

        function buildRelatedTable(grp, hasMeqPpm) {
            var items = byGroup[grp] || [];
            var paramKeys = {};
            for (var i = 0; i < items.length; i++) {
                var r = items[i];
                var parts = r.k.split('.');
                var part = (parts[1] || '').trim();
                var m = part.match(/^(.+?)_(meq|ppm)$/);
                var param = m ? m[1] : part;
                if (!param) continue;
                var paramLower = param.toLowerCase();
                if (!paramKeys[paramLower]) {
                    paramKeys[paramLower] = {
                        meq: '—', ppm: '—', valor: undefined,
                        refDisplay: getRefDisplay(ideal[param] != null ? ideal[param] : ideal[paramLower], paramLower),
                        refNumeric: (ideal[param] != null && ideal[param] !== '' ? String(ideal[param]).trim() : null) || (ideal[paramLower] != null && ideal[paramLower] !== '' ? String(ideal[paramLower]).trim() : null)
                    };
                }
                if (part.indexOf('_meq') === part.length - 4) paramKeys[paramLower].meq = r.v;
                else if (part.indexOf('_ppm') === part.length - 4) paramKeys[paramLower].ppm = r.v;
                else if (part !== 'ideal') paramKeys[paramLower].valor = r.v;
            }
            var order = (grp === 'cations')
                ? (isSoilType ? CATION_ORDER : FLUID_CATION_ORDER)
                : (grp === 'anions') ? ANION_ORDER : MICRO_ORDER;
            function hasIdeal(p) {
                return (ideal[p] != null && ideal[p] !== '') || (ideal[p && p.charAt(0).toUpperCase() + p.slice(1)] != null && ideal[p.charAt(0).toUpperCase() + p.slice(1)] !== '');
            }
            var params = Object.keys(paramKeys).filter(function (p) {
                return paramKeys[p].meq !== '—' || paramKeys[p].ppm !== '—' || (paramKeys[p].valor !== undefined && paramKeys[p].valor !== '') || (paramKeys[p].refDisplay && paramKeys[p].refDisplay !== '—');
            });
            params = order.filter(function (p) { return paramKeys[p] || hasIdeal(p); }).concat(params);
            params = params.filter(function (p, i) { return params.indexOf(p) === i; });
            if (params.length === 0) return null;
            function idealKey(p) {
                return (ideal[p] != null && ideal[p] !== '') ? ideal[p] : ideal[p && p.charAt(0).toUpperCase() + p.slice(1)];
            }
            params.forEach(function (p) {
                if (!paramKeys[p]) paramKeys[p] = { meq: '—', ppm: '—', valor: undefined, refDisplay: getRefDisplay(idealKey(p), p), refNumeric: (idealKey(p) != null && idealKey(p) !== '' ? String(idealKey(p)).trim() : null) };
            });
            // Vista espejo para panel admin: en análisis no-suelo usar filas por elemento,
            // similar al formulario que ve el usuario.
            if (!isSoilType) {
                if (isSolucionType) {
                    var sTbl = '<table class="admin-analysis-rel-table admin-soil-table-horizontal"><thead><tr><th class="col-concept">Elemento</th>';
                    if (hasMeqPpm) sTbl += '<th>meq/L</th><th>ppm</th><th>Ideal (opc.)</th><th>Diferencia</th>';
                    else sTbl += '<th>Análisis (ppm)</th><th>Ideal (opc.)</th><th>Diferencia</th>';
                    sTbl += '</tr></thead><tbody>';
                    params.forEach(function (p) {
                        var row = paramKeys[p] || {};
                        var idealVal = idealKey(p);
                        var currentVal = hasMeqPpm ? row.ppm : row.valor;
                        var diff = '—';
                        var nIdeal = parseFloat(String(idealVal == null ? '' : idealVal).replace(',', '.'));
                        var nCurrent = parseFloat(String(currentVal == null ? '' : currentVal).replace(',', '.'));
                        if (!isNaN(nIdeal) && !isNaN(nCurrent)) {
                            var d = nIdeal - nCurrent;
                            diff = (d >= 0 ? '+' : '') + formatNum(d);
                        }
                        sTbl += '<tr><td class="col-concept">' + escapeHtml(paramLabel(p)) + '</td>';
                        if (hasMeqPpm) {
                            sTbl += '<td>' + escapeHtml(formatNum(row.meq)) + '</td>';
                            sTbl += '<td>' + escapeHtml(formatNum(row.ppm)) + '</td>';
                            sTbl += '<td>' + escapeHtml(idealVal != null && String(idealVal).trim() !== '' ? formatNum(idealVal) : '—') + '</td>';
                            sTbl += '<td>' + escapeHtml(diff) + '</td>';
                        } else {
                            var vv = row.valor !== undefined && row.valor !== '' ? formatNum(row.valor) : '—';
                            sTbl += '<td>' + escapeHtml(vv) + '</td>';
                            sTbl += '<td>' + escapeHtml(idealVal != null && String(idealVal).trim() !== '' ? formatNum(idealVal) : '—') + '</td>';
                            sTbl += '<td>' + escapeHtml(diff) + '</td>';
                        }
                        sTbl += '</tr>';
                    });
                    sTbl += '</tbody></table>';
                    return sTbl;
                }
                var vTbl = '<div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;background:#fff;">'
                    + '<table class="admin-analysis-rel-table admin-soil-table-horizontal" style="margin:0;"><thead><tr><th class="col-concept">Elemento</th>';
                if (hasMeqPpm) vTbl += '<th>meq/L</th><th>ppm</th>';
                else vTbl += '<th>Valor (lab)</th>';
                vTbl += '</tr></thead><tbody>';
                params.forEach(function (p) {
                    var row = paramKeys[p] || {};
                    vTbl += '<tr><td class="col-concept">' + escapeHtml(paramLabel(p)) + '</td>';
                    if (hasMeqPpm) {
                        vTbl += '<td>' + escapeHtml(formatNum(row.meq)) + '</td>';
                        vTbl += '<td>' + escapeHtml(formatNum(row.ppm)) + '</td>';
                    } else {
                        var vv = row.valor !== undefined && row.valor !== '' ? formatNum(row.valor) : '—';
                        vTbl += '<td>' + escapeHtml(vv) + '</td>';
                    }
                    vTbl += '</tr>';
                });
                vTbl += '</tbody></table></div>';
                return vTbl;
            }
            var tbl = '<table class="admin-analysis-rel-table admin-soil-table-horizontal"><thead><tr><th class="col-concept">Concepto</th>';
            params.forEach(function (p) { tbl += '<th>' + escapeHtml(paramLabel(p)) + '</th>'; });
            tbl += '</tr></thead><tbody>';
            if (hasMeqPpm) {
                tbl += '<tr><td class="col-concept">meq/L (calc.)</td>';
                params.forEach(function (p) { tbl += '<td>' + escapeHtml(formatNum(paramKeys[p].meq)) + '</td>'; });
                tbl += '</tr><tr><td class="col-concept">ppm (calc.)</td>';
                params.forEach(function (p) { tbl += '<td>' + escapeHtml(formatNum(paramKeys[p].ppm)) + '</td>'; });
                tbl += '</tr>';
            } else {
                tbl += '<tr><td class="col-concept">Valor (lab)</td>';
                params.forEach(function (p) { tbl += '<td>' + escapeHtml(paramKeys[p].valor !== undefined && paramKeys[p].valor !== '' ? formatNum(paramKeys[p].valor) : '—') + '</td>'; });
                tbl += '</tr>';
            }
            if (isSoilType) {
                tbl += '<tr><td class="col-concept">Referencia (ideal)</td>';
                params.forEach(function (p) { tbl += '<td>' + escapeHtml(paramKeys[p].refDisplay || '—') + '</td>'; });
                tbl += '</tr><tr><td class="col-concept">Estado</td>';
                params.forEach(function (p) {
                    var row = paramKeys[p];
                    var refForStatus = row.refNumeric || '—';
                    var val = hasMeqPpm ? (row.ppm !== '—' ? row.ppm : row.meq) : row.valor;
                    var status = statusFromValRef(val, refForStatus);
                    tbl += '<td class="' + status.cls + '">' + escapeHtml(status.text) + '</td>';
                });
                tbl += '</tr>';
            }
            tbl += '</tbody></table>';
            return tbl;
        }

        var groupOrder = ['general', 'physical', 'phSection', 'fertility', 'cations', 'ratios', 'anions', 'micros', 'ideal', 'Otros'];
        var orderedGroups = groupOrder.filter(function (g) { return byGroup[g]; }).concat(Object.keys(byGroup).filter(function (g) { return groupOrder.indexOf(g) < 0; }));
        var hasSoilTables = isSoilType && orderedGroups.some(function (g) { return g === 'physical' || g === 'phSection' || g === 'fertility'; });
        var hasRelated = orderedGroups.some(function (g) { return g === 'cations' || g === 'anions' || g === 'micros'; });

        if (isFrutaType) return buildFrutaReadOnly();
        if (isFoliarType) return buildFoliarReadOnly();

        var html = '<div class="admin-analysis-data-wrap">';
        if (hasSoilTables) html += '<p class="admin-analysis-legend"><strong>Propiedades físicas y pH y salinidad:</strong> Concepto + Dato laboratorio. <strong>Fertilidad:</strong> Dato laboratorio, Nivel ideal y kg/ha (diferencia).</p>';
        else if (hasRelated) html += '<p class="admin-analysis-legend"><strong>meq/L y ppm</strong> = valores calculados' + (isSoilType ? '; <strong>Referencia</strong> = valor ideal; <strong>Estado</strong> = Dentro / Bajo / Alto.' : '.') + '</p>';
        orderedGroups.forEach(function (grp) {
            if (grp === 'ideal' && !isSoilType) return;
            if (isAguaType && (grp === 'm3Riego' || grp === 'acidId')) return;
            var title = groupTitles[grp] || grp;
            if (grp === 'cations' && !isSoilType) title = 'Cationes';
            if (isSolucionType) {
                if (grp === 'general') title = 'Características generales (salinidad / sodicidad)';
                if (grp === 'cations') title = 'Cationes (meq/L y ppm)';
                if (grp === 'anions') title = 'Aniones (meq/L y ppm)';
                if (grp === 'micros') title = 'Micronutrimentos (ppm)';
            }
            var items = byGroup[grp];
            var content = null;
            if (isAguaType && grp === 'general') content = buildWaterGeneralCards();
            if (isSoilType && (grp === 'physical' || grp === 'phSection' || grp === 'fertility')) content = buildSoilStyleTable(grp);
            if (!content && isSoilType && grp === 'cations') content = buildSoilCationsTable();
            if (!content && (grp === 'cations' || grp === 'anions')) content = buildRelatedTable(grp, true);
            if (!content && grp === 'micros') content = buildRelatedTable(grp, false);
            if (content) {
                var extra = '';
                if (grp === 'cations' && isSoilType) {
                    extra = '<p class="admin-analysis-legend" style="margin-bottom:10px;"><strong>Referencia saturación CIC (ideal):</strong> K⁺ 3-7%, Ca²⁺ 65-75%, Mg²⁺ 10-15%, H⁺ 0-10%, Na⁺ 0-1%, Al³⁺ 0-1%. <strong>Relaciones entre cationes:</strong> Ca/Mg = 6, Mg/K = 3.5, (Ca+Mg)/K = 18, Ca/K = 14.</p>';
                }
                html += '<div class="admin-analysis-group"><div class="admin-analysis-group-title">' + escapeHtml(title) + '</div>' + extra + content + '</div>';
            } else {
                function skipSoilIdeal(r) { return isSoilType && ['physical', 'phSection', 'fertility'].indexOf(grp) >= 0 && (r.k === grp + '.ideal' || r.k.indexOf(grp + '.ideal.') === 0); }
                var cardItems = (items || []).filter(function (r) {
                    if (skipSoilIdeal(r)) return false;
                    if (isAguaType && grp === 'Otros') {
                        var kk = (r.k || '').toLowerCase();
                        if (kk === 'm3riego' || kk === 'acidid') return false;
                    }
                    return true;
                });
                function itemLabel(r) {
                    var raw = (r.k.split('.').pop() || '');
                    var part = raw.toLowerCase();
                    if (grp === 'ratios' && RATIO_LABELS[part]) return RATIO_LABELS[part];
                    return friendlyLabel(r.k);
                }
                html += '<div class="admin-analysis-group"><div class="admin-analysis-group-title">' + escapeHtml(title) + '</div><div class="admin-analysis-grid">';
                html += cardItems.length ? cardItems.map(function (r) { return '<div class="admin-analysis-item"><span class="admin-analysis-label">' + escapeHtml(itemLabel(r)) + '</span><span class="admin-analysis-value">' + escapeHtml(formatNum(r.v)) + '</span></div>'; }).join('') : '';
                html += '</div></div>';
            }
        });
        if (isAguaType) {
            var an = obj.anions || {};
            var hco3 = parseFloat(an.hco3_meq); var co3 = parseFloat(an.co3_meq);
            if (isNaN(hco3)) hco3 = 0; if (isNaN(co3)) co3 = 0;
            var totalCarbonatos = hco3 + co3;
            var residualMeq = parseFloat(obj.acidResidualMeq);
            if (isNaN(residualMeq) || residualMeq < 0) residualMeq = 1;
            var meqPerLNeutralizar = Math.max(0, totalCarbonatos - residualMeq);
            var m3 = parseFloat(obj.m3Riego); if (!m3 || m3 <= 0) m3 = 0;
            var acidId = obj.acidId || (AGUA_ACIDS[0] && AGUA_ACIDS[0].id);
            var acid = AGUA_ACIDS.filter(function (x) { return x.id === acidId; })[0] || AGUA_ACIDS[0];
            var meqPerM3 = meqPerLNeutralizar * 1000;
            var mlPerM3 = acid && acid.meqPerMl ? (meqPerM3 / acid.meqPerMl) : 0;
            var litrosTotal = m3 ? ((mlPerM3 * m3) / 1000) : 0;
            html += '<div class="admin-analysis-group" style="border:2px solid #16a34a;background:#f0fdf4;border-radius:10px;padding:14px;margin-top:16px;">';
            html += '<div class="admin-analysis-group-title" style="color:#166534;">🧪 Ácido para neutralizar HCO₃⁻ y CO₃²⁻</div>';
            html += '<p style="font-size:0.85rem;color:#166534;margin:0 0 12px 0;">Meq ácido = (HCO₃⁻ + CO₃²⁻) − meq/L residual objetivo.</p>';
            html += '<div style="display:grid;grid-template-columns:auto 1fr;gap:8px 20px;font-size:0.92rem;">';
            html += '<span>Residual objetivo (meq/L):</span><span>' + formatNum(residualMeq) + '</span>';
            html += '<span>Meq/L a neutralizar:</span><span><strong>' + formatNum(meqPerLNeutralizar) + '</strong></span>';
            html += '<span>Ácido seleccionado:</span><span><span style="display:inline-block;padding:4px 10px;border:1px solid #86efac;background:#dcfce7;color:#14532d;border-radius:999px;font-weight:700;">' + escapeHtml(acid ? acid.name : acidId || '—') + '</span></span>';
            html += '<span>m³ agua de riego (volumen total):</span><span><span style="display:inline-block;padding:4px 10px;border:1px solid #bbf7d0;background:#f7fee7;color:#166534;border-radius:8px;font-weight:700;">' + (obj.m3Riego !== undefined && obj.m3Riego !== null && String(obj.m3Riego).trim() !== '' ? formatNum(obj.m3Riego) + ' m³' : '—') + '</span></span>';
            html += '<span>mL ácido / m³:</span><span>' + (mlPerM3 > 0 ? formatNum(mlPerM3) + ' mL' : '—') + '</span>';
            html += '<span>L ácido (volumen total):</span><span><strong>' + (litrosTotal > 0 ? formatNum(litrosTotal) + ' L' : '—') + '</strong></span>';
            html += '</div></div>';
        }
        html += '</div>';
        return html;
    }

    global.NutriPlantRenderAnalysisReport = renderAnalysisReport;
})(typeof window !== 'undefined' ? window : this);
