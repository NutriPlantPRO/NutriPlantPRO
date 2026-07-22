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

function forecastTable(rows) {
  const body = (rows || [])
    .filter((row) => row.kind === 'forecast')
    .map(
      (row) => `<tr>
        <td style="padding:8px;border:1px solid #dbeafe;font-weight:700;">${escapeHtml(dateLabel(row.date))}</td>
        <td style="padding:8px;border:1px solid #dbeafe;text-align:center;">${value(row.tempMin)}–${value(row.tempMax)} °C</td>
        <td style="padding:8px;border:1px solid #dbeafe;text-align:center;">${value(row.humidityMin, 0)}–${value(row.humidityMax, 0)} %</td>
        <td style="padding:8px;border:1px solid #dbeafe;text-align:center;">${value(row.vpdMin, 2)}–${value(row.vpdMax, 2)}</td>
        <td style="padding:8px;border:1px solid #dbeafe;text-align:center;">${value(row.et0)}</td>
        <td style="padding:8px;border:1px solid #dbeafe;text-align:center;">${value(row.etc)}</td>
        <td style="padding:8px;border:1px solid #dbeafe;text-align:center;">${value(row.rain)}</td>
      </tr>`
    )
    .join('');
  return `<div style="overflow-x:auto;">
    <table style="width:100%;min-width:680px;border-collapse:collapse;font:12px/1.4 Arial,sans-serif;">
      <thead><tr style="background:#dbeafe;color:#1e3a8a;">
        <th style="padding:8px;border:1px solid #93c5fd;text-align:left;">Día</th>
        <th style="padding:8px;border:1px solid #93c5fd;">Temperatura</th>
        <th style="padding:8px;border:1px solid #93c5fd;">Humedad</th>
        <th style="padding:8px;border:1px solid #93c5fd;">VPD kPa</th>
        <th style="padding:8px;border:1px solid #93c5fd;">ETo mm</th>
        <th style="padding:8px;border:1px solid #93c5fd;">ETc mm</th>
        <th style="padding:8px;border:1px solid #93c5fd;">Lluvia mm</th>
      </tr></thead>
      <tbody>${body}</tbody>
    </table>
  </div>`;
}

function buildEmail({ subscriber, plot, snapshot, reportUrl }) {
  const summary = snapshot.summary || {};
  const rows = snapshot.rows || [];
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
    `Este es el pronóstico agroclimático de tu predio (${plot.plot_name || 'Mi predio'}).\n\n` +
    `Ver reporte completo (tabla, gráfica, mapa y PDF):\n${reportUrl}\n\n` +
    `Resumen: temperatura ${value(summary.tempMin)}–${value(summary.tempMax)} °C; ` +
    `VPD ${value(summary.vpdMin, 2)}–${value(summary.vpdMax, 2)} kPa; ` +
    `ETo ${value(summary.et0Total)} mm; ETc ${value(summary.etcTotal)} mm; ` +
    `lluvia ${value(summary.rainTotal)} mm.\n\n${plainDays}\n\n` +
    `Pronóstico estimado para las coordenadas registradas. Valida las condiciones en campo.\n\n` +
    `Editar predio o dejar de recibir alertas:\n${reportUrl}\n\n` +
    `NutriPlant PRO\nhttps://nutriplantpro.com/\n`;

  const html = `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:820px;margin:0 auto;padding:18px;">
      <div style="background:linear-gradient(125deg,#075985,#0284c7 60%,#0d9488);padding:22px;border-radius:14px 14px 0 0;color:#fff;">
        <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#bae6fd;">NutriPlant PRO</div>
        <h1 style="margin:6px 0 4px;font-size:25px;">Pronóstico agroclimático</h1>
        <p style="margin:0;color:#e0f2fe;">${escapeHtml(plot.plot_name || 'Mi predio')}</p>
      </div>
      <div style="background:#fff;padding:20px;border:1px solid #dbeafe;border-top:0;border-radius:0 0 14px 14px;">
        <p style="margin:0 0 10px;font-size:15px;line-height:1.5;">Hola <strong>${escapeHtml(subscriber.full_name)}</strong>, aquí tienes el pronóstico de tu predio para los próximos días.</p>
        <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.5;">Abre el enlace para ver la tabla completa, la gráfica, el mapa y descargar el PDF.</p>
        <p style="text-align:center;margin:0 0 18px;">
          <a href="${escapeHtml(reportUrl)}" style="display:inline-block;padding:12px 18px;border-radius:9px;background:#16a34a;color:#fff;text-decoration:none;font-weight:700;">Ver reporte completo</a>
        </p>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:18px;">
          <div style="padding:10px;border-radius:9px;background:#f0f9ff;"><small>Temperatura</small><br><strong>${value(summary.tempMin)}–${value(summary.tempMax)} °C</strong></div>
          <div style="padding:10px;border-radius:9px;background:#f5f3ff;"><small>VPD</small><br><strong>${value(summary.vpdMin, 2)}–${value(summary.vpdMax, 2)} kPa</strong></div>
          <div style="padding:10px;border-radius:9px;background:#f0fdf4;"><small>Lluvia</small><br><strong>${value(summary.rainTotal)} mm</strong></div>
        </div>
        ${forecastTable(rows)}
        <p style="margin:16px 0 0;color:#64748b;font-size:12px;line-height:1.5;">Pronóstico meteorológico estimado para las coordenadas registradas. La temperatura de hoja y el VPD son orientativos; valida el microclima en campo.</p>
        <p style="margin:14px 0 0;font-size:12px;color:#64748b;"><a href="${escapeHtml(reportUrl)}" style="color:#0369a1;">Editar predio o dejar de recibir alertas</a></p>
        <hr style="border:0;border-top:1px solid #e2e8f0;margin:20px 0 16px;">
        <p style="margin:0;text-align:center;line-height:1.45;">
          <a href="https://nutriplantpro.com/" style="color:#1d4ed8;font-size:18px;font-weight:800;text-decoration:none;letter-spacing:.01em;">NutriPlant PRO</a><br>
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
