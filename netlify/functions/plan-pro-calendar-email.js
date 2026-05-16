/**
 * Plan PRO → autoinvitaciones de calendario por correo (Microsoft 365 / Outlook).
 *
 * Envía desde y hacia el mismo buzón (p. ej. admin@nutriplantpro.com) invitaciones
 * text/calendar METHOD:REQUEST para Aceptar / Rechazar en Outlook.
 *
 * Variables Netlify (obligatorias para envío):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   PLAN_PRO_SMTP_USER          — admin@nutriplantpro.com
 *   PLAN_PRO_SMTP_PASS          — contraseña de aplicación Microsoft 365
 *
 * Opcionales:
 *   PLAN_PRO_SMTP_HOST          — default smtp.office365.com
 *   PLAN_PRO_SMTP_PORT          — default 587
 *   PLAN_PRO_CALENDAR_FROM      — default PLAN_PRO_SMTP_USER
 *   PLAN_PRO_CALENDAR_TO        — default PLAN_PRO_SMTP_USER
 *   PLAN_PRO_CALENDAR_ORGANIZER — nombre visible del organizador (default "Plan PRO")
 *
 * Body JSON:
 *   scope: "day" | "week" | "month"
 *   dateKey?: "YYYY-MM-DD" (day / week)
 *   year?: number, month?: 0-11 (month, mes del calendario lateral)
 *   entries: [{ dateKey, itemTitle, rowTitle, catPath, blockTitle, kind, level, itemId }]
 *
 * Cabecera Authorization: Bearer <access_token Supabase>
 */

const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

const MAX_EVENTS = 120;

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
}

function jsonResponse(statusCode, body) {
  return { statusCode, headers: corsHeaders(), body: JSON.stringify(body) };
}

function escapeIcs(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n/g, '\\n')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

