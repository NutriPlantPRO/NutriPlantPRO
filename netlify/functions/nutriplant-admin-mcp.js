'use strict';

/**
 * MCP privado Socio Admin — complemento ChatGPT.
 * NO mezclar con /mcp (plugin público).
 *
 * Rutas: /mcp-admin  /mcp-admin/oauth/*  /.well-known/oauth-*-/mcp-admin
 */

const auth = require('./lib/admin-mcp-auth');
const tools = require('./lib/admin-mcp-tools');

const PROTOCOL = '2025-03-26';
const VERSION = '1.0.0';

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
    'Bearer realm="NutriPlant Socio Admin", resource_metadata="' +
    origin +
    '/.well-known/oauth-protected-resource/mcp-admin"'
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

function isAdminMcpPath(path) {
  return (
    path === '/mcp-admin' ||
    path.startsWith('/mcp-admin/') ||
    path === '/.well-known/oauth-protected-resource/mcp-admin' ||
    path === '/.well-known/oauth-authorization-server/mcp-admin' ||
    path.endsWith('/nutriplant-admin-mcp') ||
    path === '/.netlify/functions/nutriplant-admin-mcp'
  );
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
      serverInfo: { name: 'NutriPlant Socio Admin', version: VERSION },
      instructions: tools.ADMIN_INSTRUCTIONS
    });
  }

  if (method === 'tools/list') {
    return mcpResult(id, { tools: tools.toolsList() });
  }

  if (method === 'resources/list') return mcpResult(id, { resources: [] });
  if (method === 'prompts/list') return mcpResult(id, { prompts: [] });

  if (method === 'tools/call') {
    const verified = auth.verifyAdminBearer(event);
    if (!verified.ok) {
      return mcpError(id, -32001, verified.error, verified.status || 401, {
        'WWW-Authenticate': wwwAuth(origin)
      });
    }
    const name = msg.params && msg.params.name;
    const args = (msg.params && msg.params.arguments) || {};
    if (!name) return mcpError(id, -32602, 'Falta params.name');

    try {
      const out = await tools.callTool(name, args);
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

  if (path === '/.well-known/oauth-protected-resource/mcp-admin') {
    return json(200, auth.protectedResourceMeta(origin));
  }
  if (path === '/.well-known/oauth-authorization-server/mcp-admin') {
    return json(200, auth.authorizationServerMeta(origin));
  }

  if (path === '/mcp-admin/oauth/authorize' && method === 'GET') {
    return withCors(await auth.handleAuthorizeGet(event, origin));
  }
  if (path === '/mcp-admin/oauth/login' && method === 'POST') {
    return withCors(await auth.handleLoginPost(event, origin));
  }
  if (path === '/mcp-admin/oauth/token' && method === 'POST') {
    return withCors(await auth.handleTokenPost(event, origin));
  }
  if (path === '/mcp-admin/oauth/register' && method === 'POST') {
    return withCors(auth.handleRegister());
  }
  if (path === '/mcp-admin/oauth/userinfo' && method === 'GET') {
    return withCors(auth.handleUserInfo(event));
  }

  if (!isAdminMcpPath(path)) {
    return json(404, { error: 'not_found', path, socio: true });
  }

  if (method === 'GET') {
    return json(200, {
      ok: true,
      name: 'NutriPlant Socio Admin',
      mcp: origin + '/mcp-admin',
      version: VERSION,
      api: '2.15.0',
      socio: true,
      public_plugin: false,
      note: 'POST JSON-RPC MCP privado. El plugin público vive en /mcp.'
    });
  }

  if (method === 'POST') {
    let parsed;
    try {
      parsed = JSON.parse(event.decodedBody || '{}');
    } catch {
      return mcpError(null, -32700, 'JSON inválido.');
    }
    if (Array.isArray(parsed)) {
      const parts = [];
      for (let i = 0; i < parsed.length; i += 1) {
        parts.push(await handleMcpMessage(parsed[i], event, origin));
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
