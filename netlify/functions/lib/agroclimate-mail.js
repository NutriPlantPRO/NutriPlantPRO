const nodemailer = require('nodemailer');

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function value(v, decimals = 1) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(decimals) : '—';
}

function numberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function subscriberPrefs(subscriber) {
  const language = String(subscriber?.language || '').trim().toLowerCase() === 'en' ? 'en' : 'es';
  const unitSystem =
    String(subscriber?.unit_system || '').trim().toLowerCase() === 'us_customary'
      ? 'us_customary'
      : 'metric';
  const localeRaw = String(subscriber?.locale || '').trim();
  const locale =
    localeRaw ||
    (language === 'en' ? 'en-US' : 'es-MX');
  return { language, unitSystem, locale, us: unitSystem === 'us_customary' };
}

function convertTempC(celsius, us) {
  const n = numberOrNull(celsius);
  if (n == null) return null;
  return us ? (n * 9) / 5 + 32 : n;
}

function convertMm(mm, us) {
  const n = numberOrNull(mm);
  if (n == null) return null;
  return us ? n / 25.4 : n;
}

function fmtTemp(celsius, us, decimals = 1) {
  return value(convertTempC(celsius, us), decimals);
}

function fmtMm(mm, us, decimals) {
  const d = decimals != null ? decimals : us ? 2 : 1;
  return value(convertMm(mm, us), d);
}

