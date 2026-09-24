'use strict';

/**
 * Auth del MCP Socio (privado). No mezclar con public-mcp-auth.
 * Bearer = NUTRIPLANT_ADMIN_GPT_TOKEN, o access token OAuth firmado aquí.
 */

const crypto = require('crypto');

const SCOPE = 'nutriplant.admin';
const RESOURCE_PATH = '/mcp-admin';

function publicOrigin(event) {
  const env = String(process.env.NUTRIPLANT_PUBLIC_ORIGIN || process.env.NUTRIPLANT_PUBLIC_URL || '').replace(
    /\/+$/,
    ''
  );
  if (env) return env;
  const h = event && (event.headers || {});
  const host = h['x-forwarded-host'] || h.host || h.Host;
  if (host) {
    const proto = h['x-forwarded-proto'] || 'https';
    return String(proto).split(',')[0].trim() + '://' + String(host).split(',')[0].trim();
  }
  return 'https://nutriplantpro.com';
}

function adminToken() {
  return String(process.env.NUTRIPLANT_ADMIN_GPT_TOKEN || '').trim();
}

function adminPin() {
  return String(process.env.ADMIN_ACCESS_PIN || '').trim();
}

function oauthSecret() {
  const seed = adminToken() || String(process.env.AGROCLIMATE_TOKEN_SECRET || process.env.AGROCLIMATE_CRON_SECRET || '').trim() || adminPin();
  if (!seed) return '';
  return crypto.createHmac('sha256', seed).update('nutriplant-admin-mcp-oauth').digest('hex');
}

function parseBearer(event) {
  const h = (event && event.headers) || {};
  const raw = h.authorization || h.Authorization || '';
  const m = String(raw).match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : '';
}

