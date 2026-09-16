'use strict';

/**
 * MCP público NutriPlant PRO — ChatGPT plugin.
 * NO importar nutriplant-admin-assistant ni el token admin.
 *
 * Rutas: /mcp  /mcp/oauth/*  /.well-known/oauth-*
 */

const auth = require('./lib/public-mcp-auth');
const tools = require('./lib/public-mcp-tools');

const PROTOCOL = '2025-03-26';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, MCP-Protocol-Version, Mcp-Session-Id, Last-Event-ID',
  'Access-Control-Expose-Headers': 'WWW-Authenticate, Mcp-Session-Id, MCP-Protocol-Version'
};

function decodeBody(event) {
  if (!event.body) return '';
  if (event.isBase64Encoded) return Buffer.from(event.body, 'base64').toString('utf8');
  return typeof event.body === 'string' ? event.body : JSON.stringify(event.body);
}

function pathname(event) {
  const raw = event.path || event.rawPath || '';
  try {
    if (event.rawUrl) return new URL(event.rawUrl).pathname;
  } catch {
    /* ignore */
  }
  return raw.split('?')[0];
}

function withCors(res) {
  res.headers = Object.assign({}, CORS, res.headers || {});
  return res;
}

function json(status, body, extra) {
  return withCors({
    statusCode: status,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, extra || {}),
    body: JSON.stringify(body)
  });
}

function wwwAuth(origin) {
  return (
    'Bearer realm="NutriPlant PRO", resource_metadata="' +
    origin +
    '/.well-known/oauth-protected-resource"'
  );
}

function mcpResult(id, result) {
  return json(200, { jsonrpc: '2.0', id: id == null ? null : id, result });
}

function mcpError(id, code, message, httpStatus, extraHeaders) {
  return json(
    httpStatus || 200,
    { jsonrpc: '2.0', id: id == null ? null : id, error: { code, message } },
    extraHeaders
  );
}

function textResult(obj) {
  return {
    content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }],
    structuredContent: obj
  };
}

async function handleMcpMessage(msg, event, origin) {
  if (!msg || msg.jsonrpc !== '2.0') {
    return mcpError(msg && msg.id, -32600, 'JSON-RPC 2.0 requerido.');
  }
  const method = String(msg.method || '');
  const id = msg.id;

  if (method === 'notifications/initialized' || method === 'notifications/cancelled') {
    return withCors({ statusCode: 202, headers: { 'Content-Type': 'text/plain' }, body: '' });
  }

  if (method === 'ping') return mcpResult(id, {});

  if (method === 'initialize') {
    return mcpResult(id, {
      protocolVersion: PROTOCOL,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'NutriPlant PRO', version: '0.6.0' },
      instructions: tools.PUBLIC_INSTRUCTIONS
    });
  }

  if (method === 'tools/list') {
    return mcpResult(id, { tools: tools.toolsList() });
  }

  if (method === 'resources/list') return mcpResult(id, { resources: [] });
  if (method === 'prompts/list') return mcpResult(id, { prompts: [] });

  if (method === 'tools/call') {
    const name = msg.params && msg.params.name;
    const args = (msg.params && msg.params.arguments) || {};
    if (!name) return mcpError(id, -32602, 'Falta params.name');

    let user = null;
    const bearer = auth.parseBearer(event);
    if (bearer) {
      const verified = await auth.verifySubscriber(bearer);
      if (verified.ok) user = verified;
    }

    if (tools.toolNeedsAuth(name) && !user) {
      return mcpError(id, -32001, 'Se requiere iniciar sesión de suscriptor NutriPlant PRO (Conectar cuenta).', 401, {
        'WWW-Authenticate': wwwAuth(origin)
      });
    }

    try {
      const out = await tools.callTool(name, args, user);
      const failed = out && out.ok === false;
      const payload = textResult(out);
      if (failed) payload.isError = true;
      return mcpResult(id, payload);
    } catch (e) {
      return mcpResult(id, textResult({ ok: false, error: e.message || String(e) }));
    }
  }

  return mcpError(id, -32601, 'Método no soportado: ' + method);
}

exports.handler = async function (event) {
  const origin = auth.publicOrigin(event);
  const path = pathname(event).replace(/\/+$/, '') || '/';
  const method = String(event.httpMethod || event.method || 'GET').toUpperCase();

  if (method === 'OPTIONS') {
    return withCors({ statusCode: 204, body: '' });
  }

  event.decodedBody = decodeBody(event);

  if (path === '/.well-known/oauth-protected-resource' || path === '/.well-known/oauth-protected-resource/mcp') {
    return json(200, auth.protectedResourceMeta(origin));
  }
  if (path === '/.well-known/oauth-authorization-server' || path === '/.well-known/oauth-authorization-server/mcp') {
    return json(200, auth.authorizationServerMeta(origin));
  }

  if (path === '/mcp/oauth/authorize' && method === 'GET') {
    const res = await auth.handleAuthorizeGet(event, origin);
    return withCors(res);
  }
  if (path === '/mcp/oauth/login' && method === 'POST') {
    const res = await auth.handleLoginPost(event, origin);
    return withCors(res);
  }
  if (path === '/mcp/oauth/token' && method === 'POST') {
    const res = await auth.handleTokenPost(event, origin);
    return withCors(res);
  }
  if (path === '/mcp/oauth/register' && method === 'POST') {
    return withCors(auth.handleRegister());
  }
  if (path === '/mcp/oauth/userinfo' && method === 'GET') {
    const res = await auth.handleUserInfo(event);
    return withCors(res);
  }

  const isMcp = path === '/mcp' || path.endsWith('/nutriplant-public-mcp') || path === '/.netlify/functions/nutriplant-public-mcp';

  if (isMcp && method === 'GET') {
    return json(200, {
      ok: true,
      name: 'NutriPlant PRO',
      mcp: origin + '/mcp',
      manual: 'https://nutriplantpro.com/manual-tecnico/',
      socio: false,
      note: 'POST JSON-RPC MCP. El GPT Socio no vive aquí.'
    });
  }

  if (isMcp && method === 'POST') {
    let parsed;
    try {
      parsed = JSON.parse(event.decodedBody || '{}');
    } catch {
      return mcpError(null, -32700, 'JSON inválido.');
    }
    if (Array.isArray(parsed)) {
      const parts = [];
      for (let i = 0; i < parsed.length; i += 1) {
        const res = await handleMcpMessage(parsed[i], event, origin);
        parts.push(res);
      }
      if (parts.length === 1) return parts[0];
      return json(
        200,
        parts.map((p) => {
          try {
            return JSON.parse(p.body);
          } catch {
            return null;
          }
        })
      );
    }
    return handleMcpMessage(parsed, event, origin);
  }

  return json(404, { error: 'not_found', path });
};
