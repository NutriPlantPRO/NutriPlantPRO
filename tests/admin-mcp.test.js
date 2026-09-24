'use strict';

var assert = require('node:assert/strict');
var tools = require('../netlify/functions/lib/admin-mcp-tools.js');
var mcpAuth = require('../netlify/functions/lib/admin-mcp-auth.js');
var handler = require('../netlify/functions/nutriplant-admin-mcp.js').handler;
var publicHandler = require('../netlify/functions/nutriplant-public-mcp.js').handler;

function mcpEvent(method, body, headers, path) {
  return {
    httpMethod: method,
    path: path || '/mcp-admin',
    headers: Object.assign({ host: 'nutriplantpro.com', 'x-forwarded-proto': 'https' }, headers || {}),
    body: typeof body === 'string' ? body : JSON.stringify(body || {})
  };
}

module.exports = [
  {
    name: 'Socio MCP: GET no es el plugin público',
    run: async function () {
      var res = await handler(mcpEvent('GET'));
      assert.equal(res.statusCode, 200);
      var body = JSON.parse(res.body);
      assert.equal(body.ok, true);
      assert.equal(body.socio, true);
      assert.equal(body.public_plugin, false);
      assert.match(body.mcp, /\/mcp-admin$/);
    }
  },
  {
    name: 'Socio MCP: initialize nombra Socio Admin',
    run: async function () {
      var res = await handler(mcpEvent('POST', { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }));
      assert.equal(res.statusCode, 200);
      var body = JSON.parse(res.body);
      assert.equal(body.result.serverInfo.name, 'NutriPlant Socio Admin');
      assert.match(body.result.instructions, /nutriplantAdminQuery/);
      assert.match(body.result.instructions, /plugin público/);
    }
  },
  {
    name: 'Socio MCP: una sola tool nutriplantAdminQuery',
    run: function () {
      var names = tools.toolsList().map(function (t) {
        return t.name;
      });
      assert.deepEqual(names, ['nutriplantAdminQuery']);
      assert.ok(tools.ADMIN_ACTIONS.indexOf('subscription_roster') >= 0);
      assert.ok(tools.ADMIN_ACTIONS.indexOf('describe_api') >= 0);
      ['list_my_projects', 'lookup_chapter', 'salt_from_meq'].forEach(function (bad) {
        assert.equal(names.indexOf(bad), -1);
      });
    }
  },
  {
    name: 'Socio MCP: tools/call sin token → 401 OAuth admin',
    run: async function () {
      var prev = process.env.NUTRIPLANT_ADMIN_GPT_TOKEN;
      process.env.NUTRIPLANT_ADMIN_GPT_TOKEN = 'test-socio-admin-token';
      try {
        var res = await handler(
          mcpEvent('POST', {
            jsonrpc: '2.0',
            id: 3,
            method: 'tools/call',
            params: { name: 'nutriplantAdminQuery', arguments: { action: 'describe_api', params: {} } }
          })
        );
        assert.equal(res.statusCode, 401);
        assert.match(String(res.headers['WWW-Authenticate'] || ''), /oauth-protected-resource\/mcp-admin/);
      } finally {
        if (prev == null) delete process.env.NUTRIPLANT_ADMIN_GPT_TOKEN;
        else process.env.NUTRIPLANT_ADMIN_GPT_TOKEN = prev;
      }
    }
  },
  {
    name: 'Socio MCP: describe_api con Bearer del token',
    run: async function () {
      var prev = process.env.NUTRIPLANT_ADMIN_GPT_TOKEN;
      process.env.NUTRIPLANT_ADMIN_GPT_TOKEN = 'test-socio-admin-token';
      try {
        var res = await handler(
          mcpEvent(
            'POST',
            {
              jsonrpc: '2.0',
              id: 4,
              method: 'tools/call',
              params: { name: 'nutriplantAdminQuery', arguments: { action: 'describe_api', params: {} } }
            },
            { Authorization: 'Bearer test-socio-admin-token' }
          )
        );
        assert.equal(res.statusCode, 200);
        var body = JSON.parse(res.body);
        var parsed = JSON.parse(body.result.content[0].text);
        assert.equal(parsed.ok, true);
        assert.equal(parsed.version, '2.15.0');
        assert.match(parsed.mcp.url, /\/mcp-admin$/);
      } finally {
        if (prev == null) delete process.env.NUTRIPLANT_ADMIN_GPT_TOKEN;
        else process.env.NUTRIPLANT_ADMIN_GPT_TOKEN = prev;
      }
    }
  },
  {
    name: 'Socio MCP: metadata OAuth no apunta a /mcp público',
    run: async function () {
      var res = await handler(mcpEvent('GET', '', {}, '/.well-known/oauth-protected-resource/mcp-admin'));
      var body = JSON.parse(res.body);
      assert.equal(body.resource, 'https://nutriplantpro.com/mcp-admin');
      assert.deepEqual(body.authorization_servers, ['https://nutriplantpro.com/mcp-admin']);
    }
  },
  {
    name: 'Socio MCP: login rechaza password basura',
    run: async function () {
      var prev = process.env.NUTRIPLANT_ADMIN_GPT_TOKEN;
      process.env.NUTRIPLANT_ADMIN_GPT_TOKEN = 'token-real-de-prueba';
      try {
        var res = await handler({
          httpMethod: 'POST',
          path: '/mcp-admin/oauth/login',
          headers: {
            host: 'nutriplantpro.com',
            'x-forwarded-proto': 'https',
            'content-type': 'application/x-www-form-urlencoded'
          },
          body: 'password=no&redirect_uri=' + encodeURIComponent('https://chatgpt.com/aip/callback')
        });
        assert.equal(res.statusCode, 200);
        assert.match(res.body, /Token o PIN incorrecto/);
      } finally {
        if (prev == null) delete process.env.NUTRIPLANT_ADMIN_GPT_TOKEN;
        else process.env.NUTRIPLANT_ADMIN_GPT_TOKEN = prev;
      }
    }
  },
  {
    name: 'Público: /mcp-admin no lo atiende el plugin de suscriptores',
    run: async function () {
      var res = await publicHandler(mcpEvent('GET', '', {}, '/mcp-admin'));
      assert.equal(res.statusCode, 404);
    }
  },
  {
    name: 'Socio MCP: PIN vale para login, no como Bearer crudo',
    run: function () {
      var prevToken = process.env.NUTRIPLANT_ADMIN_GPT_TOKEN;
      var prevPin = process.env.ADMIN_ACCESS_PIN;
      process.env.NUTRIPLANT_ADMIN_GPT_TOKEN = 'token-largo';
      process.env.ADMIN_ACCESS_PIN = '1234';
      try {
        assert.equal(mcpAuth.passwordAccepted('1234'), true);
        assert.equal(mcpAuth.passwordAccepted('token-largo'), true);
        assert.equal(mcpAuth.passwordAccepted('otro'), false);
        var denied = mcpAuth.verifyAdminBearer({
          headers: { Authorization: 'Bearer 1234' }
        });
        assert.equal(denied.ok, false);
        var ok = mcpAuth.verifyAdminBearer({
          headers: { Authorization: 'Bearer token-largo' }
        });
        assert.equal(ok.ok, true);
      } finally {
        if (prevToken == null) delete process.env.NUTRIPLANT_ADMIN_GPT_TOKEN;
        else process.env.NUTRIPLANT_ADMIN_GPT_TOKEN = prevToken;
        if (prevPin == null) delete process.env.ADMIN_ACCESS_PIN;
        else process.env.ADMIN_ACCESS_PIN = prevPin;
      }
    }
  }
];