function icsStampUtc(d = new Date()) {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function addDaysToDateKey(dateKey, days) {
  const p = String(dateKey).split('-').map(Number);
  if (p.length !== 3) return dateKey;
  const dt = new Date(p[0], p[1] - 1, p[2]);
  dt.setDate(dt.getDate() + days);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function compareDateKeys(a, b) {
  return String(a).localeCompare(String(b));
}

function weekRangeMonday(dateKey) {
  const p = String(dateKey).split('-').map(Number);
  if (p.length !== 3) return { start: dateKey, end: dateKey };
  const dt = new Date(p[0], p[1] - 1, p[2]);
  const dow = dt.getDay();
  const mondayOffset = (dow + 6) % 7;
  const start = new Date(dt);
  start.setDate(dt.getDate() - mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (x) => {
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, '0');
    const d = String(x.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  return { start: fmt(start), end: fmt(end) };
}

function filterEntries(scope, entries, opts) {
  const list = Array.isArray(entries) ? entries : [];
  const s = String(scope || 'month').toLowerCase();
  if (s === 'day') {
    const dk = String(opts.dateKey || '').trim();
    if (!dk) return [];
    return list.filter((e) => e && e.dateKey === dk);
  }
  if (s === 'week') {
    const dk = String(opts.dateKey || '').trim();
    if (!dk) return [];
    const range = weekRangeMonday(dk);
    return list.filter(
      (e) => e && e.dateKey && compareDateKeys(e.dateKey, range.start) >= 0 && compareDateKeys(e.dateKey, range.end) <= 0
    );
  }
  if (s === 'month') {
    const y = Number(opts.year);
    const m0 = Number(opts.month);
    if (!Number.isFinite(y) || !Number.isFinite(m0) || m0 < 0 || m0 > 11) return list;
    const prefix = `${y}-${String(m0 + 1).padStart(2, '0')}-`;
    return list.filter((e) => e && e.dateKey && String(e.dateKey).startsWith(prefix));
  }
  return list;
}

function buildEventDescription(ent) {
  const lines = [
    ent.rowTitle || 'Plan PRO',
    ent.kind === 'table_row' ? `Tabla: ${ent.blockTitle || '—'}` : 'Objetivo del apunte',
    `Apunte: ${ent.itemTitle || '—'}`,
    `Rama: ${ent.catPath || '—'}`
  ];
  return lines.join('\n');
}

function buildIcsCalendar(events, organizerEmail, organizerName) {
  const org = String(organizerEmail).trim().toLowerCase();
  const orgName = escapeIcs(organizerName || 'Plan PRO');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NutriPlant PRO//Plan PRO//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST'
  ];
  const stamp = icsStampUtc();
  events.forEach((ent, idx) => {
    const dk = String(ent.dateKey || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dk)) return;
    const uid = `planpro-${ent.itemId || 'x'}-${dk}-${ent.kind || 'e'}-${idx}@nutriplantpro.com`;
    const summary = escapeIcs(
      ent.rowTitle && ent.rowTitle !== '—' ? ent.rowTitle : ent.itemTitle || 'Plan PRO'
    );
    const desc = escapeIcs(buildEventDescription(ent));
    const dtEnd = addDaysToDateKey(dk, 1).replace(/-/g, '');
    const dtStart = dk.replace(/-/g, '');
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
    lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
    lines.push(`SUMMARY:${summary}`);
    lines.push(`DESCRIPTION:${desc}`);
    lines.push(`ORGANIZER;CN=${orgName}:mailto:${org}`);
    lines.push(
      `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${orgName}:mailto:${org}`
    );
    lines.push('STATUS:CONFIRMED');
    lines.push('SEQUENCE:0');
    lines.push('TRANSP:TRANSPARENT');
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function scopeLabel(scope, opts, count) {
  const s = String(scope || 'month').toLowerCase();
  if (s === 'day' && opts.dateKey) return `día ${opts.dateKey} (${count} evento${count === 1 ? '' : 's'})`;
  if (s === 'week' && opts.dateKey) {
    const r = weekRangeMonday(opts.dateKey);
    return `semana ${r.start} – ${r.end} (${count})`;
  }
  if (s === 'month' && Number.isFinite(opts.year) && Number.isFinite(opts.month)) {
    const months = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre'
    ];
    return `${months[opts.month]} ${opts.year} (${count})`;
  }
  return `${count} evento${count === 1 ? '' : 's'}`;
}

function buildHtmlList(events) {
  const items = events
    .slice(0, 40)
    .map((e) => {
      const title = e.rowTitle && e.rowTitle !== '—' ? e.rowTitle : e.itemTitle || 'Plan PRO';
      return `<li><strong>${title}</strong> · ${e.dateKey} · ${e.itemTitle || ''}</li>`;
    })
    .join('');
  const more =
    events.length > 40 ? `<p style="color:#64748b;font-size:13px;">…y ${events.length - 40} más en el calendario adjunto.</p>` : '';
  return `<ul style="margin:0;padding-left:20px;line-height:1.5;">${items}</ul>${more}`;
}

async function verifyAdmin(supabase, accessToken) {
  const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken);
  if (userErr || !userData?.user?.id) {
    return { ok: false, status: 401, error: 'Token inválido o expirado.' };
  }
  const userId = userData.user.id;
  const { data: prof, error: profErr } = await supabase
    .from('profiles')
    .select('is_admin, email')
    .eq('id', userId)
    .maybeSingle();
  if (profErr || !prof?.is_admin) {
    return { ok: false, status: 403, error: 'Solo administrador puede enviar la agenda.' };
  }
  return { ok: true, userId, email: prof.email || userData.user.email || '' };
}

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Método no permitido' });
  }

  let body = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch (e) {
    return jsonResponse(400, { error: 'JSON inválido' });
  }

  const authHeader = (event.headers && (event.headers.Authorization || event.headers.authorization)) || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const accessToken = (body.access_token && String(body.access_token).trim()) || bearer;
  if (!accessToken) {
    return jsonResponse(401, { error: 'Falta sesión (Authorization: Bearer).' });
  }

  const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse(500, { error: 'Supabase no configurado en el servidor.' });
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  const adminCheck = await verifyAdmin(supabase, accessToken);
  if (!adminCheck.ok) {
    return jsonResponse(adminCheck.status, { error: adminCheck.error });
  }

  const smtpUser = (process.env.PLAN_PRO_SMTP_USER || '').trim();
  const smtpPass = (process.env.PLAN_PRO_SMTP_PASS || '').trim();
  if (!smtpUser || !smtpPass) {
    return jsonResponse(503, {
      error: 'smtp_not_configured',
      message:
        'Correo Outlook no configurado en Netlify. Añade PLAN_PRO_SMTP_USER y PLAN_PRO_SMTP_PASS (contraseña de aplicación Microsoft 365).'
    });
  }

  const scope = String(body.scope || 'month').toLowerCase();
  if (!['day', 'week', 'month'].includes(scope)) {
    return jsonResponse(400, { error: 'scope debe ser day, week o month.' });
  }

  const opts = {
    dateKey: body.dateKey != null ? String(body.dateKey).trim() : '',
    year: body.year != null ? Number(body.year) : undefined,
    month: body.month != null ? Number(body.month) : undefined
  };

  let filtered = filterEntries(scope, body.entries, opts);
  filtered = filtered
    .filter((e) => e && e.dateKey)
    .sort((a, b) => compareDateKeys(a.dateKey, b.dateKey) || String(a.rowTitle || '').localeCompare(String(b.rowTitle || '')));

  if (!filtered.length) {
    return jsonResponse(400, {
      error: 'no_events',
      message: 'No hay fechas en ese rango para enviar. Añade objetivos o filas con fecha en tus apuntes.'
    });
  }
  if (filtered.length > MAX_EVENTS) {
    return jsonResponse(400, {
      error: 'too_many_events',
      message: `Demasiados eventos (${filtered.length}). Máximo ${MAX_EVENTS}; usa un rango más corto.`
    });
  }

  const fromEmail = (process.env.PLAN_PRO_CALENDAR_FROM || smtpUser).trim();
  const toEmail = (process.env.PLAN_PRO_CALENDAR_TO || smtpUser).trim();
  const organizerName = (process.env.PLAN_PRO_CALENDAR_ORGANIZER || 'Plan PRO').trim();
  const host = (process.env.PLAN_PRO_SMTP_HOST || 'smtp.office365.com').trim();
  const port = Number(process.env.PLAN_PRO_SMTP_PORT || 587);

  const ics = buildIcsCalendar(filtered, fromEmail, organizerName);
  const label = scopeLabel(scope, opts, filtered.length);
  const subject = `Plan PRO · Agenda (${label})`;

  const textLines = filtered.map((e) => {
    const title = e.rowTitle && e.rowTitle !== '—' ? e.rowTitle : e.itemTitle;
    return `• ${e.dateKey} — ${title} (${e.itemTitle || ''})`;
  });
  const textBody =
    `Agenda Plan PRO (${label})\n\n` +
    textLines.join('\n') +
    '\n\nAbre la invitación en Outlook y pulsa Aceptar para añadir al calendario.\n';

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: { user: smtpUser, pass: smtpPass },
    tls: { minVersion: 'TLSv1.2' }
  });

  try {
    await transporter.sendMail({
      from: `"${organizerName}" <${fromEmail}>`,
      to: toEmail,
      subject,
      text: textBody,
      html:
        `<p>Agenda <strong>Plan PRO</strong> (${label}).</p>` +
        buildHtmlList(filtered) +
        '<p style="margin-top:16px;color:#475569;font-size:14px;">En Outlook usa <strong>Aceptar</strong> en la invitación para añadir los eventos a tu calendario, o <strong>Rechazar</strong> para ignorarlos.</p>',
      alternatives: [
        {
          contentType: 'text/calendar; charset=UTF-8; method=REQUEST',
          content: ics
        }
      ]
    });
  } catch (mailErr) {
    console.error('plan-pro-calendar-email SMTP:', mailErr);
    const msg = mailErr && mailErr.message ? mailErr.message : 'Error al enviar correo';
    const hint =
      msg.toLowerCase().includes('authentication') || msg.toLowerCase().includes('auth')
        ? ' Revisa contraseña de aplicación y que SMTP AUTH esté activo en Microsoft 365 para este buzón.'
        : '';
    return jsonResponse(502, { error: 'smtp_failed', message: msg + hint });
  }

  return jsonResponse(200, {
    ok: true,
    sent: filtered.length,
    to: toEmail,
    scope,
    message: `Enviadas ${filtered.length} invitación(es) a ${toEmail}. Revisa Outlook (y spam si no aparece).`
  });
};
