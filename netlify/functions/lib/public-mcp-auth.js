'use strict';

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const SCOPE = 'nutriplant.subscriber.read';

function publicOrigin(event) {
  const env = String(process.env.NUTRIPLANT_PUBLIC_ORIGIN || '').replace(/\/+$/, '');
  if (env) return env;
  const h = event && (event.headers || {});
  const host = h['x-forwarded-host'] || h.host || h.Host;
  if (host) {
    const proto = h['x-forwarded-proto'] || 'https';
    return String(proto).split(',')[0].trim() + '://' + String(host).split(',')[0].trim();
  }
  return 'https://nutriplantpro.com';
}

function oauthSecret() {
  const explicit = String(process.env.NUTRIPLANT_PUBLIC_MCP_OAUTH_SECRET || '').trim();
  if (explicit) return explicit;
  const seed = String(
    process.env.AGROCLIMATE_TOKEN_SECRET ||
      process.env.AGROCLIMATE_CRON_SECRET ||
      process.env.ADMIN_ACCESS_PIN ||
      ''
  ).trim();
  if (!seed) return '';
  return crypto.createHmac('sha256', seed).update('nutriplant-public-mcp-oauth').digest('hex');
}

function parseBearer(event) {
  const h = (event && event.headers) || {};
  const raw = h.authorization || h.Authorization || '';
  const m = String(raw).match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : '';
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
  if (parts.length !== 2) return null;
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

function supabaseAuthClient() {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key =
    (process.env.SUPABASE_ANON_KEY || '').trim() ||
    (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function verifySubscriber(accessToken) {
  if (!accessToken) return { ok: false, status: 401, error: 'Sin sesión de suscriptor.' };
  const supabase = supabaseAuthClient();
  if (!supabase) return { ok: false, status: 503, error: 'Auth de suscriptor no configurada.' };
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data || !data.user || !data.user.id) {
    return { ok: false, status: 401, error: 'Sesión inválida o caducada. Vuelve a conectar NutriPlant PRO.' };
  }
  return {
    ok: true,
    userId: data.user.id,
    email: data.user.email || '',
    accessToken
  };
}

function protectedResourceMeta(origin) {
  const resource = origin + '/mcp';
  return {
    resource,
    authorization_servers: [origin],
    scopes_supported: [SCOPE, 'openid', 'email'],
    bearer_methods_supported: ['header'],
    resource_documentation: origin + '/manual-tecnico/',
    resource_policy_uri: origin + '/politicas-privacidad.html',
    resource_tos_uri: origin + '/terminos-condiciones.html'
  };
}

function authorizationServerMeta(origin) {
  return {
    issuer: origin,
    authorization_endpoint: origin + '/mcp/oauth/authorize',
    token_endpoint: origin + '/mcp/oauth/token',
    registration_endpoint: origin + '/mcp/oauth/register',
    userinfo_endpoint: origin + '/mcp/oauth/userinfo',
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: [SCOPE, 'openid', 'email'],
    authorization_response_iss_parameter_supported: true,
    client_id_metadata_document_supported: true
  };
}

function loginHtml(opts) {
  const err = opts.error
    ? '<p class="err">' + escapeHtml(opts.error) + '</p>'
    : '<p class="hint">Misma cuenta de nutriplantpro.com. Solo verás <strong>tus</strong> proyectos.</p>';
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
  <title>Conectar NutriPlant PRO</title>
  <style>
    body{font-family:Inter,system-ui,sans-serif;background:#f8fafc;margin:0;padding:24px;color:#0f172a}
    .box{max-width:420px;margin:40px auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:28px;box-shadow:0 8px 24px rgba(15,23,42,.06)}
    img{height:40px}
    h1{font-size:1.15rem;margin:16px 0 8px}
    label{display:block;font-size:.8rem;font-weight:600;margin:12px 0 4px}
    input[type=email],input[type=password]{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:1rem}
    button{margin-top:18px;width:100%;background:#0ea5e9;color:#fff;border:0;border-radius:10px;padding:12px;font-weight:700;cursor:pointer}
    .err{color:#b91c1c;background:#fef2f2;padding:8px 10px;border-radius:8px}
    .hint{color:#64748b;font-size:.9rem}
  </style>
</head>
<body>
  <form class="box" method="post" action="/mcp/oauth/login">
    <img src="/assets/NutriPlant_PRO_blue.png" alt="NutriPlant PRO">
    <h1>Inicia sesión de suscriptor</h1>
    ${err}
    ${fields}
    <label for="email">Correo</label>
    <input id="email" name="email" type="email" autocomplete="username" required>
    <label for="password">Contraseña</label>
    <input id="password" name="password" type="password" autocomplete="current-password" required>
    <button type="submit">Conectar</button>
  </form>
</body>
</html>`;
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
      resource: q.resource || origin + '/mcp',
      scope: q.scope || SCOPE
    })
  };
}

async function handleLoginPost(event, origin) {
  const secret = oauthSecret();
  if (!secret) {
    return jsonRes(503, { error: 'temporarily_unavailable', error_description: 'No hay secreto para firmar el login del plugin.' });
  }
  const form = parseForm(event.decodedBody || '');
  if (!allowedRedirect(form.redirect_uri)) {
    return jsonRes(400, { error: 'invalid_request', error_description: 'redirect_uri no permitido.' });
  }
  const supabase = supabaseAuthClient();
  if (!supabase) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: loginHtml(Object.assign({}, form, { error: 'Servidor sin Supabase Auth.' }))
    };
  }
  const email = String(form.email || '').trim();
  const password = String(form.password || '');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data || !data.session || !data.user) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: loginHtml(Object.assign({}, form, { error: 'Correo o contraseña incorrectos.' }))
    };
  }
  const session = data.session;
  const payload = {
    v: 1,
    at: session.access_token,
    rt: session.refresh_token || '',
    uid: data.user.id,
    email: data.user.email || email,
    cc: form.code_challenge || '',
    ru: form.redirect_uri,
    exp: Date.now() + 5 * 60 * 1000
  };
  const code = signCode(payload, secret);
  const redirect = new URL(form.redirect_uri);
  redirect.searchParams.set('code', code);
  if (form.state) redirect.searchParams.set('state', form.state);
  redirect.searchParams.set('iss', origin);
  return {
    statusCode: 302,
    headers: { Location: redirect.toString(), 'Cache-Control': 'no-store' },
    body: ''
  };
}

async function handleTokenPost(event, origin) {
  const secret = oauthSecret();
  if (!secret) {
    return jsonRes(503, { error: 'temporarily_unavailable', error_description: 'No hay secreto para firmar el login del plugin.' });
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
  const supabase = supabaseAuthClient();

  if (grant === 'refresh_token') {
    if (!supabase) return jsonRes(503, { error: 'temporarily_unavailable' });
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: String(body.refresh_token || '') });
    if (error || !data || !data.session) return jsonRes(400, { error: 'invalid_grant' });
    return jsonRes(200, tokenPayload(data.session, origin));
  }

  if (grant !== 'authorization_code') {
    return jsonRes(400, { error: 'unsupported_grant_type' });
  }
  const packed = verifyCode(body.code, secret);
  if (!packed || packed.exp < Date.now()) return jsonRes(400, { error: 'invalid_grant' });
  if (body.redirect_uri && packed.ru && String(body.redirect_uri) !== String(packed.ru)) {
    return jsonRes(400, { error: 'invalid_grant' });
  }
  if (packed.cc) {
    const calc = pkceS256(body.code_verifier || '');
    if (calc !== packed.cc) return jsonRes(400, { error: 'invalid_grant' });
  }
  return jsonRes(200, {
    access_token: packed.at,
    refresh_token: packed.rt || undefined,
    token_type: 'bearer',
    expires_in: 3600,
    scope: SCOPE,
    iss: origin
  });
}

function tokenPayload(session, origin) {
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token || undefined,
    token_type: 'bearer',
    expires_in: session.expires_in || 3600,
    scope: SCOPE,
    iss: origin
  };
}

function handleRegister() {
  return jsonRes(201, {
    client_id: 'nutriplant-pro-chatgpt',
    client_name: 'NutriPlant PRO',
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code']
  });
}

async function handleUserInfo(event) {
  const token = parseBearer(event);
  const user = await verifySubscriber(token);
  if (!user.ok) return jsonRes(user.status || 401, { error: 'invalid_token' });
  return jsonRes(200, {
    sub: user.userId,
    email: user.email,
    email_verified: true
  });
}

module.exports = {
  SCOPE,
  publicOrigin,
  parseBearer,
  verifySubscriber,
  supabaseAuthClient,
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
  oauthSecret
};
