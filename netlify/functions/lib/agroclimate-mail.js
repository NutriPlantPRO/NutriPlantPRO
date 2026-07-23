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

function dateLabel(iso) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Intl.DateTimeFormat('es-MX', {
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

function deltaLine(forecastVal, historyVal, decimals = 1, unit = '') {
  const f = numberOrNull(forecastVal);
  const h = numberOrNull(historyVal);
  if (f == null || h == null) return 'Sin histórico de la semana anterior';
  const diff = f - h;
  const sign = diff > 0 ? '+' : '';
  return `Histórico, semana anterior ${value(h, decimals)}${unit} · Δ ${sign}${value(diff, decimals)}${unit}`;
}

function forecastCompactTable(rows) {
  const forecast = (rows || []).filter((row) => row.kind === 'forecast');
  if (!forecast.length) return '<p style="color:#64748b;font-size:13px;">Sin días de pronóstico.</p>';
  const th =
    'padding:7px 4px;font-size:10px;font-weight:800;text-align:center;border:1px solid #93c5fd;background:#e0f2fe;color:#0c4a6e;line-height:1.25;';
  const td =
    'padding:7px 4px;font-size:11px;text-align:center;border:1px solid #bfdbfe;vertical-align:middle;line-height:1.3;color:#0f172a;';
  const body = forecast
    .map(
      (row) => `<tr>
        <td style="${td}text-align:left;font-weight:800;color:#0c4a6e;white-space:nowrap;">${escapeHtml(dateLabel(row.date))}</td>
        <td style="${td}"><span style="color:#ea580c;">${value(row.tempMin)}</span>–<span style="color:#c2410c;font-weight:800;">${value(row.tempMax)}</span></td>
        <td style="${td}"><span style="color:#0284c7;">${value(row.humidityMin, 0)}</span>–<span style="color:#0369a1;font-weight:800;">${value(row.humidityMax, 0)}</span></td>
        <td style="${td}"><span style="color:#7c3aed;">${value(row.vpdMin, 2)}</span>–<span style="color:#6d28d9;font-weight:800;">${value(row.vpdMax, 2)}</span></td>
        <td style="${td}"><span style="color:#0f766e;font-weight:700;">${value(row.et0)}</span> / <span style="color:#15803d;font-weight:700;">${value(row.etc)}</span> / <span style="color:#1d4ed8;font-weight:800;">${value(row.rain)}</span></td>
      </tr>`
    )
    .join('');
  // Tabla angosta (5 cols) pensada para celular: rangos en una celda, agua en ETo/ETc/Lluvia.
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:100%;border-collapse:collapse;table-layout:fixed;">
      <thead>
        <tr>
          <th style="${th}width:22%;">Día</th>
          <th style="${th}width:18%;">T °C<br>mín–máx</th>
          <th style="${th}width:16%;">HR %<br>mín–máx</th>
          <th style="${th}width:18%;">VPD<br>mín–máx</th>
          <th style="${th}width:26%;">mm<br>ETo / ETc / Lluvia</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>`;
}

function buildEmail({ subscriber, plot, snapshot, reportUrl }) {
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

  const subject = `Pronóstico Agroclimático NutriPlant — ${plot.plot_name || 'Mi predio'}`;
  const plainDays = rows
    .filter((row) => row.kind === 'forecast')
    .map(
      (row) =>
        `${dateLabel(row.date)}: T ${value(row.tempMin)}–${value(row.tempMax)} °C | ` +
        `HR ${value(row.humidityMin, 0)}–${value(row.humidityMax, 0)} % | ` +
        `VPD ${value(row.vpdMin, 2)}–${value(row.vpdMax, 2)} kPa | ` +
        `ETo ${value(row.et0)} mm | ETc ${value(row.etc)} mm | Lluvia ${value(row.rain)} mm`
    )
    .join('\n');
  const text =
    `Hola ${subscriber.full_name || ''},\n\n` +
    `PRONÓSTICO agroclimático de tu predio (${plot.plot_name || 'Mi predio'}) — próximos ${forecast.days || 7} días.\n\n` +
    `Ver reporte completo (tabla, gráfica, mapa y PDF):\n${reportUrl}\n\n` +
    `Resumen del PRONÓSTICO:\n` +
    `- Temperatura mín–máx: ${value(tempMin)}–${value(tempMax)} °C (${deltaLine(tempMax, history.tempMax, 1, ' °C máx')})\n` +
    `- VPD mín–máx: ${value(vpdMin, 2)}–${value(vpdMax, 2)} kPa\n` +
    `- ETo acumulada: ${value(et0Total)} mm (${deltaLine(et0Total, history.et0Total, 1, ' mm')})\n` +
    `- Lluvia acumulada: ${value(rainTotal)} mm (${deltaLine(rainTotal, history.rainTotal, 1, ' mm')})\n\n` +
    `Comparación vs histórico, semana anterior (${history.days || 0} d):\n` +
    `- Histórico, semana anterior T: ${value(history.tempMin)}–${value(history.tempMax)} °C\n` +
    `- Histórico, semana anterior lluvia acum.: ${value(history.rainTotal)} mm | ETo acum.: ${value(history.et0Total)} mm\n\n` +
    `${plainDays}\n\n` +
    `Pronóstico estimado para las coordenadas registradas. Valida las condiciones en campo.\n\n` +
    `Editar predio / Kc o dejar de recibir alertas:\n${reportUrl}\n` +
    `Para dejar de recibir alertas: abre ese enlace y en la página usa el botón verde de WhatsApp («Dejar de recibir alertas») para enviarnos el mensaje.\n\n` +
    `NutriPlant PRO\nhttps://nutriplantpro.com/\n`;

  const logoWhite = 'https://nutriplantpro.com/assets/NutriPlant_PRO_white.png';
  const logoBlue = 'https://nutriplantpro.com/assets/NutriPlant_PRO_blue.png';

  const html = `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:820px;margin:0 auto;padding:18px;">
      <div style="background:#0c4a6e;padding:22px;border-radius:14px 14px 0 0;">
        <a href="https://nutriplantpro.com/" style="text-decoration:none;">
          <img src="${logoWhite}" alt="NutriPlant PRO" width="200" height="48" style="display:block;height:48px;width:auto;max-width:220px;margin:0 0 14px;border:0;outline:none;">
        </a>
        <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#ffffff;font-weight:800;">NutriPlant PRO</div>
        <h1 style="margin:6px 0 4px;font-size:25px;color:#ffffff;font-weight:800;">Pronóstico agroclimático</h1>
        <p style="margin:0;color:#ffffff;font-size:15px;font-weight:700;">${escapeHtml(plot.plot_name || 'Mi predio')}</p>
      </div>
      <div style="background:#fff;padding:20px;border:1px solid #dbeafe;border-top:0;border-radius:0 0 14px 14px;">
        <p style="margin:0 0 10px;font-size:15px;line-height:1.5;">Hola <strong>${escapeHtml(subscriber.full_name)}</strong>, aquí tienes el pronóstico de tu predio para los próximos días.</p>
        <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.5;">Abre el enlace para ver la tabla completa, la gráfica, el mapa y descargar el PDF.</p>
        <p style="text-align:center;margin:0 0 18px;">
          <a href="${escapeHtml(reportUrl)}" style="display:inline-block;padding:12px 18px;border-radius:9px;background:#16a34a;color:#fff;text-decoration:none;font-weight:700;">Ver reporte completo</a>
        </p>

        <div style="margin:0 0 12px;padding:12px 14px;border-radius:10px;background:#0c4a6e;text-align:center;">
          <div style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:.02em;">PRONÓSTICO</div>
          <div style="font-size:13px;font-weight:700;color:#ffffff;margin-top:4px;">Próximos ${forecast.days || 7} días · vs histórico, semana anterior (${history.days || 0} d)</div>
        </div>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0 8px;margin:0 0 8px;">
          <tr>
            <td style="padding:12px;border-radius:9px;background:#f0f9ff;border:1px solid #bfdbfe;">
              <div style="color:#0369a1;font-weight:800;font-size:12px;">Temperatura · mín–máx</div>
              <div style="font-size:20px;font-weight:800;margin:4px 0;">${value(tempMin)}–${value(tempMax)} °C</div>
              <div style="font-size:11px;color:#475569;">${escapeHtml(deltaLine(tempMax, history.tempMax, 1, ' °C máx'))}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:12px;border-radius:9px;background:#f5f3ff;border:1px solid #ddd6fe;">
              <div style="color:#6d28d9;font-weight:800;font-size:12px;">VPD · mín–máx</div>
              <div style="font-size:20px;font-weight:800;margin:4px 0;">${value(vpdMin, 2)}–${value(vpdMax, 2)} kPa</div>
              <div style="font-size:11px;color:#475569;">Histórico, semana anterior ${value(history.vpdMin, 2)}–${value(history.vpdMax, 2)} kPa</div>
            </td>
          </tr>
          <tr>
            <td style="padding:12px;border-radius:9px;background:#ecfdf5;border:1px solid #a7f3d0;">
              <div style="color:#0f766e;font-weight:800;font-size:12px;">ETo · acumulada</div>
              <div style="font-size:20px;font-weight:800;margin:4px 0;">${value(et0Total)} mm</div>
              <div style="font-size:11px;color:#475569;">${escapeHtml(deltaLine(et0Total, history.et0Total, 1, ' mm'))}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:12px;border-radius:9px;background:#f0fdf4;border:1px solid #bbf7d0;">
              <div style="color:#166534;font-weight:800;font-size:12px;">Lluvia · acumulada</div>
              <div style="font-size:20px;font-weight:800;margin:4px 0;">${value(rainTotal)} mm</div>
              <div style="font-size:11px;color:#475569;">${escapeHtml(deltaLine(rainTotal, history.rainTotal, 1, ' mm'))}</div>
            </td>
          </tr>
        </table>

        <p style="margin:14px 0 8px;font-size:15px;font-weight:800;color:#0c4a6e;">Tabla del PRONÓSTICO</p>
        <p style="margin:0 0 10px;font-size:12px;color:#64748b;">Tabla compacta en el correo. Gráfica, histórico completo y PDF → «Ver reporte completo».</p>
        ${forecastCompactTable(rows)}

        <p style="margin:16px 0 0;color:#64748b;font-size:12px;line-height:1.5;">Pronóstico meteorológico estimado para las coordenadas registradas. La temperatura de hoja y el VPD son orientativos; valida el microclima en campo.</p>
        <p style="margin:14px 0 0;font-size:13px;"><a href="${escapeHtml(reportUrl)}" style="color:#0369a1;font-weight:700;">Editar predio / Kc o dejar de recibir alertas</a></p>
        <p style="margin:6px 0 0;font-size:12px;line-height:1.45;color:#64748b;">Para <strong>dejar de recibir alertas</strong>: abre el enlace, entra a tu reporte y envía el mensaje con el botón verde de <strong>WhatsApp</strong> («Dejar de recibir alertas»). El link del correo solo te lleva a la página; el aviso se manda desde ahí.</p>
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

module.exports = { buildEmail, sendAgroclimateEmail };
