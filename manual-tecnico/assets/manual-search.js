/**
 * Búsqueda de capítulos en el índice del manual técnico.
 */
(function () {
  'use strict';

  var CHAPTERS = [
    {
      href: 'capitulos/flujo-nutriplant-pro.html',
      icon: '🧭',
      pillar: 'H · Flujo de la plataforma',
      title: 'Guía rápida: flujo de plataforma y criterio de uso',
      keywords: 'flujo plataforma login proyecto dashboard diagnóstico enmiendas programa seguimiento módulo objetivo errores comunes dato decisión'
    },
    {
      href: 'capitulos/unidades-ppm-meq-oxidos.html',
      icon: '📐',
      pillar: 'A · Fundamentos',
      title: 'Unidades: ppm, meq/L y óxidos agronómicos',
      keywords: 'ppm meq meq/L óxidos P2O5 K2O CaO MgO conversión unidades peso equivalente elemento'
    },
    {
      href: 'capitulos/porcentaje-meq-aniones-cationes.html',
      icon: '📐',
      pillar: 'A · Fundamentos',
      title: '% meq: triángulos aniónicos y catiónicos',
      keywords: 'porcentaje meq triángulo aniones cationes NO3 nitrato fosfato sulfato K Ca Mg Steiner balance iónico'
    },
    {
      href: 'capitulos/faq-porcentajes-no-suman-100.html',
      icon: '📐',
      pillar: 'A · Fundamentos',
      title: '% meq: por qué no todo suma 100 % (hidroponía y fertirriego)',
      keywords: '100 por ciento suma triángulo N-P-S K-Ca-Mg Cl amonio NH4 denominador FAQ duda'
    },
    {
      href: 'capitulos/analisis-suelo-fertilidad-kgha.html',
      icon: '🌱',
      pillar: 'B · Suelo y enmiendas',
      title: 'Análisis de suelo: fertilidad, ideales y kg/ha de ajuste',
      keywords: 'suelo fertilidad kg/ha ideal ajuste requerimiento CIC P K Ca Mg micros laboratorio'
    },
    {
      href: 'capitulos/enmiendas-balance-cic.html',
      icon: '🌱',
      pillar: 'B · Suelo y enmiendas',
      title: 'Balance de enmiendas por CIC del suelo',
      keywords: 'enmienda enmiendas yeso cal dolomita CIC saturación catión intercambio calcio magnesio sodio'
    },
    {
      href: 'capitulos/n-mineralizable-agua-disponible-suelo.html',
      icon: '🌱',
      pillar: 'B · Suelo y enmiendas',
      title: 'N mineralizable y agua disponible en suelo',
      keywords: 'nitrógeno mineralizable agua disponible suelo textura CC PMP capacidad campo punto marchitez'
    },
    {
      href: 'capitulos/analisis-solucion-nutritiva-lab.html',
      icon: '🔬',
      pillar: 'C · Análisis',
      title: 'Análisis de solución nutritiva (laboratorio)',
      keywords: 'solución nutritiva laboratorio licor fertirriego drenaje meq ppm ideal diferencia'
    },
    {
      href: 'capitulos/analisis-extracto-pasta.html',
      icon: '🔬',
      pillar: 'C · Análisis',
      title: 'Extracto de pasta saturada',
      keywords: 'extracto pasta saturada suelo rizósfera disponibilidad laboratorio CE pH'
    },
    {
      href: 'capitulos/analisis-agua-ras-sar.html',
      icon: '🔬',
      pillar: 'C · Análisis',
      title: 'Análisis de agua: CE, pH y RAS',
      keywords: 'agua riego CE conductividad pH RAS SAR sodio salinidad alcalinidad bicarbonato'
    },
    {
      href: 'capitulos/analisis-foliar-dop.html',
      icon: '🔬',
      pillar: 'C · Análisis',
      title: 'Análisis foliar: DOP frente al óptimo',
      keywords: 'foliar hoja DOP desviación óptimo mg/kg tejido diagnóstico nutriente'
    },
    {
      href: 'capitulos/analisis-fruta-icc.html',
      icon: '🔬',
      pillar: 'C · Análisis',
      title: 'Análisis de fruta: ICC frente al óptimo',
      keywords: 'fruta ICC índice comparativo calidad cosecha postcosecha óptimo'
    },
    {
      href: 'capitulos/extraccion-nutrimental-por-etapa.html',
      icon: '📈',
      pillar: 'D · Programas',
      title: 'Extracción y distribución nutrimental por etapa',
      keywords: 'extracción nutrimental etapa fenológica cultivo curva absorción distribución'
    },
    {
      href: 'capitulos/programa-fertirriego-etapas.html',
      icon: '📈',
      pillar: 'D · Programas',
      title: 'Programa de fertirriego por etapas',
      keywords: 'fertirriego programa etapas semanas lámina m3/ha eficiencia requerimiento riego nutrición'
    },
    {
      href: 'capitulos/fertirriego-graficas-ionicas.html',
      icon: '📈',
      pillar: 'D · Programas',
      title: 'Gráficas iónicas en fertirriego',
      keywords: 'gráficas iónicas fertirriego triángulo balance macro agua riego mezcla'
    },
    {
      href: 'capitulos/granular-mezclas.html',
      icon: '📈',
      pillar: 'D · Programas',
      title: 'Granular: mezclas y relación N-P-K',
      keywords: 'granular mezcla física formulación N-P-K programa aplicaciones eficiencia granulado'
    },
    {
      href: 'capitulos/hidroponia-solucion-por-etapa.html',
      icon: '📈',
      pillar: 'D · Programas',
      title: 'Hidroponía: solución nutritiva por etapa',
      keywords: 'hidroponía solución nutritiva etapa meq fertilizante dosis tanque nitrato calcio'
    },
    {
      href: 'capitulos/diseno-solucion-nutritiva-didactica.html',
      icon: '📈',
      pillar: 'D · Programas',
      title: 'Diseño didáctico de solución nutritiva (CE y triángulos)',
      keywords: 'diseño solución nutritiva didáctico CE conductividad triángulo calculadora'
    },
    {
      href: 'capitulos/vpd-deficit-presion-vapor.html',
      icon: '💧',
      pillar: 'E · Agua y clima',
      title: 'VPD, NDVI y NDMI',
      keywords: 'VPD déficit presión vapor invernadero clima estrés hídrico NDVI NDMI satélite índice vegetación humedad'
    },
    {
      href: 'capitulos/agua-dureza-acidificacion-solubilidad.html',
      icon: '💧',
      pillar: 'E · Agua y clima',
      title: 'Dureza, acidificación y solubilidad del agua',
      keywords: 'dureza agua ácido acidificación solubilidad índice salino IS mezcla tanque carbonatos bicarbonatos'
    },
    {
      href: 'capitulos/interacciones-mulder-compatibilidad.html',
      icon: '🔗',
      pillar: 'F · Interacciones',
      title: 'Interacciones Mulder y compatibilidad de fertilizantes',
      keywords: 'Mulder interacciones antagonismo sinergia compatibilidad fertilizantes mezcla tanque movilidad pH'
    },
    {
      href: 'capitulos/publicaciones-redes-sociales.html',
      icon: '📣',
      pillar: 'G · Redes y comunicación',
      title: 'Publicaciones en redes y autoridad técnica',
      keywords: 'redes sociales LinkedIn Instagram YouTube publicaciones comunicación'
    }
  ];

  function norm(str) {
    return String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s%./-]/g, ' ');
  }

  function tokens(str) {
    return norm(str).split(/\s+/).filter(function (t) { return t.length > 1; });
  }

  function scoreChapter(ch, queryNorm, queryTokens) {
    var titleNorm = norm(ch.title);
    var blobNorm = norm(ch.title + ' ' + ch.keywords + ' ' + ch.pillar);
    var score = 0;

    if (!queryNorm) return 0;
    if (titleNorm.indexOf(queryNorm) >= 0) score += 120;
    if (blobNorm.indexOf(queryNorm) >= 0) score += 60;

    queryTokens.forEach(function (tok) {
      if (titleNorm.indexOf(tok) >= 0) score += 40;
      else if (blobNorm.indexOf(tok) >= 0) score += 18;
    });

    return score;
  }

  function searchChapters(query) {
    var queryNorm = norm(query).trim();
    if (queryNorm.length < 2) return [];

    var queryTokens = tokens(query);
    return CHAPTERS
      .map(function (ch) {
        return { chapter: ch, score: scoreChapter(ch, queryNorm, queryTokens) };
      })
      .filter(function (row) { return row.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 8)
      .map(function (row) { return row.chapter; });
  }

  function initSearch(root) {
    var input = root.querySelector('.mt-search-input');
    var results = root.querySelector('.mt-search-results');
    var empty = root.querySelector('.mt-search-empty');
    var activeIndex = -1;

    if (!input || !results) return;

    function render(items) {
      activeIndex = -1;
      results.innerHTML = '';

      if (!items.length) {
        results.hidden = true;
        if (empty) {
          empty.hidden = !norm(input.value).trim() || norm(input.value).trim().length < 2;
        }
        return;
      }

      if (empty) empty.hidden = true;
      results.hidden = false;

      items.forEach(function (ch, idx) {
        var li = document.createElement('li');
        li.className = 'mt-search-item';
        li.setAttribute('role', 'option');
        li.dataset.index = String(idx);

        var link = document.createElement('a');
        link.href = ch.href;
        link.className = 'mt-search-item-link';
        link.innerHTML =
          '<span class="mt-search-item-icon" aria-hidden="true">' + ch.icon + '</span>' +
          '<span class="mt-search-item-body">' +
            '<span class="mt-search-item-title">' + ch.title + '</span>' +
            '<span class="mt-search-item-meta">' + ch.pillar + '</span>' +
          '</span>';

        li.appendChild(link);
        results.appendChild(li);
      });
    }

    function runSearch() {
      render(searchChapters(input.value));
    }

    function setActive(index) {
      var items = results.querySelectorAll('.mt-search-item');
      activeIndex = index;
      items.forEach(function (el, i) {
        el.classList.toggle('is-active', i === activeIndex);
      });
      if (activeIndex >= 0 && items[activeIndex]) {
        var link = items[activeIndex].querySelector('a');
        if (link) link.focus();
      }
    }

    input.addEventListener('input', runSearch);
    input.addEventListener('focus', runSearch);

    input.addEventListener('keydown', function (e) {
      var items = results.querySelectorAll('.mt-search-item');
      if (!items.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive(Math.min(activeIndex + 1, items.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive(Math.max(activeIndex - 1, 0));
      } else if (e.key === 'Escape') {
        results.hidden = true;
        if (empty) empty.hidden = true;
        input.blur();
      } else if (e.key === 'Enter') {
        if (activeIndex >= 0) {
          e.preventDefault();
          var activeLink = items[activeIndex].querySelector('a');
          if (activeLink) window.location.href = activeLink.href;
        } else if (items.length === 1) {
          e.preventDefault();
          var onlyLink = items[0].querySelector('a');
          if (onlyLink) window.location.href = onlyLink.href;
        }
      }
    });

    document.addEventListener('click', function (e) {
      if (!root.contains(e.target)) {
        results.hidden = true;
        if (empty) empty.hidden = true;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-mt-search]').forEach(initSearch);
  });
})();
