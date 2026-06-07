'use strict';

const crypto = require('crypto');

const DEFAULT_TTL_SEC = 30 * 60;

function ticketSecret() {
  return (
    (process.env.NUTRI_PRO_UPLOAD_TICKET_SECRET || '').trim() ||
    (process.env.NUTRIPLANT_ADMIN_GPT_TOKEN || '').trim() ||
    (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  );
}

function b64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function b64urlDecode(str) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

function signNutriProUploadTicket(payload) {
  const secret = ticketSecret();
  if (!secret) throw new Error('Falta NUTRI_PRO_UPLOAD_TICKET_SECRET o NUTRIPLANT_ADMIN_GPT_TOKEN en Netlify.');
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret).update(body).digest();
  return body + '.' + b64url(sig);
}

function verifyNutriProUploadTicket(token) {
  const secret = ticketSecret();
  if (!secret) return { ok: false, error: 'Ticket secret no configurado en el servidor.' };
  const raw = String(token || '').trim();
  if (!raw || raw.indexOf('.') < 0) return { ok: false, error: 'Ticket inválido.' };
  const parts = raw.split('.');
  if (parts.length !== 2) return { ok: false, error: 'Ticket mal formado.' };
  const body = parts[0];
  const sig = parts[1];
  const expected = b64url(crypto.createHmac('sha256', secret).update(body).digest());
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { ok: false, error: 'Firma de ticket inválida.' };
    }
  } catch (e) {
    return { ok: false, error: 'Firma de ticket inválida.' };
  }
  let payload;
  try {
    payload = JSON.parse(b64urlDecode(body).toString('utf8'));
  } catch (eJson) {
    return { ok: false, error: 'Ticket corrupto.' };
  }
  const exp = parseInt(payload.exp, 10) || 0;
  if (!exp || Date.now() / 1000 > exp) {
    return { ok: false, error: 'El enlace expiró. Pide uno nuevo a tu GPT (nutri_pro_upload_link).' };
  }
  if (!payload.upload_id || !payload.owner_id) {
    return { ok: false, error: 'Ticket incompleto.' };
  }
  return { ok: true, payload };
}

function buildUploadTicketPayload(opts) {
  opts = opts || {};
  const ttlSec = Math.min(Math.max(parseInt(opts.ttl_sec, 10) || DEFAULT_TTL_SEC, 300), 7200);
  const now = Math.floor(Date.now() / 1000);
  return {
    upload_id: opts.upload_id,
    owner_id: opts.owner_id,
    folder_id: opts.folder_id || null,
    folder_path: opts.folder_path || 'Raíz',
    title_hint: opts.title_hint || null,
    suggested_filename: opts.suggested_filename || null,
    iat: now,
    exp: now + ttlSec
  };
}

module.exports = {
  DEFAULT_TTL_SEC,
  signNutriProUploadTicket,
  verifyNutriProUploadTicket,
  buildUploadTicketPayload
};