function dateLabel(iso, locale) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Intl.DateTimeFormat(locale || 'es-MX', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

function statsOf(rows, kind) {
  const list = (rows || []).filter((row) => row.kind === kind);
  const nums = (key) => list.map((row) => numberOrNull(row[key])).filter((n) => n != null);
  const sum = (key) => {
    const vals = nums(key);
    return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
  };
  const min = (key) => {
    const vals = nums(key);
    return vals.length ? Math.min(...vals) : null;
  };
  const max = (key) => {
    const vals = nums(key);
    return vals.length ? Math.max(...vals) : null;
  };
  return {
    days: list.length,
    tempMin: min('tempMin'),
    tempMax: max('tempMax'),
    vpdMin: min('vpdMin'),
    vpdMax: max('vpdMax'),
    et0Total: sum('et0'),
    etcTotal: sum('etc'),
    rainTotal: sum('rain')
  };
}

function copyFor(language, us) {
  const en = language === 'en';
  const tempUnit = us ? '°F' : '°C';
  const depthUnit = us ? 'in' : 'mm';
  const plotDefault = en ? 'My plot' : 'Mi predio';
  return {
    tempUnit,
    depthUnit,
    plotDefault,
    subject: (plotName) =>
      en
        ? `Agroclimate Forecast NutriPlant — ${plotName}`
        : `Pronóstico Agroclimático NutriPlant — ${plotName}`,
    hello: (name) => (en ? `Hello ${name},` : `Hola ${name},`),
    introPlain: (plotName, days) =>
      en
        ? `Agroclimate FORECAST for your plot (${plotName}) — next ${days} days.`
        : `PRONÓSTICO agroclimático de tu predio (${plotName}) — próximos ${days} días.`,
    openFullReport: en
      ? 'View full report (table, chart, map and PDF):'
      : 'Ver reporte completo (tabla, gráfica, mapa y PDF):',
    forecastSummary: en ? 'FORECAST summary:' : 'Resumen del PRONÓSTICO:',
    tempLabel: en ? 'Temperature min–max' : 'Temperatura mín–máx',
    vpdLabel: en ? 'VPD min–max' : 'VPD mín–máx',
    et0Label: en ? 'Cumulative ETo' : 'ETo acumulada',
    rainLabel: en ? 'Cumulative rain' : 'Lluvia acumulada',
    vsHistory: (days) =>
      en
        ? `Comparison vs previous-week history (${days} d):`
        : `Comparación vs histórico, semana anterior (${days} d):`,
    histTemp: en ? 'Previous-week history T' : 'Histórico, semana anterior T',
    histRainEto: en
      ? 'Previous-week history cumulative rain'
      : 'Histórico, semana anterior lluvia acum.',
    histEtoShort: en ? 'cumulative ETo' : 'ETo acum.',
    disclaimer: en
      ? 'Estimated forecast for the registered coordinates. Validate field conditions.'
      : 'Pronóstico estimado para las coordenadas registradas. Valida las condiciones en campo.',
    editOrStop: en
      ? 'Edit plot / Kc or stop receiving alerts:'
      : 'Editar predio / Kc o dejar de recibir alertas:',
    stopHowTo: en
      ? 'To stop receiving alerts: open that link and on the page use the green WhatsApp button (“Stop receiving alerts”) to send us the message.'
      : 'Para dejar de recibir alertas: abre ese enlace y en la página usa el botón verde de WhatsApp («Dejar de recibir alertas») para enviarnos el mensaje.',
    heading: en ? 'Agroclimate forecast' : 'Pronóstico agroclimático',
    introHtml: en
      ? 'here is the forecast for your plot for the coming days.'
      : 'aquí tienes el pronóstico de tu predio para los próximos días.',
    openHint: en
      ? 'Open the link to see the full table, chart, map and download the PDF.'
      : 'Abre el enlace para ver la tabla completa, la gráfica, el mapa y descargar el PDF.',
    ctaFull: en ? 'View full report' : 'Ver reporte completo',
    forecastBadge: en ? 'FORECAST' : 'PRONÓSTICO',
    forecastSub: (fDays, hDays) =>
      en
        ? `Next ${fDays} days · vs previous-week history (${hDays} d)`
        : `Próximos ${fDays} días · vs histórico, semana anterior (${hDays} d)`,
    tempCard: en ? 'Temperature · min–max' : 'Temperatura · mín–máx',
    vpdCard: en ? 'VPD · min–max' : 'VPD · mín–máx',
    et0Card: en ? 'ETo · cumulative' : 'ETo · acumulada',
    rainCard: en ? 'Rain · cumulative' : 'Lluvia · acumulada',
    tableTitle: en ? 'FORECAST table' : 'Tabla del PRONÓSTICO',
    tableHint: en
      ? 'Compact table in the email. Chart, full history and PDF → “View full report”.'
      : 'Tabla compacta en el correo. Gráfica, histórico completo y PDF → «Ver reporte completo».',
    day: en ? 'Day' : 'Día',
    /* Misma paleta que las celdas: mín más tenue, máx más intenso; ETo / ETc / lluvia distintos */
    thTemp: en
      ? `T ${tempUnit}<br><span style="color:#ea580c;font-weight:700;">min</span>–<span style="color:#c2410c;font-weight:800;">max</span>`
      : `T ${tempUnit}<br><span style="color:#ea580c;font-weight:700;">mín</span>–<span style="color:#c2410c;font-weight:800;">máx</span>`,
    thRh: en
      ? `RH %<br><span style="color:#0284c7;font-weight:700;">min</span>–<span style="color:#0369a1;font-weight:800;">max</span>`
      : `HR %<br><span style="color:#0284c7;font-weight:700;">mín</span>–<span style="color:#0369a1;font-weight:800;">máx</span>`,
    thVpd: en
      ? `VPD<br><span style="color:#7c3aed;font-weight:700;">min</span>–<span style="color:#6d28d9;font-weight:800;">max</span>`
      : `VPD<br><span style="color:#7c3aed;font-weight:700;">mín</span>–<span style="color:#6d28d9;font-weight:800;">máx</span>`,
    thWater: en
      ? `${depthUnit}<br><span style="color:#0f766e;font-weight:700;">ETo</span> / <span style="color:#15803d;font-weight:700;">ETc</span> / <span style="color:#1d4ed8;font-weight:800;">Rain</span>`
      : `${depthUnit}<br><span style="color:#0f766e;font-weight:700;">ETo</span> / <span style="color:#15803d;font-weight:700;">ETc</span> / <span style="color:#1d4ed8;font-weight:800;">Lluvia</span>`,
    noForecast: en ? 'No forecast days.' : 'Sin días de pronóstico.',
    footnote: en
      ? 'Estimated weather forecast for the registered coordinates. Leaf temperature and VPD are indicative; validate the microclimate in the field.'
      : 'Pronóstico meteorológico estimado para las coordenadas registradas. La temperatura de hoja y el VPD son orientativos; valida el microclima en campo.',
    editLink: en
      ? 'Edit plot / Kc or stop receiving alerts'
      : 'Editar predio / Kc o dejar de recibir alertas',
    stopHtml: en
      ? 'To <strong>stop receiving alerts</strong>: open the link, go to your report and send the message with the green <strong>WhatsApp</strong> button (“Stop receiving alerts”). The email link only takes you to the page; the notice is sent from there.'
      : 'Para <strong>dejar de recibir alertas</strong>: abre el enlace, entra a tu reporte y envía el mensaje con el botón verde de <strong>WhatsApp</strong> («Dejar de recibir alertas»). El link del correo solo te lleva a la página; el aviso se manda desde ahí.',
    noHistory: en
      ? 'No previous-week history'
      : 'Sin histórico de la semana anterior',
    histPrefix: en ? 'Previous-week history' : 'Histórico, semana anterior',
    maxSuffix: en ? ' max' : ' máx'
  };
}

function deltaLine(forecastVal, historyVal, decimals, unit, copy, convertFn) {
  const fRaw = numberOrNull(forecastVal);
  const hRaw = numberOrNull(historyVal);
  if (fRaw == null || hRaw == null) return copy.noHistory;
  const f = convertFn ? convertFn(fRaw) : fRaw;
  const h = convertFn ? convertFn(hRaw) : hRaw;
  if (f == null || h == null) return copy.noHistory;
  const diff = f - h;
  const sign = diff > 0 ? '+' : '';
  return `${copy.histPrefix} ${value(h, decimals)}${unit} · Δ ${sign}${value(diff, decimals)}${unit}`;
}

function forecastCompactTable(rows, prefs, copy) {
  const forecast = (rows || []).filter((row) => row.kind === 'forecast');
  if (!forecast.length) {
    return `<p style="color:#64748b;font-size:13px;">${escapeHtml(copy.noForecast)}</p>`;
  }
  const th =
    'padding:7px 4px;font-size:10px;font-weight:800;text-align:center;border:1px solid #93c5fd;background:#e0f2fe;color:#0c4a6e;line-height:1.25;';
  const td =
    'padding:7px 4px;font-size:11px;text-align:center;border:1px solid #bfdbfe;vertical-align:middle;line-height:1.3;color:#0f172a;';
  const mmDec = prefs.us ? 2 : 1;
  const body = forecast
    .map(
      (row) => `<tr>
        <td style="${td}text-align:left;font-weight:800;color:#0c4a6e;white-space:nowrap;">${escapeHtml(dateLabel(row.date, prefs.locale))}</td>
        <td style="${td}"><span style="color:#ea580c;">${fmtTemp(row.tempMin, prefs.us)}</span>–<span style="color:#c2410c;font-weight:800;">${fmtTemp(row.tempMax, prefs.us)}</span></td>
        <td style="${td}"><span style="color:#0284c7;">${value(row.humidityMin, 0)}</span>–<span style="color:#0369a1;font-weight:800;">${value(row.humidityMax, 0)}</span></td>
        <td style="${td}"><span style="color:#7c3aed;">${value(row.vpdMin, 2)}</span>–<span style="color:#6d28d9;font-weight:800;">${value(row.vpdMax, 2)}</span></td>
        <td style="${td}"><span style="color:#0f766e;font-weight:700;">${fmtMm(row.et0, prefs.us, mmDec)}</span> / <span style="color:#15803d;font-weight:700;">${fmtMm(row.etc, prefs.us, mmDec)}</span> / <span style="color:#1d4ed8;font-weight:800;">${fmtMm(row.rain, prefs.us, mmDec)}</span></td>
      </tr>`
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:100%;border-collapse:collapse;table-layout:fixed;">
      <thead>
        <tr>
          <th style="${th}width:22%;">${escapeHtml(copy.day)}</th>
          <th style="${th}width:18%;">${copy.thTemp}</th>
          <th style="${th}width:16%;">${copy.thRh}</th>
          <th style="${th}width:18%;">${copy.thVpd}</th>
          <th style="${th}width:26%;">${copy.thWater}</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>`;
}

function buildEmail({ subscriber, plot, snapshot, reportUrl }) {
  const prefs = subscriberPrefs(subscriber);
  reportUrl = reportUrlWithPrefs(reportUrl, subscriber);
  const copy = copyFor(prefs.language, prefs.us);
  const rows = snapshot.rows || [];
  const forecast = statsOf(rows, 'forecast');
  const history = statsOf(rows, 'history');
  const summary = snapshot.summary || {};
  const tempMin = forecast.tempMin ?? summary.tempMin;
  const tempMax = forecast.tempMax ?? summary.tempMax;
  const vpdMin = forecast.vpdMin ?? summary.vpdMin;
  const vpdMax = forecast.vpdMax ?? summary.vpdMax;
  const et0Total = forecast.et0Total ?? summary.et0Total;
  const rainTotal = forecast.rainTotal ?? summary.rainTotal;
  const plotName = plot.plot_name || copy.plotDefault;
  const mmDec = prefs.us ? 2 : 1;
  const toTemp = (n) => convertTempC(n, prefs.us);
  const toMm = (n) => convertMm(n, prefs.us);

  const subject = copy.subject(plotName);
  const plainDays = rows
    .filter((row) => row.kind === 'forecast')
    .map(
      (row) =>
        `${dateLabel(row.date, prefs.locale)}: T ${fmtTemp(row.tempMin, prefs.us)}–${fmtTemp(row.tempMax, prefs.us)} ${copy.tempUnit} | ` +
        `${prefs.language === 'en' ? 'RH' : 'HR'} ${value(row.humidityMin, 0)}–${value(row.humidityMax, 0)} % | ` +
        `VPD ${value(row.vpdMin, 2)}–${value(row.vpdMax, 2)} kPa | ` +
        `ETo ${fmtMm(row.et0, prefs.us, mmDec)} ${copy.depthUnit} | ETc ${fmtMm(row.etc, prefs.us, mmDec)} ${copy.depthUnit} | ` +
        `${prefs.language === 'en' ? 'Rain' : 'Lluvia'} ${fmtMm(row.rain, prefs.us, mmDec)} ${copy.depthUnit}`
    )
    .join('\n');

  const text =
    `${copy.hello(subscriber.full_name || '')}\n\n` +
    `${copy.introPlain(plotName, forecast.days || 7)}\n\n` +
    `${copy.openFullReport}\n${reportUrl}\n\n` +
    `${copy.forecastSummary}\n` +
    `- ${copy.tempLabel}: ${fmtTemp(tempMin, prefs.us)}–${fmtTemp(tempMax, prefs.us)} ${copy.tempUnit} (${deltaLine(tempMax, history.tempMax, 1, ` ${copy.tempUnit}${copy.maxSuffix}`, copy, toTemp)})\n` +
    `- ${copy.vpdLabel}: ${value(vpdMin, 2)}–${value(vpdMax, 2)} kPa\n` +
    `- ${copy.et0Label}: ${fmtMm(et0Total, prefs.us, mmDec)} ${copy.depthUnit} (${deltaLine(et0Total, history.et0Total, mmDec, ` ${copy.depthUnit}`, copy, toMm)})\n` +
    `- ${copy.rainLabel}: ${fmtMm(rainTotal, prefs.us, mmDec)} ${copy.depthUnit} (${deltaLine(rainTotal, history.rainTotal, mmDec, ` ${copy.depthUnit}`, copy, toMm)})\n\n` +
    `${copy.vsHistory(history.days || 0)}\n` +
    `- ${copy.histTemp}: ${fmtTemp(history.tempMin, prefs.us)}–${fmtTemp(history.tempMax, prefs.us)} ${copy.tempUnit}\n` +
    `- ${copy.histRainEto}: ${fmtMm(history.rainTotal, prefs.us, mmDec)} ${copy.depthUnit} | ${copy.histEtoShort}: ${fmtMm(history.et0Total, prefs.us, mmDec)} ${copy.depthUnit}\n\n` +
    `${plainDays}\n\n` +
    `${copy.disclaimer}\n\n` +
    `${copy.editOrStop}\n${reportUrl}\n` +
    `${copy.stopHowTo}\n\n` +
    `NutriPlant PRO\nhttps://nutriplantpro.com/\n`;

  const logoWhite = 'https://nutriplantpro.com/assets/NutriPlant_PRO_white.png';
  const logoBlue = 'https://nutriplantpro.com/assets/NutriPlant_PRO_blue.png';
  const helloName =
    prefs.language === 'en'
      ? `Hello <strong>${escapeHtml(subscriber.full_name)}</strong>, ${copy.introHtml}`
      : `Hola <strong>${escapeHtml(subscriber.full_name)}</strong>, ${copy.introHtml}`;

  const html = `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:820px;margin:0 auto;padding:18px;">
      <div style="background:#0c4a6e;padding:22px;border-radius:14px 14px 0 0;">
        <a href="https://nutriplantpro.com/" style="text-decoration:none;">
          <img src="${logoWhite}" alt="NutriPlant PRO" width="200" height="48" style="display:block;height:48px;width:auto;max-width:220px;margin:0 0 14px;border:0;outline:none;">
        </a>
        <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#ffffff;font-weight:800;">NutriPlant PRO</div>
        <h1 style="margin:6px 0 4px;font-size:25px;color:#ffffff;font-weight:800;">${escapeHtml(copy.heading)}</h1>
        <p style="margin:0;color:#ffffff;font-size:15px;font-weight:700;">${escapeHtml(plotName)}</p>
      </div>
      <div style="background:#fff;padding:20px;border:1px solid #dbeafe;border-top:0;border-radius:0 0 14px 14px;">
        <p style="margin:0 0 10px;font-size:15px;line-height:1.5;">${helloName}</p>
        <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.5;">${escapeHtml(copy.openHint)}</p>
        <p style="text-align:center;margin:0 0 18px;">
          <a href="${escapeHtml(reportUrl)}" style="display:inline-block;padding:12px 18px;border-radius:9px;background:#16a34a;color:#fff;text-decoration:none;font-weight:700;">${escapeHtml(copy.ctaFull)}</a>
        </p>

        <div style="margin:0 0 12px;padding:12px 14px;border-radius:10px;background:#0c4a6e;text-align:center;">
          <div style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:.02em;">${escapeHtml(copy.forecastBadge)}</div>
          <div style="font-size:13px;font-weight:700;color:#ffffff;margin-top:4px;">${escapeHtml(copy.forecastSub(forecast.days || 7, history.days || 0))}</div>
        </div>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0 8px;margin:0 0 8px;">
          <tr>
            <td style="padding:12px;border-radius:9px;background:#f0f9ff;border:1px solid #bfdbfe;">
              <div style="color:#0369a1;font-weight:800;font-size:12px;">${escapeHtml(copy.tempCard)}</div>
              <div style="font-size:20px;font-weight:800;margin:4px 0;">${fmtTemp(tempMin, prefs.us)}–${fmtTemp(tempMax, prefs.us)} ${copy.tempUnit}</div>
              <div style="font-size:11px;color:#475569;">${escapeHtml(deltaLine(tempMax, history.tempMax, 1, ` ${copy.tempUnit}${copy.maxSuffix}`, copy, toTemp))}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:12px;border-radius:9px;background:#f5f3ff;border:1px solid #ddd6fe;">
              <div style="color:#6d28d9;font-weight:800;font-size:12px;">${escapeHtml(copy.vpdCard)}</div>
              <div style="font-size:20px;font-weight:800;margin:4px 0;">${value(vpdMin, 2)}–${value(vpdMax, 2)} kPa</div>
              <div style="font-size:11px;color:#475569;">${escapeHtml(copy.histPrefix)} ${value(history.vpdMin, 2)}–${value(history.vpdMax, 2)} kPa</div>
            </td>
          </tr>
          <tr>
            <td style="padding:12px;border-radius:9px;background:#ecfdf5;border:1px solid #a7f3d0;">
              <div style="color:#0f766e;font-weight:800;font-size:12px;">${escapeHtml(copy.et0Card)}</div>
              <div style="font-size:20px;font-weight:800;margin:4px 0;">${fmtMm(et0Total, prefs.us, mmDec)} ${copy.depthUnit}</div>
              <div style="font-size:11px;color:#475569;">${escapeHtml(deltaLine(et0Total, history.et0Total, mmDec, ` ${copy.depthUnit}`, copy, toMm))}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:12px;border-radius:9px;background:#f0fdf4;border:1px solid #bbf7d0;">
              <div style="color:#166534;font-weight:800;font-size:12px;">${escapeHtml(copy.rainCard)}</div>
              <div style="font-size:20px;font-weight:800;margin:4px 0;">${fmtMm(rainTotal, prefs.us, mmDec)} ${copy.depthUnit}</div>
              <div style="font-size:11px;color:#475569;">${escapeHtml(deltaLine(rainTotal, history.rainTotal, mmDec, ` ${copy.depthUnit}`, copy, toMm))}</div>
            </td>
          </tr>
        </table>

        <p style="margin:14px 0 8px;font-size:15px;font-weight:800;color:#0c4a6e;">${escapeHtml(copy.tableTitle)}</p>
        <p style="margin:0 0 10px;font-size:12px;color:#64748b;">${escapeHtml(copy.tableHint)}</p>
        ${forecastCompactTable(rows, prefs, copy)}

        <p style="margin:16px 0 0;color:#64748b;font-size:12px;line-height:1.5;">${escapeHtml(copy.footnote)}</p>
        <p style="margin:14px 0 0;font-size:13px;"><a href="${escapeHtml(reportUrl)}" style="color:#0369a1;font-weight:700;">${escapeHtml(copy.editLink)}</a></p>
        <p style="margin:6px 0 0;font-size:12px;line-height:1.45;color:#64748b;">${copy.stopHtml}</p>
        <hr style="border:0;border-top:1px solid #e2e8f0;margin:20px 0 16px;">
        <p style="margin:0;text-align:center;line-height:1.45;">
          <a href="https://nutriplantpro.com/" style="text-decoration:none;">
            <img src="${logoBlue}" alt="NutriPlant PRO" width="160" height="38" style="display:inline-block;height:38px;width:auto;max-width:180px;margin:0 0 8px;border:0;outline:none;">
          </a><br>
          <a href="https://nutriplantpro.com/" style="color:#1d4ed8;font-size:16px;font-weight:800;text-decoration:none;letter-spacing:.01em;">NutriPlant PRO</a><br>
          <a href="https://nutriplantpro.com/" style="color:#2563eb;font-size:13px;font-weight:600;text-decoration:none;">https://nutriplantpro.com/</a>
        </p>
      </div>
    </div>
  </body></html>`;
  return { subject, text, html };
}

function smtpEnv(name, legacyName, fallback = '') {
  return String(process.env[name] || process.env[legacyName] || fallback).trim();
}

function createTransport() {
  // Prefer NUTRIPLANT_SMTP_*; keep PLAN_PRO_SMTP_* as fallback for existing Netlify env.
  const user = smtpEnv('NUTRIPLANT_SMTP_USER', 'PLAN_PRO_SMTP_USER');
  const pass = smtpEnv('NUTRIPLANT_SMTP_PASS', 'PLAN_PRO_SMTP_PASS');
  if (!user || !pass) throw new Error('smtp_not_configured');
  const host = smtpEnv('NUTRIPLANT_SMTP_HOST', 'PLAN_PRO_SMTP_HOST', 'smtp.office365.com');
  const port = Number(smtpEnv('NUTRIPLANT_SMTP_PORT', 'PLAN_PRO_SMTP_PORT', '587') || 587);
  return {
    user,
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port === 587,
      auth: { user, pass },
      tls: { minVersion: 'TLSv1.2' }
    })
  };
}

