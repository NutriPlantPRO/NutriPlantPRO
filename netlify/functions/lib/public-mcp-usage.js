'use strict';

const crypto = require('crypto');

function mexicoDay(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date || new Date());
}

function headerValue(event, name) {
  const headers = (event && event.headers) || {};
  const want = String(name || '').toLowerCase();
  const key = Object.keys(headers).find((k) => String(k).toLowerCase() === want);
  return key ? String(headers[key] || '').trim() : '';
}

/** Resumen estable. No guarda el id ni el correo. */
function actorHash(event, user) {
  let raw = '';
  if (user && user.userId) raw = 'acct:' + user.userId;
  else {
    const sid = headerValue(event, 'mcp-session-id');
    if (sid) raw = 'ses:' + sid.slice(0, 180);
  }
  if (!raw) return 'sin-sesion';
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

async function recordToolCall(event, user) {
  try {
    const url = (process.env.SUPABASE_URL || '').trim();
    const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    if (!url || !key) return;
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await sb.rpc('bump_chatgpt_public_usage', {
      p_day: mexicoDay(),
      p_actor: actorHash(event, user)
    });
    if (error) console.warn('chatgpt usage:', error.message);
  } catch (e) {
    console.warn('chatgpt usage:', e && e.message ? e.message : e);
  }
}

module.exports = { recordToolCall, actorHash, mexicoDay };