function tokensEqual(a, b) {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  if (!left.length || left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function b64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromB64url(s) {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

function signCode(payload, secret) {
  const body = b64url(JSON.stringify(payload));
  const mac = crypto.createHmac('sha256', secret).update(body).digest();
  return body + '.' + b64url(mac);
}

function verifyCode(token, secret) {
  const parts = String(token || '').split('.');
  if (parts.length !== 2 || !secret) return null;
  const expect = b64url(crypto.createHmac('sha256', secret).update(parts[0]).digest());
  const a = Buffer.from(expect);
  const b = Buffer.from(parts[1]);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(fromB64url(parts[0]).toString('utf8'));
  } catch {
    return null;
  }
}

function pkceS256(verifier) {
  return b64url(crypto.createHash('sha256').update(String(verifier)).digest());
}

function allowedRedirect(uri) {
  let u;
  try {
    u = new URL(String(uri || ''));
  } catch {
    return false;
  }
  if (u.protocol === 'http:' && (u.hostname === '127.0.0.1' || u.hostname === 'localhost')) return true;
  if (u.protocol !== 'https:') return false;
  const host = u.hostname.toLowerCase();
  return (
    host === 'chatgpt.com' ||
    host.endsWith('.chatgpt.com') ||
    host === 'openai.com' ||
    host.endsWith('.openai.com') ||
    host === 'chat.openai.com'
  );
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseForm(raw) {
  const out = {};
  String(raw || '')
    .split('&')
    .forEach((pair) => {
      if (!pair) return;
      const i = pair.indexOf('=');
      const k = decodeURIComponent((i < 0 ? pair : pair.slice(0, i)).replace(/\+/g, ' '));
      const v = decodeURIComponent((i < 0 ? '' : pair.slice(i + 1)).replace(/\+/g, ' '));
      out[k] = v;
    });
  return out;
}

function jsonRes(status, body, extraHeaders) {
  return {
    statusCode: status,
    headers: Object.assign(
      { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      extraHeaders || {}
    ),
    body: JSON.stringify(body)
  };
}

function passwordAccepted(password) {
  const token = adminToken();
  const pin = adminPin();
  if (token && tokensEqual(password, token)) return true;
  if (pin && tokensEqual(password, pin)) return true;
  return false;
}

function verifyAdminBearer(event) {
  const expected = adminToken();
  if (!expected && !oauthSecret()) {
    return { ok: false, status: 503, error: 'NUTRIPLANT_ADMIN_GPT_TOKEN no configurado en Netlify.' };
  }
  const token = parseBearer(event);
  if (!token) {
    return { ok: false, status: 401, error: 'No autorizado. Conecta el Socio o envía Bearer del token admin.' };
  }
  if (expected && tokensEqual(token, expected)) {
    return { ok: true, via: 'admin_token' };
  }
  const packed = verifyCode(token, oauthSecret());
  if (
    packed &&
    packed.aud === 'mcp-admin' &&
    packed.role === 'admin' &&
    packed.typ === 'at' &&
    packed.exp > Date.now()
  ) {
    return { ok: true, via: 'oauth' };
  }
  return { ok: false, status: 401, error: 'No autorizado. Token admin o sesión OAuth inválidos.' };
}

function protectedResourceMeta(origin) {
  const resource = origin + RESOURCE_PATH;
  return {
    resource,
    authorization_servers: [origin + RESOURCE_PATH],
    scopes_supported: [SCOPE, 'openid'],
    bearer_methods_supported: ['header']
  };
}

function authorizationServerMeta(origin) {
  const issuer = origin + RESOURCE_PATH;
  return {
    issuer,
    authorization_endpoint: issuer + '/oauth/authorize',
    token_endpoint: issuer + '/oauth/token',
    registration_endpoint: issuer + '/oauth/register',
    userinfo_endpoint: issuer + '/oauth/userinfo',
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: [SCOPE, 'openid'],
    authorization_response_iss_parameter_supported: true,
    client_id_metadata_document_supported: true
  };
}

function loginHtml(opts) {
  const err = opts.error
    ? '<p class="err">' + escapeHtml(opts.error) + '</p>'
    : '<p class="hint">Solo Jesús. Token del Socio o PIN de admin. No es el plugin público.</p>';
  const fields = ['client_id', 'redirect_uri', 'state', 'code_challenge', 'resource', 'scope']
    .map((k) => {
      const v = opts[k] == null ? '' : String(opts[k]);
      return '<input type="hidden" name="' + k + '" value="' + escapeHtml(v) + '">';
    })
    .join('');
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Conectar Socio Admin</title>
  <style>
    body{font-family:Inter,system-ui,sans-serif;background:#0f172a;margin:0;padding:24px;color:#e2e8f0}
    .box{max-width:420px;margin:40px auto;background:#111827;border:1px solid #334155;border-radius:16px;padding:28px}
    h1{font-size:1.15rem;margin:8px 0}
    label{display:block;font-size:.8rem;font-weight:600;margin:12px 0 4px}
    input[type=password]{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #475569;border-radius:8px;font-size:1rem;background:#0f172a;color:#f8fafc}
    button{margin-top:18px;width:100%;background:#2563eb;color:#fff;border:0;border-radius:10px;padding:12px;font-weight:700;cursor:pointer}
    .err{color:#fecaca;background:#7f1d1d;padding:8px 10px;border-radius:8px}
    .hint{color:#94a3b8;font-size:.9rem}
  </style>
</head>
<body>
  <form class="box" method="post" action="/mcp-admin/oauth/login">
    <h1>Socio Admin — privado</h1>
    ${err}
    ${fields}
    <label for="password">Token o PIN de admin</label>
    <input id="password" name="password" type="password" autocomplete="current-password" required>
    <button type="submit">Conectar Socio</button>
  </form>
</body>
</html>`;
}

function issueTokens(secret) {
  const now = Date.now();
  const access = signCode(
    { v: 1, aud: 'mcp-admin', role: 'admin', typ: 'at', exp: now + 8 * 60 * 60 * 1000 },
    secret
  );
  const refresh = signCode(
    { v: 1, aud: 'mcp-admin', role: 'admin', typ: 'rt', exp: now + 30 * 24 * 60 * 60 * 1000 },
    secret
  );
  return { access, refresh };
}

async function handleAuthorizeGet(event, origin) {
  const q = event.queryStringParameters || {};
  if (q.code_challenge_method && String(q.code_challenge_method).toUpperCase() !== 'S256') {
    return jsonRes(400, { error: 'invalid_request', error_description: 'code_challenge_method debe ser S256.' });
  }
  if (q.redirect_uri && !allowedRedirect(q.redirect_uri)) {
    return jsonRes(400, { error: 'invalid_request', error_description: 'redirect_uri no permitido.' });
  }
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    body: loginHtml({
      client_id: q.client_id || '',
      redirect_uri: q.redirect_uri || '',
      state: q.state || '',
      code_challenge: q.code_challenge || '',
      resource: q.resource || origin + RESOURCE_PATH,
      scope: q.scope || SCOPE
    })
  };
}

async function handleLoginPost(event, origin) {
  const secret = oauthSecret();
  if (!secret) {
    return jsonRes(503, {
      error: 'temporarily_unavailable',
      error_description: 'No hay secreto para firmar el login del Socio.'
    });
  }
  const form = parseForm(event.decodedBody || '');
  if (!allowedRedirect(form.redirect_uri)) {
    return jsonRes(400, { error: 'invalid_request', error_description: 'redirect_uri no permitido.' });
  }
  if (!passwordAccepted(form.password || '')) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: loginHtml(Object.assign({}, form, { error: 'Token o PIN incorrecto.' }))
    };
  }
  const payload = {
    v: 1,
    aud: 'mcp-admin',
    role: 'admin',
    cc: form.code_challenge || '',
    ru: form.redirect_uri,
    exp: Date.now() + 5 * 60 * 1000
  };
  const code = signCode(payload, secret);
  const redirect = new URL(form.redirect_uri);
  redirect.searchParams.set('code', code);
  if (form.state) redirect.searchParams.set('state', form.state);
  redirect.searchParams.set('iss', origin + RESOURCE_PATH);
  return {
    statusCode: 302,
    headers: { Location: redirect.toString(), 'Cache-Control': 'no-store' },
    body: ''
  };
}

async function handleTokenPost(event, origin) {
  const secret = oauthSecret();
  if (!secret) {
    return jsonRes(503, {
      error: 'temporarily_unavailable',
      error_description: 'No hay secreto para firmar el login del Socio.'
    });
  }
  const ct = String((event.headers && (event.headers['content-type'] || event.headers['Content-Type'])) || '');
  let body = {};
  if (ct.indexOf('application/json') >= 0) {
    try {
      body = JSON.parse(event.decodedBody || '{}');
    } catch {
      body = {};
    }
  } else {
    body = parseForm(event.decodedBody || '');
  }
  const grant = String(body.grant_type || '');
  const issuer = origin + RESOURCE_PATH;

  if (grant === 'refresh_token') {
    const packed = verifyCode(body.refresh_token, secret);
    if (!packed || packed.typ !== 'rt' || packed.aud !== 'mcp-admin' || packed.exp < Date.now()) {
      return jsonRes(400, { error: 'invalid_grant' });
    }
    const tokens = issueTokens(secret);
    return jsonRes(200, {
      access_token: tokens.access,
      refresh_token: tokens.refresh,
      token_type: 'bearer',
      expires_in: 28800,
      scope: SCOPE,
      iss: issuer
    });
  }

  if (grant !== 'authorization_code') {
    return jsonRes(400, { error: 'unsupported_grant_type' });
  }
  const packed = verifyCode(body.code, secret);
  if (!packed || packed.exp < Date.now() || packed.aud !== 'mcp-admin') {
    return jsonRes(400, { error: 'invalid_grant' });
  }
  if (body.redirect_uri && packed.ru && String(body.redirect_uri) !== String(packed.ru)) {
    return jsonRes(400, { error: 'invalid_grant' });
  }
  if (packed.cc) {
    const calc = pkceS256(body.code_verifier || '');
    if (calc !== packed.cc) return jsonRes(400, { error: 'invalid_grant' });
  }
  const tokens = issueTokens(secret);
  return jsonRes(200, {
    access_token: tokens.access,
    refresh_token: tokens.refresh,
    token_type: 'bearer',
    expires_in: 28800,
    scope: SCOPE,
    iss: issuer
  });
}

function handleRegister() {
  return jsonRes(201, {
    client_id: 'nutriplant-socio-admin-chatgpt',
    client_name: 'NutriPlant Socio Admin',
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code']
  });
}

function handleUserInfo(event) {
  const auth = verifyAdminBearer(event);
  if (!auth.ok) return jsonRes(auth.status || 401, { error: 'invalid_token' });
  return jsonRes(200, {
    sub: 'socio-admin',
    email: 'admin@nutriplantpro.com',
    email_verified: true
  });
}

module.exports = {
  SCOPE,
  RESOURCE_PATH,
  publicOrigin,
  parseBearer,
  verifyAdminBearer,
  protectedResourceMeta,
  authorizationServerMeta,
  handleAuthorizeGet,
  handleLoginPost,
  handleTokenPost,
  handleRegister,
  handleUserInfo,
  signCode,
  verifyCode,
  pkceS256,
  allowedRedirect,
  oauthSecret,
  adminToken,
  passwordAccepted
};
