/**
 * Verificación de PIN de 4 dígitos para Plan PRO y panel admin.
 * POST { scope, pin } → token firmado
 * GET ?scope=&action=required → { required }
 * GET ?scope=&token= → { ok }
 *
 * Netlify env:
 *   PLAN_PRO_ACCESS_PIN
 *   ADMIN_ACCESS_PIN
 *   NUTRIPLANT_PIN_TOKEN_SECRET (o usa PLAN_PRO_CALENDAR_FEED_TOKEN)
 */

const crypto = require('crypto');

const SCOPES = {
  plan_pro: 'PLAN_PRO_ACCESS_PIN',
  admin: 'ADMIN_ACCESS_PIN'
};

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}

function getSecret() {
  return (
    (process.env.NUTRIPLANT_PIN_TOKEN_SECRET || process.env.PLAN_PRO_CALENDAR_FEED_TOKEN || '').trim()
  );
}

function getExpectedPin(scope) {
  const envKey = SCOPES[scope];
  if (!envKey) return '';
  return String(process.env[envKey] || '').trim();
}

function signToken(scope, expiresAt) {
  const secret = getSecret();
  if (!secret) return '';
  const payload = `${scope}:${expiresAt}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function makeToken(scope) {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const sig = signToken(scope, expiresAt);
  if (!sig) return null;
  return { token: `${expiresAt}.${sig}`, expiresAt };
}

function verifyToken(scope, token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 2) return false;
  const expiresAt = parseInt(parts[0], 10);
  if (!expiresAt || Date.now() > expiresAt) return false;
  const expected = signToken(scope, expiresAt);
  if (!expected) return false;
  return parts[1] === expected;
}

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  const params = event.queryStringParameters || {};

  if (event.httpMethod === 'GET') {
    const scope = params.scope;
    if (!scope || !SCOPES[scope]) {
      return json(400, { ok: false, error: 'scope_invalido' });
    }
    if (params.action === 'required') {
      return json(200, { required: !!getExpectedPin(scope) });
    }
    const token = params.token;
    if (!token || !verifyToken(scope, token)) {
      return json(401, { ok: false });
    }
    return json(200, { ok: true });
  }

  if (event.httpMethod === 'POST') {
    let body = {};
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return json(400, { ok: false, error: 'json_invalido' });
    }
    const scope = body.scope;
    const pin = String(body.pin || '').trim();
    if (!scope || !SCOPES[scope]) {
      return json(400, { ok: false, error: 'scope_invalido' });
    }
    const expected = getExpectedPin(scope);
    if (!expected) {
      return json(503, {
        ok: false,
        error: 'pin_not_configured',
        message: `Falta ${SCOPES[scope]} en Netlify.`
      });
    }
    if (!getSecret()) {
      return json(503, {
        ok: false,
        error: 'secret_not_configured',
        message: 'Falta NUTRIPLANT_PIN_TOKEN_SECRET o PLAN_PRO_CALENDAR_FEED_TOKEN.'
      });
    }
    if (!/^\d{4}$/.test(pin) || pin !== expected) {
      return json(401, { ok: false, error: 'pin_incorrecto' });
    }
    const t = makeToken(scope);
    if (!t) {
      return json(503, { ok: false, error: 'token_error' });
    }
    return json(200, { ok: true, token: t.token, expiresAt: t.expiresAt });
  }

  return json(405, { ok: false, error: 'metodo_no_permitido' });
};
