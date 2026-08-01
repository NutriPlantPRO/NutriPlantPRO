(function () {
  'use strict';

  const q = new URLSearchParams(location.search);
  const embed = ['login', 'dashboard'].includes(q.get('embed'));
  const demo = q.get('demo') === '1';
  const token = String(q.get('token') || '');
  const snapshotParam = String(q.get('snapshot') || '').trim();
  const personal = demo || !!token;
  const $ = (id) => document.getElementById(id);
  const API = '/api/agroclimate';
  const STORE = 'nutriplant_free_agroclimate_v1';
  const WHATSAPP = '13868044542';

  const I = window.AgroI18n || null;
  const t = (key, vars) => (I && typeof I.t === 'function' ? I.t(key, vars) : key);
  const locale = () => (I && typeof I.getLocale === 'function' ? I.getLocale() : 'es-MX');
  const prefs = () => (I && typeof I.getPrefs === 'function'
    ? I.getPrefs()
    : { language: 'es', unit_system: 'metric', locale: 'es-MX' });

  let map;
  let marker;
  let chart;
  let rows = [];
  let timezone = '';
  let lastReadingAt = null;
  let reportGeneratedAt = null;
  let report = null;
  let savedKc = null;
  let viewKc = null;
  let referenceKcLabel = '';
  let kcModalTarget = 'location';
  const visible = { vpdHours: true, rain: true, et0: true, etc: true };

  const n = (v) => Number.isFinite(Number(v)) ? Number(v) : null;
  const round = (v, d = 1) => n(v) == null ? null : Math.round(n(v) * 10 ** d) / 10 ** d;
  const fmt = (v, d = 1, unit = '') => n(v) == null ? '—' : `${n(v).toFixed(d)}${unit}`;
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  const sum = (list, key) => {
    const vals = list.map((r) => n(r[key])).filter((v) => v != null);
    return vals.length ? round(vals.reduce((a, b) => a + b, 0)) : null;
  };
  const extreme = (list, key, kind) => {
    const vals = list.map((r) => n(r[key])).filter((v) => v != null);
    return vals.length ? Math[kind](...vals) : null;
  };

  function tempDigits() {
    return prefs().unit_system === 'us_customary' ? 0 : 1;
  }
  function depthDigits() {
    return prefs().unit_system === 'us_customary' ? 2 : 1;
  }
  function dispTemp(celsius, digits) {
    if (!I) return fmt(celsius, digits != null ? digits : 1);
    const v = I.convertTempFromC(celsius);
    return v == null ? '—' : Number(v).toFixed(digits != null ? digits : tempDigits());
  }
  function dispDepth(mm, digits) {
    if (!I) return fmt(mm, digits != null ? digits : 1);
    const v = I.convertDepthFromMm(mm);
    return v == null ? '—' : Number(v).toFixed(digits != null ? digits : depthDigits());
  }
  function showTemp(celsius, digits) {
    return I ? I.fmtTemp(celsius, digits != null ? digits : tempDigits()) : fmt(celsius, 1, ' °C');
  }
  function showDepth(mm, digits) {
    return I ? I.fmtDepth(mm, digits != null ? digits : depthDigits()) : fmt(mm, 1, ' mm');
  }
  function tempUnitLabel() {
    return I ? I.tempUnit() : '°C';
  }
  function depthUnitLabel() {
    return I ? I.depthUnit() : 'mm';
  }

  const dateLabel = (iso, short) => {
    const p = String(iso).split('-').map(Number);
    return new Intl.DateTimeFormat(locale(), short
      ? { weekday: 'short', day: '2-digit' }
      : { weekday: 'short', day: '2-digit', month: 'short' }).format(new Date(p[0], p[1] - 1, p[2]));
  };
  const addDays = (iso, days) => {
    const p = String(iso).split('-').map(Number);
    const d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };
  const vpd = (temp, humidity, radiation) => {
    const tAir = n(temp), h = n(humidity), rad = n(radiation);
    if (tAir == null || h == null) return null;
    const leaf = rad != null && rad > 200 ? tAir + ((rad - 200) * .6 / 100) : tAir;
    const esLeaf = .6108 * Math.exp(17.27 * leaf / (leaf + 237.3));
    const esAir = .6108 * Math.exp(17.27 * tAir / (tAir + 237.3));
    return Math.max(0, esLeaf - esAir * h / 100);
  };

  function setStatus(text, type, register) {
    const node = $(register ? 'agro-register-status' : 'agro-location-status');
    if (!node) return;
    node.textContent = text || '';
    node.className = `agro-status${type ? ` ${type}` : ''}`;
  }

  function formatReadingAt(ts) {
    const d = ts instanceof Date ? ts : new Date(ts);
    if (!Number.isFinite(d.getTime())) return '';
    return new Intl.DateTimeFormat(locale(), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(d);
  }

  function readingStatusText(extra) {
    const ts = (personal && reportGeneratedAt) ? reportGeneratedAt : lastReadingAt;
    const when = ts ? formatReadingAt(ts) : '';
    const base = when
      ? (personal ? t('forecast_generated', { when }) : t('last_reading', { when }))
      : (personal ? t('report_ready') : t('reading_updated'));
    return extra ? `${base}. ${extra}` : `${base}.`;
  }

  function markReadingNow() {
    lastReadingAt = Date.now();
    reportGeneratedAt = lastReadingAt;
  }

  function setMode() {
    if (embed) document.documentElement.classList.add('agro-embed');
    const fromEmailLink = !!token;
    $('agro-location-card').hidden = personal;
    $('agro-register-cta').hidden = personal;
    $('agro-personal-actions').hidden = !personal;
    $('agro-promo').hidden = !personal || embed;
    const unsub = $('agro-unsubscribe-btn');
    if (unsub) {
      unsub.hidden = !fromEmailLink;
      unsub.style.display = fromEmailLink ? '' : 'none';
    }
  }

  function activeKc() {
    return viewKc != null ? viewKc : savedKc;
  }

  function applyEtcWithKc(kc) {
    const factor = n(kc);
    rows = rows.map((r) => ({
      ...r,
      etc: r.et0 != null && factor != null ? round(r.et0 * factor) : null
    }));
  }

  function syncKcBar() {
    const bar = $('agro-kc-bar');
    if (!bar) return;
    bar.hidden = !rows.length;
    if (bar.hidden) return;
    const kc = activeKc();
    const usingViewOnly = personal && viewKc != null && savedKc != null && Number(viewKc) !== Number(savedKc);
    const hint = $('agro-kc-view-hint');
    if (hint) hint.textContent = personal ? t('kc_view_only') : '';
    const viewInput = $('agro-kc-view');
    if (viewInput && document.activeElement !== viewInput) {
      viewInput.value = kc == null ? '' : Number(kc).toFixed(2);
    }
    const note = $('agro-kc-bar-note');
    if (note) {
      if (kc == null) {
        note.textContent = personal ? t('kc_note_none_personal') : t('kc_note_none_free');
      } else if (usingViewOnly) {
        note.innerHTML = t('kc_note_view_only_html', {
          kc: Number(kc).toFixed(2),
          saved: Number(savedKc).toFixed(2)
        });
      } else {
        note.innerHTML = personal
          ? t('kc_note_personal_html', { kc: Number(kc).toFixed(2) })
          : t('kc_note_free_html', { kc: Number(kc).toFixed(2) });
      }
    }
    const wa = $('agro-kc-whatsapp');
    if (!wa) return;
    if (!personal) {
      wa.hidden = true;
      bar.classList.toggle('no-wa', true);
      return;
    }
    bar.classList.toggle('no-wa', false);
    const folio = report?.request_code ? t('wa_folio', { code: report.request_code }) : '';
    const name = report?.full_name || report?.plot_name || '';
    const lat = report?.latitude ?? $('agro-lat')?.value;
    const lng = report?.longitude ?? $('agro-lng')?.value;
    const coords = (lat != null && lat !== '' && lng != null && lng !== '')
      ? t('wa_coords', { lat, lng })
      : '';
    const message = t('wa_change_kc', {
      folio,
      name: name ? t('wa_plot_name', { name }) : '',
      kc: savedKc == null ? t('wa_undefined') : savedKc,
      coords
    });
    wa.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`;
    wa.hidden = false;
    const waLabel = wa.querySelector('span');
    if (waLabel) waLabel.innerHTML = t('kc_wa_html');
    wa.title = t('kc_wa_title_alert');
  }

  function applyViewKc() {
    const next = n($('agro-kc-view').value);
    if (next != null && (next < 0 || next > 2.5)) {
      setStatus(t('kc_range_error'), 'error');
      return;
    }
    viewKc = next;
    if (!personal) savedKc = next;
    applyEtcWithKc(activeKc());
    render();
    if (!personal) saveInputs();
  }

  function isIOSLikeDevice() {
    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    return /iPhone|iPad|iPod/i.test(ua) ||
      /iPhone|iPad|iPod/i.test(platform) ||
      (/Mac/i.test(platform) && 'ontouchend' in document);
  }

  function setPdfHint(text, type) {
    const hint = document.querySelector('.agro-pdf-bar-hint');
    if (!hint) return;
    hint.textContent = text || '';
    hint.classList.toggle('is-error', type === 'error');
    hint.classList.toggle('is-ok', type === 'ok' || type === 'success');
  }

  function pdfFilename() {
    return `Pronostico_agroclimatico_NutriPlant_${new Date().toISOString().slice(0, 10)}.pdf`;
  }

  let html2pdfLoadPromise = null;
  function ensureHtml2PdfLoaded() {
    if (typeof html2pdf !== 'undefined') return Promise.resolve();
    if (html2pdfLoadPromise) return html2pdfLoadPromise;
    html2pdfLoadPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.2/dist/html2pdf.bundle.min.js';
      s.async = true;
      s.onload = () => (typeof html2pdf !== 'undefined'
        ? resolve()
        : reject(new Error('html2pdf unavailable')));
      s.onerror = () => reject(new Error('PDF loader failed'));
      document.head.appendChild(s);
    });
    return html2pdfLoadPromise;
  }

  async function shareOrSavePdfBlob(blob, filename) {
    const file = new File([blob], filename, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: t('pdf_share_title'),
          text: t('pdf_share_text')
        });
        return 'shared';
      } catch (err) {
        if (err && err.name === 'AbortError') return 'aborted';
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => {
      try {
        const w = window.open(url, '_blank');
        if (!w) location.href = url;
      } catch (_) {
        location.href = url;
      }
      setTimeout(() => URL.revokeObjectURL(url), 90000);
    }, 200);
    return 'opened';
  }

  function preparePrintLayout() {
    const root = document.documentElement;
    root.classList.add('agro-printing');
    window.scrollTo(0, 0);
    const wrap = $('agro-table-wrap');
    if (wrap) wrap.classList.add('open');
    try { chart?.resize(); } catch (_) {}
    return () => root.classList.remove('agro-printing', 'agro-pdf-file');
  }

  function downloadPdfViaPrint() {
    const cleanup = preparePrintLayout();
    window.addEventListener('afterprint', cleanup, { once: true });
    setTimeout(cleanup, 4000);
    setTimeout(() => {
      try { chart?.resize(); } catch (_) {}
      window.print();
    }, 400);
  }

  function preparePdfExportClone() {
    const PDF_WIDTH = 794;
    const shell = document.querySelector('.agro-shell');
    if (!shell) throw new Error('No export content');

    const wrap = $('agro-table-wrap');
    if (wrap) wrap.classList.add('open');
    try { chart?.resize(); } catch (_) {}

    const host = document.createElement('div');
    host.className = 'agro-pdf-export-host';
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = [
      'position:fixed',
      'left:-16000px',
      'top:0',
      `width:${PDF_WIDTH}px`,
      'max-width:' + PDF_WIDTH + 'px',
      'background:#fff',
      'z-index:-1',
      'pointer-events:none',
      'overflow:visible',
      'box-sizing:border-box'
    ].join(';');

    const clone = shell.cloneNode(true);
    clone.classList.add('agro-pdf-export-host');
    clone.style.width = PDF_WIDTH + 'px';
    clone.style.maxWidth = PDF_WIDTH + 'px';
    clone.style.margin = '0';
    clone.style.padding = '12px 16px 24px';
    clone.style.boxSizing = 'border-box';
    clone.style.overflow = 'visible';

    const hideSel = [
      '.agro-public-header', '#agro-about-modal', '.agro-location-card',
      '.agro-register-cta', '.agro-promo', '.agro-personal-actions',
      '.agro-empty-note', '.agro-chart-toggles', '.agro-table-toggle',
      '.agro-table-scroll-hint', '.agro-kc-wa', '.agro-kc-bar-note',
      '.agro-kc-view-box', '.agro-pdf-bar', '.agro-input-action .agro-btn',
      '#agro-map', '.agro-mobile-days', '.agro-kc-bar',
      '.agro-print-mark'
    ].join(',');
    clone.querySelectorAll(hideSel).forEach((el) => el.remove());

    const results = clone.querySelector('#agro-results');
    if (results) {
      results.hidden = false;
      const reportCards = results.querySelectorAll(':scope > .agro-card');
      if (reportCards[0]) {
        reportCards[0].classList.add('agro-pdf-table-section');
        reportCards[0].style.breakBefore = 'always';
        reportCards[0].style.pageBreakBefore = 'always';
        reportCards[0].style.paddingTop = '14px';
        reportCards[0].style.overflow = 'visible';
        const tableHead = reportCards[0].querySelector('.agro-section-head');
        if (tableHead) {
          tableHead.style.breakInside = 'avoid';
          tableHead.style.pageBreakInside = 'avoid';
          tableHead.style.overflow = 'visible';
          tableHead.style.paddingTop = '2px';
        }
        const tableH2 = reportCards[0].querySelector('.agro-section-head h2');
        if (tableH2) {
          tableH2.style.lineHeight = '1.3';
          tableH2.style.paddingTop = '2px';
          tableH2.style.marginTop = '4px';
          tableH2.style.overflow = 'visible';
        }
      }
      if (reportCards[1]) {
        reportCards[1].classList.add('agro-pdf-chart-section');
        reportCards[1].style.breakBefore = 'always';
        reportCards[1].style.pageBreakBefore = 'always';
      }
    }

    // Mismo pie que impresión en laptop (legal + Generado por + hoja + QR), no el bloque “Escanea…”.
    const sourceFooter = document.querySelector('#agro-print-footer');
    const cloneFooter = clone.querySelector('#agro-print-footer');
    if (sourceFooter) {
      const footerNode = sourceFooter.cloneNode(true);
      footerNode.id = 'agro-print-footer-pdf';
      if (cloneFooter) cloneFooter.replaceWith(footerNode);
      else clone.appendChild(footerNode);
    } else if (cloneFooter) {
      cloneFooter.style.display = 'block';
    }

    const tw = clone.querySelector('.agro-table-wrap');
    if (tw) {
      tw.classList.add('open');
      tw.style.display = 'block';
      tw.style.overflow = 'visible';
      tw.style.maxHeight = 'none';
      tw.style.width = '100%';
    }

    const liveCanvas = $('agro-chart');
    const cloneCanvas = clone.querySelector('#agro-chart');
    if (liveCanvas && cloneCanvas && typeof liveCanvas.toDataURL === 'function') {
      try {
        const img = document.createElement('img');
        img.className = 'agro-chart-pdf-img';
        img.alt = t('chart_alt');
        img.src = liveCanvas.toDataURL('image/png');
        img.style.cssText = 'width:100%;max-width:100%;height:270px;object-fit:contain;display:block;';
        cloneCanvas.replaceWith(img);
      } catch (_) {
        cloneCanvas.remove();
      }
    }

    ['agro-print-page1-fill'].forEach((cls) => {
      clone.querySelectorAll('.' + cls).forEach((el) => {
        el.style.display = 'block';
      });
    });

    host.appendChild(clone);
    document.body.appendChild(host);
    return { host, clone, width: PDF_WIDTH };
  }

  function buildPdfWatermarkDataUrl() {
    const source = document.querySelector('.agro-print-mark') ||
      document.querySelector('.agro-page-title img');
    if (!source || !source.complete || !source.naturalWidth) return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = source.naturalWidth;
      canvas.height = source.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.globalAlpha = 0.14;
      ctx.drawImage(source, 0, 0);
      return {
        dataUrl: canvas.toDataURL('image/png'),
        aspect: source.naturalWidth / source.naturalHeight
      };
    } catch (_) {
      return null;
    }
  }

  function decoratePdfPages(pdf, watermarkDataUrl) {
    if (!pdf || !pdf.internal) return;
    const pages = pdf.internal.getNumberOfPages();
    const pageSize = pdf.internal.pageSize;
    const pageWidth = pageSize.getWidth();
    const pageHeight = pageSize.getHeight();

    for (let page = 1; page <= pages; page += 1) {
      pdf.setPage(page);
      if (watermarkDataUrl && watermarkDataUrl.dataUrl) {
        const watermarkWidth = 32;
        const watermarkHeight = watermarkWidth / Math.max(0.5, watermarkDataUrl.aspect || 1);
        pdf.addImage(
          watermarkDataUrl.dataUrl,
          'PNG',
          pageWidth - watermarkWidth - 10,
          8,
          watermarkWidth,
          watermarkHeight,
          undefined,
          'FAST'
        );
      }

      pdf.setDrawColor(218, 226, 236);
      pdf.setLineWidth(0.2);
      pdf.line(10, pageHeight - 8.5, pageWidth - 10, pageHeight - 8.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(71, 85, 105);
      pdf.text(t('pdf_footer_rights'), 10, pageHeight - 5);
      pdf.text(t('pdf_page', { page, pages }), pageWidth - 10, pageHeight - 5, { align: 'right' });
    }
  }

  async function downloadPdfAsFile(triggerBtn) {
    const previousLabel = triggerBtn ? triggerBtn.textContent : '';
    const buttons = Array.from(document.querySelectorAll('.agro-pdf-trigger'));
    buttons.forEach((btn) => {
      btn.disabled = true;
      btn.textContent = t('pdf_generating_btn');
    });
    setPdfHint(t('pdf_generating_hint'), '');
    let exportPack = null;
    try {
      await ensureHtml2PdfLoaded();
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 200));
      exportPack = preparePdfExportClone();
      await new Promise((r) => setTimeout(r, 120));

      const filename = pdfFilename();
      const { clone, width } = exportPack;
      const watermarkDataUrl = buildPdfWatermarkDataUrl();
      const worker = html2pdf()
        .set({
          margin: [10, 10, 12, 10],
          filename,
          image: { type: 'jpeg', quality: 0.93 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            scrollX: 0,
            scrollY: 0,
            width,
            windowWidth: width,
            backgroundColor: '#ffffff'
          },
          jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' },
          pagebreak: {
            mode: ['css', 'legacy'],
            avoid: [
              '.agro-summary-card',
              '.agro-chart-box',
              '.agro-print-page1-fill',
              '.agro-report-meta',
              '.agro-section-head',
              '.agro-pdf-table-section .agro-section-head'
            ]
          }
        })
        .from(clone)
        .toPdf();
      const pdf = await worker.get('pdf');
      decoratePdfPages(pdf, watermarkDataUrl);
      const blob = pdf.output('blob');

      const result = await shareOrSavePdfBlob(blob, filename);
      if (result === 'aborted') {
        setPdfHint(t('pdf_cancelled'), '');
      } else if (result === 'shared') {
        setPdfHint(t('pdf_shared_ok'), 'ok');
        setStatus(readingStatusText(t('pdf_generated')), 'success');
      } else {
        setPdfHint(t('pdf_opened_ok'), 'ok');
        setStatus(readingStatusText(t('pdf_generated')), 'success');
      }
    } catch (err) {
      console.error(err);
      setPdfHint(t('pdf_fallback_print'), 'error');
      downloadPdfViaPrint();
    } finally {
      if (exportPack && exportPack.host && exportPack.host.parentNode) {
        exportPack.host.parentNode.removeChild(exportPack.host);
      }
      buttons.forEach((btn) => {
        btn.disabled = false;
        btn.textContent = previousLabel || t('pdf_download');
      });
    }
  }

  function downloadPdfReport(ev) {
    if (!rows.length) {
      setStatus(t('pdf_need_forecast'), 'error');
      setPdfHint(t('pdf_need_forecast_hint'), 'error');
      return;
    }
    const triggerBtn = ev && ev.currentTarget instanceof HTMLButtonElement
      ? ev.currentTarget
      : document.querySelector('.agro-pdf-trigger');
    if (isIOSLikeDevice()) {
      downloadPdfAsFile(triggerBtn);
      return;
    }
    setPdfHint(t('pdf_print_hint'), '');
    downloadPdfViaPrint();
  }

  function saved() {
    try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (_) { return null; }
  }

  function coords() {
    const lat = n($('agro-lat').value), lng = n($('agro-lng').value);
    return lat != null && lng != null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 ? { lat, lng } : null;
  }

  function saveInputs() {
    if (personal) return;
    const c = coords();
    if (!c) return;
    try {
      const prev = saved() || {};
      const p = prefs();
      localStorage.setItem(STORE, JSON.stringify({
        ...c,
        plotName: $('agro-plot-name').value,
        kc: savedKc != null ? savedKc : n($('agro-kc-view')?.value),
        timezone: timezone || prev.timezone || undefined,
        lastReadingAt: lastReadingAt || prev.lastReadingAt || undefined,
        rows: (Array.isArray(rows) && rows.length ? rows : prev.rows) || undefined,
        language: p.language,
        unit_system: p.unit_system,
        locale: p.locale,
        updatedAt: Date.now()
      }));
    } catch (_) {}
  }

  function restoreLastReading() {
    if (personal) return;
    const prior = saved();
    if (!prior) return;
    if (prior.plotName) $('agro-plot-name').value = prior.plotName;
    if (prior.kc != null) {
      savedKc = n(prior.kc);
      viewKc = savedKc;
    }
    if (prior.timezone) timezone = prior.timezone;
    if (prior.lastReadingAt) lastReadingAt = Number(prior.lastReadingAt) || Date.parse(prior.lastReadingAt) || null;
    if (Array.isArray(prior.rows) && prior.rows.length) {
      rows = prior.rows;
      report = {
        plot_name: prior.plotName || t('selected_location'),
        latitude: n(prior.lat) ?? n(prior.latitude),
        longitude: n(prior.lng) ?? n(prior.longitude),
        kc: savedKc
      };
      applyEtcWithKc(activeKc());
      render();
      if (lastReadingAt) setStatus(readingStatusText(), 'success');
    } else if (lastReadingAt) {
      setStatus(readingStatusText(t('regenerate_hint')), '');
    }
  }

  function applyCoords(lat, lng, pan) {
    if (n(lat) == null || n(lng) == null) return;
    $('agro-lat').value = Number(lat).toFixed(5);
    $('agro-lng').value = Number(lng).toFixed(5);
    marker?.setLatLng([lat, lng]);
    if (pan) map?.setView([lat, lng], Math.max(12, map.getZoom()));
    saveInputs();
  }

  function initMap(force) {
    if (!window.L) {
      setStatus(t('map_load_error'), 'error');
      return;
    }
    if ((personal && !force) || map) {
      if (map) setTimeout(() => map.invalidateSize(), 80);
      return;
    }
    const prior = personal ? (report || {}) : (saved() || {});
    const lat = n(prior.lat) ?? 19.4326, lng = n(prior.lng) ?? -99.1332;
    const initialLat = n(prior.latitude) ?? lat;
    const initialLng = n(prior.longitude) ?? lng;
    if (prior.plotName || prior.plot_name) $('agro-plot-name').value = prior.plotName || prior.plot_name || '';
    if (prior.kc != null) {
      savedKc = n(prior.kc);
      viewKc = savedKc;
    }
    const mapEl = $('agro-map');
    if (!mapEl) return;
    map = L.map(mapEl, { scrollWheelZoom: true }).setView([initialLat, initialLng], personal ? 12 : 5);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19, attribution: 'Esri — Maxar, Earthstar Geographics'
    }).addTo(map);
    marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);
    marker.on('dragend', () => { const p = marker.getLatLng(); applyCoords(p.lat, p.lng); });
    map.on('click', (e) => applyCoords(e.latlng.lat, e.latlng.lng));
    applyCoords(initialLat, initialLng);
    [100, 300, 800].forEach((ms) => setTimeout(() => { if (map) map.invalidateSize(); }, ms));
  }

  function geolocate() {
    if (!navigator.geolocation) return setStatus(t('geo_unsupported'), 'error');
    const btn = $('agro-geolocate-btn');
    btn.disabled = true;
    setStatus(t('geo_requesting'));
    navigator.geolocation.getCurrentPosition((p) => {
      applyCoords(p.coords.latitude, p.coords.longitude, true);
      setStatus(t('geo_applied'), 'success');
      btn.disabled = false;
    }, (err) => {
      setStatus(err.code === 1 ? t('geo_denied') : t('geo_failed'), 'error');
      btn.disabled = false;
    }, { enableHighAccuracy: true, timeout: 15000 });
  }

  function weatherUrl(lat, lng) {
    const daily = [
      'temperature_2m_max', 'temperature_2m_min',
      'precipitation_sum', 'et0_fao_evapotranspiration', 'shortwave_radiation_sum'
    ].join(',');
    const hourly = 'temperature_2m,relative_humidity_2m,dew_point_2m,shortwave_radiation';
    return `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}&past_days=7&forecast_days=8&daily=${daily}&hourly=${hourly}&current=temperature_2m&timezone=auto`;
  }

  function weatherRows(data, kc) {
    if (!data?.daily?.time?.length) throw new Error(t('no_daily_data'));
    const hourly = {};
    (data.hourly?.time || []).forEach((time, i) => {
      const day = time.slice(0, 10);
      hourly[day] ||= { vpds: [], radiations: [], humidities: [], dews: [], vpdLow: 0, vpdOpt: 0, vpdHigh: 0 };
      const val = vpd(data.hourly.temperature_2m?.[i], data.hourly.relative_humidity_2m?.[i], data.hourly.shortwave_radiation?.[i]);
      if (val != null) {
        hourly[day].vpds.push(val);
        if (val < 0.5) hourly[day].vpdLow += 1;
        else if (val <= 1.5) hourly[day].vpdOpt += 1;
        else hourly[day].vpdHigh += 1;
      }
      const rad = n(data.hourly.shortwave_radiation?.[i]);
      if (rad != null) hourly[day].radiations.push(rad);
      const humidity = n(data.hourly.relative_humidity_2m?.[i]);
      if (humidity != null) hourly[day].humidities.push(humidity);
      const dew = n(data.hourly.dew_point_2m?.[i]);
      if (dew != null) hourly[day].dews.push(dew);
    });
    const today = String(data.current?.time || data.daily.time[7]).slice(0, 10);
    const historyStart = addDays(today, -7), forecastEnd = addDays(today, 6);
    return data.daily.time.map((date, i) => {
      const h = hourly[date] || { vpds: [], radiations: [], humidities: [], dews: [], vpdLow: 0, vpdOpt: 0, vpdHigh: 0 };
      const et0 = n(data.daily.et0_fao_evapotranspiration?.[i]);
      return {
        date,
        kind: date < today ? 'history' : 'forecast',
        tempMin: n(data.daily.temperature_2m_min?.[i]),
        tempMax: n(data.daily.temperature_2m_max?.[i]),
        humidityMin: h.humidities.length ? Math.min(...h.humidities) : null,
        humidityMax: h.humidities.length ? Math.max(...h.humidities) : null,
        dewMin: h.dews.length ? round(Math.min(...h.dews), 1) : null,
        dewMax: h.dews.length ? round(Math.max(...h.dews), 1) : null,
        radiationSum: n(data.daily.shortwave_radiation_sum?.[i]),
        radiationMax: h.radiations.length ? Math.max(...h.radiations) : null,
        vpdMin: h.vpds.length ? round(Math.min(...h.vpds), 2) : null,
        vpdMax: h.vpds.length ? round(Math.max(...h.vpds), 2) : null,
        vpdHoursLow: h.vpdLow,
        vpdHoursOpt: h.vpdOpt,
        vpdHoursHigh: h.vpdHigh,
        et0,
        etc: et0 != null && kc != null ? round(et0 * kc) : null,
        rain: n(data.daily.precipitation_sum?.[i])
      };
    }).filter((r) => r.date >= historyStart && r.date <= forecastEnd);
  }

  function demoRows() {
    const today = new Date().toISOString().slice(0, 10);
    return Array.from({ length: 14 }, (_, i) => {
      const day = addDays(today, i - 7), x = i + 1, et0 = round(3.2 + (x % 5) * .55);
      const low = 4 + (x % 5);
      const opt = 8 + (x % 4);
      const high = Math.max(0, 24 - low - opt);
      return {
        date: day, kind: i < 7 ? 'history' : 'forecast',
        tempMin: 14 + (x % 4), tempMax: 26 + (x % 6),
        humidityMin: 34 + (x % 5) * 4, humidityMax: 76 + (x % 4) * 4,
        dewMin: 10 + (x % 4), dewMax: 16 + (x % 3),
        radiationSum: round(17 + (x % 6) * 1.2), radiationMax: 620 + (x % 5) * 45,
        vpdMin: round(.28 + (x % 3) * .08, 2), vpdMax: round(1.45 + (x % 5) * .22, 2),
        vpdHoursLow: low, vpdHoursOpt: opt, vpdHoursHigh: high,
        et0, etc: round(et0 * .9), rain: x % 4 === 0 ? round(2.5 + x * .35) : 0
      };
    });
  }

  async function generate() {
    const c = coords();
    if (!c) return setStatus(t('coords_invalid'), 'error');
    const btn = $('agro-generate-btn');
    btn.disabled = true;
    setStatus(t('fetching'));
    try {
      const response = await fetch(weatherUrl(c.lat, c.lng));
      if (!response.ok) throw new Error(`Open-Meteo ${response.status}`);
      const data = await response.json();
      timezone = data.timezone || '';
      if (personal) {
        savedKc = savedKc != null ? savedKc : n(report?.kc);
      } else {
        const fromBar = n($('agro-kc-view')?.value);
        if (fromBar != null) savedKc = fromBar;
        else if (savedKc == null) savedKc = n(saved()?.kc);
      }
      viewKc = savedKc;
      rows = weatherRows(data, activeKc());
      markReadingNow();
      if (personal) {
        report = {
          ...(report || {}),
          plot_name: $('agro-plot-name').value || report?.plot_name || t('selected_location'),
          latitude: n(report?.latitude) != null ? n(report.latitude) : c.lat,
          longitude: n(report?.longitude) != null ? n(report.longitude) : c.lng,
          kc: savedKc
        };
        render();
        setStatus(readingStatusText(t('change_saved_wa')), 'success');
      } else {
        report = {
          ...(report || {}),
          plot_name: $('agro-plot-name').value || t('selected_location'),
          latitude: c.lat,
          longitude: c.lng,
          kc: savedKc
        };
        render();
        saveInputs();
        setStatus(readingStatusText(), 'success');
      }
    } catch (error) {
      setStatus(t('generate_error', { msg: error.message || '' }), 'error');
    } finally {
      btn.disabled = false;
    }
  }

  function kindBadge(kind) {
    return kind === 'history' ? t('history') : t('forecast');
  }

  function historyCmpLine(forecastVal, historyVal, decimals, mode) {
    const convert = mode === 'temp'
      ? (v) => (I ? I.convertTempFromC(v) : n(v))
      : mode === 'depth'
        ? (v) => (I ? I.convertDepthFromMm(v) : n(v))
        : (v) => n(v);
    const unit = mode === 'temp'
      ? ` ${tempUnitLabel()}`
      : mode === 'depth'
        ? ` ${depthUnitLabel()}`
        : '';
    const suffix = mode === 'temp' ? t('max_suffix') : '';
    const f = convert(forecastVal);
    const h = convert(historyVal);
    if (f == null || h == null) return t('no_history');
    const diff = round(f - h, decimals);
    const sign = diff > 0 ? '+' : '';
    return t('history_cmp', {
      val: `${fmt(h, decimals)}${unit}${suffix}`,
      delta: `${sign}${fmt(diff, decimals)}${unit}${suffix}`
    });
  }

  function summaryHtml(future) {
    const history = rows.filter((r) => r.kind === 'history');
    const fTempMax = extreme(future, 'tempMax', 'max');
    const hTempMax = extreme(history, 'tempMax', 'max');
    const fVpdMin = extreme(future, 'vpdMin', 'min');
    const fVpdMax = extreme(future, 'vpdMax', 'max');
    const hVpdMin = extreme(history, 'vpdMin', 'min');
    const hVpdMax = extreme(history, 'vpdMax', 'max');
    const fEt0 = sum(future, 'et0');
    const hEt0 = sum(history, 'et0');
    const fRain = sum(future, 'rain');
    const hRain = sum(history, 'rain');
    const vpdHist = (hVpdMin != null && hVpdMax != null)
      ? t('history_vpd', { min: fmt(hVpdMin, 2), max: fmt(hVpdMax, 2) })
      : t('no_history');
    const cards = [
      [t('card_temp'), t('temp_to', { min: dispTemp(extreme(future, 'tempMin', 'min')), max: showTemp(fTempMax) }), historyCmpLine(fTempMax, hTempMax, tempDigits(), 'temp'), ''],
      ['VPD', t('temp_to', { min: fmt(fVpdMin, 2), max: fmt(fVpdMax, 2, ' kPa') }), vpdHist, 'vpd'],
      [t('card_eto'), showDepth(fEt0), historyCmpLine(fEt0, hEt0, depthDigits(), 'depth'), 'et'],
      [t('card_etc'), showDepth(sum(future, 'etc')), activeKc() != null ? t('with_kc', { kc: Number(activeKc()).toFixed(2) }) : t('enter_kc'), 'et'],
      [t('card_rain'), showDepth(fRain), historyCmpLine(fRain, hRain, depthDigits(), 'depth'), 'rain'],
      [t('card_humidity'), t('temp_to', { min: fmt(extreme(future, 'humidityMin', 'min'), 0), max: fmt(extreme(future, 'humidityMax', 'max'), 0, ' %') }), t('forecast_range'), ''],
      [t('card_rad'), t('temp_to', { min: fmt(extreme(future, 'radiationMax', 'min'), 0), max: fmt(extreme(future, 'radiationMax', 'max'), 0, ' W/m²') }), t('forecast_range'), ''],
      [t('card_period'), `${dateLabel(future[0]?.date, true)} – ${dateLabel(future.at(-1)?.date, true)}`, t('period_vs', { n: future.length }), '']
    ];
    return cards.map((c) => `<article class="agro-summary-card ${c[3]}"><small>${c[0]}</small><strong>${c[1]}</strong><span>${c[2]}</span></article>`).join('');
  }

  function dayCardsHtml() {
    return rows.map((r) => `<article class="agro-day-card ${r.kind}">
      <div class="agro-day-card-head"><strong>${esc(dateLabel(r.date))}</strong><span class="agro-day-badge ${r.kind}">${kindBadge(r.kind)}</span></div>
      <div class="agro-day-card-grid">
        <div class="agro-day-metric"><small>${t('day_temp')}</small><strong>${dispTemp(r.tempMin)}–${showTemp(r.tempMax)}</strong></div>
        <div class="agro-day-metric"><small>${t('day_humidity')}</small><strong>${fmt(r.humidityMin, 0)}–${fmt(r.humidityMax, 0, ' %')}</strong></div>
        <div class="agro-day-metric"><small>VPD</small><strong>${fmt(r.vpdMin, 2)}–${fmt(r.vpdMax, 2, ' kPa')}</strong></div>
        <div class="agro-day-metric"><small>${t('day_eto_etc')}</small><strong>${dispDepth(r.et0)} / ${dispDepth(r.etc)} ${depthUnitLabel()}</strong></div>
        <div class="agro-day-metric"><small>${t('day_rain')}</small><strong>${showDepth(r.rain)}</strong></div>
        <div class="agro-day-metric"><small>${t('day_rad')}</small><strong>${fmt(r.radiationMax, 0, ' W/m²')}</strong></div>
      </div></article>`).join('');
  }

  function tableHtml() {
    let firstForecast = true;
    const body = rows.map((r) => {
      const first = r.kind === 'forecast' && firstForecast;
      if (first) firstForecast = false;
      return `<tr class="${r.kind}${first ? ' first-forecast' : ''}">
        <td class="agro-date-col">${esc(dateLabel(r.date))}<span class="agro-day-badge ${r.kind}">${kindBadge(r.kind)}</span></td>
        <td class="col-atm col-temp-min">${dispTemp(r.tempMin)}</td><td class="col-atm col-temp-max">${dispTemp(r.tempMax)}</td>
        <td class="col-atm col-rh-min">${fmt(r.humidityMin, 0)}</td><td class="col-atm col-rh-max">${fmt(r.humidityMax, 0)}</td>
        <td class="col-atm col-dew-min">${dispTemp(r.dewMin)}</td><td class="col-atm col-dew-max col-end-atm">${dispTemp(r.dewMax)}</td>
        <td class="col-vpd col-rad">${fmt(r.radiationMax, 0)}</td>
        <td class="col-vpd col-vpd-min">${fmt(r.vpdMin, 2)}</td><td class="col-vpd col-vpd-max col-end-vpd">${fmt(r.vpdMax, 2)}</td>
        <td class="col-water col-eto">${dispDepth(r.et0)}</td><td class="col-water col-etc">${dispDepth(r.etc)}</td><td class="col-water col-rain">${dispDepth(r.rain)}</td>
      </tr>`;
    }).join('');
    return `<table class="agro-table"><thead>
      <tr class="agro-group-row">
        <th class="agro-date-col" rowspan="2">${t('th_date')}</th>
        <th class="group-atmosphere" colspan="6">${t('th_atmosphere')}</th>
        <th class="group-vpd" colspan="3">${t('th_rad_vpd')}</th>
        <th class="group-water" colspan="3">${t('th_water')}</th>
      </tr>
      <tr class="agro-metric-row">
        <th class="col-atm col-temp-min">${t('th_tmin')}</th><th class="col-atm col-temp-max">${t('th_tmax')}</th>
        <th class="col-atm col-rh-min">${t('th_rhmin')}</th><th class="col-atm col-rh-max">${t('th_rhmax')}</th>
        <th class="col-atm col-dew-min">${t('th_dewmin')}</th><th class="col-atm col-dew-max col-end-atm">${t('th_dewmax')}</th>
        <th class="col-vpd col-rad">${t('th_rad')}</th>
        <th class="col-vpd col-vpd-min">${t('th_vpdmin')}</th><th class="col-vpd col-vpd-max col-end-vpd">${t('th_vpdmax')}</th>
        <th class="col-water col-eto">${t('th_eto')}</th><th class="col-water col-etc">${t('th_etc')}${activeKc() != null ? `<span class="agro-etc-kc">· Kc ${Number(activeKc()).toFixed(2)}</span>` : ''}</th><th class="col-water col-rain">${t('th_rain')}</th>
      </tr>
    </thead><tbody>${body}</tbody></table>`;
  }

  function chartDepth(v) {
    const converted = I ? I.convertDepthFromMm(v) : n(v);
    return converted == null ? null : converted;
  }

  function chartSets() {
    const sets = [];
    if (visible.vpdHours) {
      sets.push(
        {
          type: 'bar',
          label: t('hours_vpd_low'),
          yAxisID: 'yHours',
          data: rows.map((r) => r.vpdHoursLow ?? 0),
          backgroundColor: 'rgba(29, 78, 216, 0.28)',
          borderColor: 'rgba(29, 78, 216, 0.45)',
          borderWidth: 1,
          stack: 'vpdHours',
          order: 3,
          barPercentage: 0.72,
          categoryPercentage: 0.78
        },
        {
          type: 'bar',
          label: t('hours_vpd_opt'),
          yAxisID: 'yHours',
          data: rows.map((r) => r.vpdHoursOpt ?? 0),
          backgroundColor: 'rgba(22, 163, 74, 0.22)',
          borderColor: 'rgba(22, 163, 74, 0.4)',
          borderWidth: 1,
          stack: 'vpdHours',
          order: 3,
          barPercentage: 0.72,
          categoryPercentage: 0.78
        },
        {
          type: 'bar',
          label: t('hours_vpd_high'),
          yAxisID: 'yHours',
          data: rows.map((r) => r.vpdHoursHigh ?? 0),
          backgroundColor: 'rgba(127, 29, 29, 0.28)',
          borderColor: 'rgba(127, 29, 29, 0.48)',
          borderWidth: 1,
          stack: 'vpdHours',
          order: 3,
          barPercentage: 0.72,
          categoryPercentage: 0.78
        }
      );
    }
    const lines = [
      ['rain', t('precipitation'), '#0284c7', 'rain'],
      ['et0', 'ETo', '#0f766e', 'et0'],
      ['etc', 'ETc', '#64748b', 'etc']
    ];
    lines.filter((s) => visible[s[0]]).forEach((s) => {
      sets.push({
        type: 'line',
        label: s[1],
        borderColor: s[2],
        backgroundColor: 'transparent',
        yAxisID: 'yMm',
        data: rows.map((r) => chartDepth(r[s[3]])),
        borderWidth: 2.2,
        tension: .28,
        pointRadius: 2.5,
        order: 1
      });
    });
    return sets;
  }

  function drawChart() {
    if (!window.Chart) {
      setStatus(t('chart_load_error'), 'error');
      return;
    }
    const canvas = $('agro-chart');
    if (!canvas) return;
    chart?.destroy();
    const chartRows = rows.slice();
    const firstForecastIdx = chartRows.findIndex((r) => r.kind === 'forecast');
    const historyCount = chartRows.filter((r) => r.kind === 'history').length;
    const forecastCount = chartRows.filter((r) => r.kind === 'forecast').length;
    const historyForecastLine = {
      id: 'historyForecastLine',
      afterDatasetsDraw(chartInstance) {
        if (firstForecastIdx <= 0) return;
        const { ctx, chartArea, scales } = chartInstance;
        const xScale = scales.x;
        if (!xScale || !chartArea) return;
        const x = xScale.getPixelForValue(firstForecastIdx - 0.5);
        if (!Number.isFinite(x)) return;
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.moveTo(x, chartArea.top);
        ctx.lineTo(x, chartArea.bottom);
        ctx.stroke();
        ctx.setLineDash([]);
        const labelY = Math.max(10, chartArea.top - 8);
        ctx.font = '700 10px Inter, system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillStyle = '#475569';
        ctx.fillText(t('chart_hist_arrow'), x - 6, labelY);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#0369a1';
        ctx.fillText(t('chart_fc_arrow'), x + 6, labelY);
        ctx.restore();
      }
    };
    chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: chartRows.map((r) => dateLabel(r.date, true)),
        datasets: chartSets()
      },
      plugins: [historyForecastLine],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 22 } },
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            stacked: true,
            ticks: {
              autoSkip: false,
              maxRotation: 60,
              minRotation: 45,
              font: { size: 9, weight: '700' },
              color(ctx) {
                const row = chartRows[ctx.index];
                return row?.kind === 'history' ? '#64748b' : '#0369a1';
              }
            }
          },
          yHours: {
            position: 'left',
            stacked: true,
            min: 0,
            max: 24,
            title: {
              display: true,
              text: t('axis_hours'),
              color: '#1d4ed8',
              font: { weight: '700', size: 11 }
            },
            ticks: { stepSize: 4, color: '#1e40af' },
            border: { color: '#93c5fd' },
            grid: { color: 'rgba(147, 197, 253, 0.25)' }
          },
          yMm: {
            position: 'right',
            beginAtZero: true,
            grace: '12%',
            suggestedMax: 1,
            grid: { drawOnChartArea: false },
            title: {
              display: true,
              text: t('axis_depth'),
              color: '#0f766e',
              font: { weight: '700', size: 11 }
            },
            ticks: { color: '#0f766e' },
            border: { color: '#5eead4' }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title(items) {
                const idx = items?.[0]?.dataIndex;
                const row = chartRows[idx];
                if (!row) return items?.[0]?.label || '';
                const tag = kindBadge(row.kind);
                return `${dateLabel(row.date)} · ${tag}`;
              }
            },
            itemSort(a, b) {
              const rank = (label) => {
                const s = String(label || '');
                if (/VPD\s*>\s*1\.5/i.test(s)) return 1;
                if (/VPD\s*0\.5/i.test(s)) return 2;
                if (/VPD\s*<\s*0\.5/i.test(s)) return 3;
                if (/Precip|Lluvia|Rain/i.test(s)) return 10;
                if (/^ETo/i.test(s)) return 11;
                if (/^ETc/i.test(s)) return 12;
                return 20;
              };
              return rank(a.dataset.label) - rank(b.dataset.label);
            }
          }
        }
      }
    });
    const periodMeta = $('agro-chart-period');
    if (periodMeta) {
      periodMeta.textContent = t('chart_period', { h: historyCount, f: forecastCount });
    }
  }

  function renderToggles() {
    const labels = {
      vpdHours: t('toggle_vpd_hours'),
      rain: t('toggle_rain'),
      et0: 'ETo',
      etc: 'ETc'
    };
    $('agro-chart-toggles').innerHTML = Object.keys(labels).map((key) =>
      `<button type="button" class="agro-chart-toggle series-${key}${visible[key] ? '' : ' off'}" data-series="${key}">${labels[key]}</button>`).join('');
  }

  function render() {
    if (!rows.length) return;
    const future = rows.filter((r) => r.kind === 'forecast');
    $('agro-summary-grid').innerHTML = summaryHtml(future);
    $('agro-mobile-days').innerHTML = '';
    syncKcBar();
    const chartNote = $('agro-chart-note');
    if (chartNote) {
      const histN = rows.filter((r) => r.kind === 'history').length;
      const futN = rows.filter((r) => r.kind === 'forecast').length;
      const kcTxt = activeKc() == null
        ? t('etc_pending_kc')
        : t('etc_with_kc', { kc: Number(activeKc()).toFixed(2) });
      chartNote.innerHTML = t('chart_note_dynamic', { h: histN, f: futN, kc: kcTxt });
    }
    $('agro-table-wrap').innerHTML = tableHtml();
    $('agro-table-wrap').classList.add('open');
    syncTableScrollHint();
    $('agro-results').hidden = false;
    $('agro-empty-note').hidden = true;
    $('agro-register-cta').hidden = personal;
    $('agro-personal-actions').hidden = !personal;
    syncUnsubscribeLink();
    $('agro-report-meta').hidden = !personal;
    if (personal) {
      const when = reportGeneratedAt || lastReadingAt
        ? formatReadingAt(reportGeneratedAt || lastReadingAt)
        : '';
      $('agro-report-meta').innerHTML = `<strong>${esc(report?.plot_name || t('plot'))}</strong>${when ? `<br>${esc(t('forecast_generated', { when }))}` : ''}${report?.request_code ? `<br>${esc(t('folio', { code: report.request_code }))}` : ''}`;
    }
    renderToggles();
    requestAnimationFrame(() => {
      drawChart();
      syncTableScrollHint();
      setTimeout(() => {
        syncTableScrollHint();
        sendResize();
      }, 120);
    });
  }

  function syncTableScrollHint() {
    const wrap = $('agro-table-wrap');
    const hint = $('agro-table-scroll-hint');
    if (!wrap || !hint) return;
    const overflow = wrap.scrollWidth > wrap.clientWidth + 4;
    hint.hidden = !overflow;
    const leftBtn = hint.querySelector('[data-scroll-dir="-1"]');
    const rightBtn = hint.querySelector('[data-scroll-dir="1"]');
    const max = Math.max(0, wrap.scrollWidth - wrap.clientWidth);
    if (leftBtn) leftBtn.disabled = wrap.scrollLeft <= 2;
    if (rightBtn) rightBtn.disabled = wrap.scrollLeft >= max - 2;
  }

  function kcModal(target) {
    kcModalTarget = target === 'view' ? 'view' : 'location';
    $('agro-kc-modal').hidden = false;
    renderKc('');
  }

  function renderKc(filter) {
    const loc = locale();
    const lang = prefs().language === 'en' ? 'en' : 'es';
    const query = String(filter || '').toLocaleLowerCase(loc);
    const labelsOf = (x) => (typeof window.faoKcLabels === 'function'
      ? window.faoKcLabels(x, lang)
      : { crop: x.crop, stage: x.stage });
    const searchOf = (x) => (typeof window.faoKcSearchText === 'function'
      ? window.faoKcSearchText(x)
      : `${x.crop} ${x.stage}`);
    const data = (window.FAO_KC_REFERENCE || []).filter((x) => searchOf(x).toLocaleLowerCase(loc).includes(query));
    $('agro-kc-list').innerHTML = data.length ? data.map((x) => {
      const suggested = round((Number(x.kcMin) + Number(x.kcMax)) / 2, 2);
      const labels = labelsOf(x);
      return `<div class="agro-kc-row"><b>${esc(labels.crop)}</b><span>${esc(labels.stage)}</span><strong>${x.kcMin}–${x.kcMax}</strong><button type="button" class="agro-btn ghost" data-kc="${suggested}" data-crop="${esc(labels.crop)}" data-range="${esc(`${x.kcMin}–${x.kcMax}`)}" data-stage="${esc(labels.stage)}">${esc(t('use_kc', { kc: suggested }))}</button></div>`;
    }).join('') : `<p>${esc(t('kc_none'))}</p>`;
  }

  function openRegister() {
    const c = coords() || { lat: report?.latitude, lng: report?.longitude };
    const form = $('agro-register-form');
    form.elements.plot_name.value = $('agro-plot-name').value || report?.plot_name || '';
    form.elements.latitude.value = c?.lat ?? '';
    form.elements.longitude.value = c?.lng ?? '';
    form.elements.kc.value = activeKc() ?? report?.kc ?? '';
    $('agro-register-success').hidden = true;
    form.hidden = false;
    $('agro-register-modal').hidden = false;
  }

  async function register(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    if (data.phone_country_code === 'other') {
      let custom = String(data.phone_country_code_other || '').trim();
      if (!custom.startsWith('+')) custom = `+${custom.replace(/[^\d]/g, '')}`;
      if (!/^\+\d{1,4}$/.test(custom)) {
        setStatus(t('phone_code_error'), 'error', true);
        return;
      }
      data.phone_country_code = custom;
    }
    delete data.phone_country_code_other;
    data.accept_terms = !!form.elements.accept_terms.checked;
    data.email_consent = !!form.elements.email_consent.checked;
    data.whatsapp_consent = !!form.elements.whatsapp_consent.checked;
    const p = prefs();
    data.language = p.language;
    data.unit_system = p.unit_system;
    data.locale = p.locale;
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    setStatus(t('saving_request'), '', true);
    try {
      const response = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'register', ...data }) });
      const out = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(out.message || out.error || t('save_failed'));
      form.hidden = true;
      $('agro-register-success').hidden = false;
      $('agro-request-code').textContent = out.request_code;
      const message = t('wa_register_msg', { name: data.full_name, code: out.request_code });
      $('agro-whatsapp-link').href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`;
    } catch (error) {
      setStatus(error.message, 'error', true);
    } finally { submit.disabled = false; }
  }

  function applyReportDisplayPrefs(subscriber) {
    if (!I || !subscriber) return;
    if (subscriber.language || subscriber.unit_system || subscriber.locale) {
      I.setReportPrefs({
        language: subscriber.language,
        unit_system: subscriber.unit_system,
        locale: subscriber.locale
      });
      I.apply(document);
    }
  }

  async function loadReport() {
    if (demo) {
      rows = demoRows();
      timezone = 'America/Mexico_City';
      report = { plot_name: t('demo_plot'), kc: .9, request_code: 'K7M2', latitude: 19.4326, longitude: -99.1332, full_name: 'Demo' };
      savedKc = .9;
      viewKc = .9;
      referenceKcLabel = 'Demo · 0.90';
      return render();
    }
    try {
      const reportQs = new URLSearchParams({ token });
      if (snapshotParam) reportQs.set('snapshot', snapshotParam);
      const response = await fetch(`${API}?action=report&${reportQs.toString()}`);
      const out = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(out.message || t('link_unavailable'));
      report = out.subscriber || {};
      applyReportDisplayPrefs(report);
      rows = out.rows || [];
      timezone = report.timezone || '';
      savedKc = n(report.kc);
      viewKc = savedKc;
      if (report.crop || report.crop_stage) {
        referenceKcLabel = [report.crop, report.crop_stage].filter(Boolean).join(' · ');
      }
      $('agro-plot-name').value = report.plot_name || '';
      $('agro-lat').value = report.latitude ?? '';
      $('agro-lng').value = report.longitude ?? '';
      if ((!rows.length || rows.some((r) => r.vpdHoursLow == null)) && report.latitude != null) {
        const weather = await fetch(weatherUrl(report.latitude, report.longitude)).then((r) => r.json());
        rows = weatherRows(weather, activeKc());
        markReadingNow();
      } else if (rows.length) {
        applyEtcWithKc(activeKc());
        if (out.generated_at) {
          const parsed = Date.parse(out.generated_at);
          reportGeneratedAt = Number.isFinite(parsed) ? parsed : null;
        }
        if (reportGeneratedAt) lastReadingAt = reportGeneratedAt;
      }
      render();
      if (reportGeneratedAt || lastReadingAt) setStatus(readingStatusText(), 'success');
      if (out.historical_view && $('agro-report-meta') && !$('agro-report-meta').hidden) {
        $('agro-report-meta').insertAdjacentHTML(
          'beforeend',
          `<br><span style="color:#b45309;font-weight:700;">${esc(t('historical_view'))}</span>`
        );
      }
    } catch (error) {
      $('agro-empty-note').innerHTML = `<strong>${esc(t('open_report_error'))}</strong><span>${esc(error.message)}</span>`;
    }
  }

  function unsubscribeWhatsAppHref() {
    const folio = report?.request_code ? t('wa_folio', { code: report.request_code }) : '';
    const name = report?.full_name || '';
    const message = t('wa_unsubscribe', {
      folio,
      name: name ? t('wa_name', { name }) : ''
    });
    return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`;
  }

  function syncUnsubscribeLink() {
    const btn = $('agro-unsubscribe-btn');
    if (!btn) return;
    const fromEmailLink = !!token;
    btn.hidden = !fromEmailLink;
    btn.style.display = fromEmailLink ? '' : 'none';
    if (!fromEmailLink) return;
    btn.href = unsubscribeWhatsAppHref();
  }

  function sendResize() {
    if (!embed || window.parent === window) return;
    window.parent.postMessage({ type: 'np-free-tool-resize', height: Math.ceil(document.documentElement.scrollHeight) }, '*');
  }

  function bind() {
    $('agro-geolocate-btn').addEventListener('click', geolocate);
    $('agro-generate-btn').addEventListener('click', generate);
    $('agro-kc-view-ref-btn').addEventListener('click', () => kcModal('view'));
    $('agro-kc-view-apply-btn').addEventListener('click', applyViewKc);
    $('agro-kc-view').addEventListener('change', applyViewKc);
    $('agro-kc-view').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyViewKc();
      }
    });
    $('agro-kc-search').addEventListener('input', (e) => renderKc(e.target.value));
    $('agro-kc-list').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-kc]');
      if (!btn) return;
      const picked = n(btn.dataset.kc);
      const label = `${btn.dataset.crop || ''} · ${btn.dataset.stage || ''} · ref ${btn.dataset.range || picked}`;
      if (kcModalTarget === 'view') {
        viewKc = picked;
        referenceKcLabel = label;
        $('agro-kc-view').value = picked == null ? '' : picked;
        if (!personal) savedKc = picked;
        applyEtcWithKc(activeKc());
        render();
        if (!personal) saveInputs();
      }
      $('agro-kc-modal').hidden = true;
    });
    document.querySelectorAll('[data-close-modal]').forEach((btn) => btn.addEventListener('click', () => $(btn.dataset.closeModal).hidden = true));
    document.querySelectorAll('.agro-modal').forEach((modal) => modal.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; }));
    $('agro-open-register-btn').addEventListener('click', openRegister);
    $('agro-register-form').addEventListener('submit', register);
    const phoneCode = $('agro-phone-code');
    const phoneOther = $('agro-phone-code-other');
    if (phoneCode && phoneOther) {
      phoneCode.addEventListener('change', () => {
        const other = phoneCode.value === 'other';
        phoneOther.hidden = !other;
        phoneOther.required = other;
        if (!other) phoneOther.value = '';
      });
    }
    $('agro-table-toggle').addEventListener('click', () => {
      $('agro-table-wrap').classList.toggle('open');
      $('agro-table-toggle').textContent = $('agro-table-wrap').classList.contains('open')
        ? t('table_toggle_hide')
        : t('table_toggle_show');
      syncTableScrollHint();
    });
    const tableWrap = $('agro-table-wrap');
    const scrollHint = $('agro-table-scroll-hint');
    if (tableWrap) {
      tableWrap.addEventListener('scroll', syncTableScrollHint, { passive: true });
    }
    if (scrollHint) {
      scrollHint.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-scroll-dir]');
        if (!btn || !tableWrap) return;
        tableWrap.scrollBy({ left: Number(btn.dataset.scrollDir) * Math.max(180, Math.floor(tableWrap.clientWidth * 0.7)), behavior: 'smooth' });
      });
    }
    window.addEventListener('resize', () => {
      syncTableScrollHint();
      if (map) map.invalidateSize();
      sendResize();
    });
    $('agro-chart-toggles').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-series]');
      if (!btn) return;
      visible[btn.dataset.series] = !visible[btn.dataset.series];
      renderToggles();
      drawChart();
    });
    document.querySelectorAll('.agro-pdf-trigger').forEach((btn) => {
      btn.addEventListener('click', downloadPdfReport);
    });
    $('agro-unsubscribe-btn')?.addEventListener('click', (e) => {
      if (!token) {
        e.preventDefault();
        return;
      }
      syncUnsubscribeLink();
      if (!confirm(t('unsubscribe_confirm'))) {
        e.preventDefault();
      }
    });
    $('agro-edit-btn').addEventListener('click', () => {
      $('agro-location-card').hidden = false;
      $('agro-generate-btn').textContent = personal
        ? t('generate_explore')
        : t('generate_save');
      if (personal) {
        setStatus(t('edit_explore_hint'), '');
      }
      initMap(true);
      [80, 250, 600].forEach((ms) => setTimeout(() => map?.invalidateSize(), ms));
      $('agro-location-card').scrollIntoView({ behavior: 'smooth' });
    });
    ['agro-lat', 'agro-lng', 'agro-plot-name'].forEach((id) => $(id).addEventListener('change', () => {
      saveInputs();
    }));
  }

  function bindAboutModal() {
    const modal = $('agro-about-modal');
    const openBtn = $('agro-about-btn');
    const closeBtn = $('agro-about-close');
    if (!modal || !openBtn) return;
    const open = () => { modal.classList.add('show'); modal.style.display = 'flex'; };
    const close = () => { modal.classList.remove('show'); modal.style.display = 'none'; };
    openBtn.addEventListener('click', open);
    closeBtn?.addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('show')) close();
    });
  }

  function init() {
    if (I) {
      if (typeof I.applyAndReveal === 'function') I.applyAndReveal(document);
      else I.apply(document);
    } else {
      try { document.documentElement.classList.remove('agro-booting'); } catch (e) { /* ignore */ }
    }
    setMode();
    bind();
    bindAboutModal();
    if (personal) loadReport();
    else {
      initMap();
      restoreLastReading();
    }
    sendResize();
    window.addEventListener('message', (ev) => {
      const data = ev && ev.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'np-agro-shown') {
        [80, 250, 600].forEach((ms) => setTimeout(() => { if (map) map.invalidateSize(); }, ms));
        sendResize();
        return;
      }
      if (data.type === 'np-agro-prefs' && I && typeof I.setReportPrefs === 'function') {
        I.setReportPrefs({
          language: data.language === 'en' ? 'en' : 'es',
          unit_system: data.unit_system === 'us_customary' ? 'us_customary' : 'metric'
        });
        if (typeof I.applyAndReveal === 'function') I.applyAndReveal(document);
        else I.apply(document);
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