async function sendAgroclimateEmail(input) {
  const { user, transporter } = createTransport();
  const content = buildEmail(input);
  const fromEmail = String(
    process.env.AGROCLIMATE_EMAIL_FROM || 'notifications@nutriplantpro.com'
  ).trim();
  const fromName = String(
    process.env.AGROCLIMATE_EMAIL_NAME || 'NutriPlant | Alertas Agroclimáticas'
  ).trim();
  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: input.subscriber.email,
    subject: content.subject,
    text: content.text,
    html: content.html
  });
  return {
    messageId: info.messageId || null,
    accepted: info.accepted || [],
    rejected: info.rejected || [],
    subject: content.subject
  };
}

/** Append language/unit prefs so the personal report opens with the subscriber's display settings. */
function reportUrlWithPrefs(reportUrl, subscriber) {
  const prefs = subscriberPrefs(subscriber);
  const raw = String(reportUrl || '');
  try {
    const absolute = /^https?:\/\//i.test(raw);
    const u = absolute ? new URL(raw) : new URL(raw, 'https://example.invalid');
    u.searchParams.set('lang', prefs.language);
    u.searchParams.set('units', prefs.unitSystem);
    if (absolute) return u.toString();
    return `${u.pathname}${u.search}${u.hash}`;
  } catch (_) {
    const sep = raw.includes('?') ? '&' : '?';
    return `${raw}${sep}lang=${encodeURIComponent(prefs.language)}&units=${encodeURIComponent(prefs.unitSystem)}`;
  }
}

module.exports = { buildEmail, sendAgroclimateEmail, subscriberPrefs, reportUrlWithPrefs };
