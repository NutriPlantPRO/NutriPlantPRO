'use strict';

var assert = require('node:assert/strict');
var core = require('../netlify/functions/lib/public-mcp-core.js');
var tools = require('../netlify/functions/lib/public-mcp-tools.js');
var mcpAuth = require('../netlify/functions/lib/public-mcp-auth.js');
var handler = require('../netlify/functions/nutriplant-public-mcp.js').handler;

function mcpEvent(method, body, headers) {
  return {
    httpMethod: method,
    path: '/mcp',
    headers: Object.assign({ host: 'nutriplantpro.com', 'x-forwarded-proto': 'https' }, headers || {}),
    body: typeof body === 'string' ? body : JSON.stringify(body || {})
  };
}

module.exports = [
  {
    name: 'Público: 1 meq/L Ca = 20.04 ppm',
    run: function () {
      var r = core.convertNutrientUnits({ nutrient: 'Ca', value: 1, from: 'meq_L' });
      assert.equal(r.ok, true);
      assert.equal(r.ppm, 20.04);
    }
  },
  {
    name: 'Público: 1 meq Ca → nitrato de calcio g/m³ y N-NO3 arrastrado',
    run: function () {
      var r = core.saltFromMeq({ nutrient: 'Ca', meq_L: 1, salt_id: 'nitrato_calcio_granular' });
      assert.equal(r.ok, true);
      assert.ok(r.dose.g_per_m3 > 100 && r.dose.g_per_m3 < 120);
      assert.ok(r.also_contributes.N_NO3.meq_L > 1);
      assert.equal(r.salt.tank, 'A');
      assert.match(r.chapter.url, /hidroponia/);
    }
  },
  {
    name: 'Público: VPD 2 kPa es banda alta',
    run: function () {
      var r = core.calculateVpd({ vpd_kPa: 2, crop: 'jitomate' });
      assert.equal(r.ok, true);
      assert.equal(r.band, 'alto');
      assert.equal(r.crop, 'jitomate');
    }
  },
  {
    name: 'Público: VPD Tetens 28 °C 45 % HR',
    run: function () {
      var r = core.calculateVpd({ temperature_C: 28, rh_pct: 45 });
      assert.equal(r.ok, true);
      assert.ok(r.vpd_kPa > 1.5);
      assert.equal(r.band, 'alto');
    }
  },
  {
    name: 'Público: lookup VPD cita capítulo',
    run: function () {
      var r = core.lookupChapter({ q: 'VPD' });
      assert.equal(r.ok, true);
      assert.match(r.chapter.url, /vpd-deficit-presion-vapor/);
    }
  },
  {
    name: 'Público: muro — tools sin acciones admin',
    run: function () {
      var names = tools.toolsList().map(function (t) {
        return t.name;
      });
      assert.ok(names.indexOf('list_catalog') >= 0);
      assert.ok(names.indexOf('salt_from_meq') >= 0);
      assert.ok(names.indexOf('list_my_projects') >= 0);
      ['subscription_roster', 'admin_stats', 'nutriplantAdminQuery', 'list_users'].forEach(function (bad) {
        assert.equal(names.indexOf(bad), -1);
      });
    }
  },
  {
    name: 'Público: OAuth PKCE firma y verifica código',
    run: function () {
      var secret = 'test-secret-not-admin';
      var verifier = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-aa';
      var payload = {
        v: 1,
        at: 'access',
        ru: 'https://chatgpt.com/connector/oauth/callback',
        cc: mcpAuth.pkceS256(verifier),
        exp: Date.now() + 60000
      };
      var code = mcpAuth.signCode(payload, secret);
      var back = mcpAuth.verifyCode(code, secret);
      assert.equal(back.at, 'access');
      assert.equal(back.cc, mcpAuth.pkceS256(verifier));
      assert.equal(mcpAuth.allowedRedirect(payload.ru), true);
      assert.equal(mcpAuth.allowedRedirect('https://evil.example/cb'), false);
    }
  },
  {
    name: 'Público: OAuth deriva secreto de variable ya existente',
    run: function () {
      var prev = process.env.NUTRIPLANT_PUBLIC_MCP_OAUTH_SECRET;
      var prevAgro = process.env.AGROCLIMATE_TOKEN_SECRET;
      delete process.env.NUTRIPLANT_PUBLIC_MCP_OAUTH_SECRET;
      process.env.AGROCLIMATE_TOKEN_SECRET = 'seed-agro-test';
      var a = mcpAuth.oauthSecret();
      var b = mcpAuth.oauthSecret();
      assert.ok(a && a.length === 64);
      assert.equal(a, b);
      process.env.NUTRIPLANT_PUBLIC_MCP_OAUTH_SECRET = 'explicit-wins';
      assert.equal(mcpAuth.oauthSecret(), 'explicit-wins');
      if (prev == null) delete process.env.NUTRIPLANT_PUBLIC_MCP_OAUTH_SECRET;
      else process.env.NUTRIPLANT_PUBLIC_MCP_OAUTH_SECRET = prev;
      if (prevAgro == null) delete process.env.AGROCLIMATE_TOKEN_SECRET;
      else process.env.AGROCLIMATE_TOKEN_SECRET = prevAgro;
    }
  },
  {
    name: 'Público: MCP initialize no pide admin',
    run: async function () {
      var res = await handler(
        mcpEvent('POST', { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} })
      );
      assert.equal(res.statusCode, 200);
      var body = JSON.parse(res.body);
      assert.equal(body.result.serverInfo.name, 'NutriPlant PRO');
      assert.match(body.result.instructions, /No hay roster admin|otros clientes|plugin público/);
    }
  },
  {
    name: 'Público: salt_from_meq via MCP sin token',
    run: async function () {
      var res = await handler(
        mcpEvent('POST', {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'salt_from_meq',
            arguments: { nutrient: 'Ca', meq_L: 1, salt_id: 'nitrato de calcio' }
          }
        })
      );
      var body = JSON.parse(res.body);
      var parsed = JSON.parse(body.result.content[0].text);
      assert.equal(parsed.ok, true);
      assert.ok(parsed.dose.g_per_m3 > 100);
    }
  },
  {
    name: 'Público: list_my_projects sin sesión → 401 OAuth',
    run: async function () {
      var res = await handler(
        mcpEvent('POST', {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: { name: 'list_my_projects', arguments: {} }
        })
      );
      assert.equal(res.statusCode, 401);
      assert.match(String(res.headers['WWW-Authenticate'] || ''), /oauth-protected-resource/);
    }
  }
];
