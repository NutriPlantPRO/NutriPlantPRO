/**
 * Plan PRO Assistant → búsqueda unificada:
 *   Nutri PRO (texto indexado) + Notebook PRO (apuntes) + pistas Neuron (enlaces).
 * POST { q, nutri_file_id?, folder_id?, area_id? }
 * Authorization: Bearer <supabase access_token>
 */

'use strict';

const { createClient } = require('@supabase/supabase-js');
const { runAdminAction } = require('./nutriplant-admin-assistant');

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
    return { ok: false, status: 403, error: 'Solo administrador puede consultar Plan PRO / Nutri PRO.' };
  }
  return { ok: true, userId };
}

function notebookRoute(item) {
  const parts = ['Notebook PRO'];
  if (item.area) parts.push(String(item.area));
  if (item.category) parts.push(String(item.category));
  parts.push(String(item.title || '(sin título)'));
  return parts.join(' › ');
}

function nutriRoute(src) {
  return String(src.citation || src.short_path || src.title || src.original_name || 'archivo');
}

function buildRoutes(nutriRes, notebookRes) {
  const routes = [];
  const notebookItems = (notebookRes && notebookRes.items) || [];
  notebookItems.slice(0, 12).forEach((it) => {
    routes.push({
      kind: 'notebook',
      module: 'Notebook PRO',
      route: notebookRoute(it),
      apunte_id: it.id || null,
      area: it.area || null,
      category: it.category || null,
      title: it.title || null,
      relevance_score: it.relevance_score != null ? it.relevance_score : null
    });
  });

  const sources = (nutriRes && nutriRes.sources) || [];
  sources.slice(0, 12).forEach((s) => {
    const indexed = s.text_indexed === true;
    routes.push({
      kind: 'nutri',
      module: 'Nutri PRO',
      route: 'Nutri PRO › ' + nutriRoute(s),
      nutri_file_id: s.nutri_file_id || s.file_id || null,
      title: nutriRoute(s),
      text_indexed: indexed,
      indexed_label: indexed ? '✓ texto indexado' : '✗ SIN texto indexado (falta reindex/OCR)',
      aviso: s.aviso || null,
      relevance_score: s.relevance_score != null ? s.relevance_score : null
    });
  });

  const unified = (nutriRes && nutriRes.unified_citations) || [];
  unified.slice(0, 8).forEach((c) => {
    if (!c || !c.line) return;
    routes.push({
      kind: 'neuron',
      module: 'Neuron PRO',
      route: String(c.line),
      nutri_file_id: c.nutri_file_id || null,
      note: 'Cruce apunte ↔ archivo (mapa / relaciones)'
    });
  });

  return routes;
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

  const q = String(body.q || body.question || '').trim();
  if (!q) {
    return jsonResponse(400, { error: 'Indica q (pregunta).' });
  }

  const nutriParams = {
    q,
    question: q,
    nutri_file_id: body.nutri_file_id || body.file_id || undefined,
    folder_id: body.folder_id || undefined,
    limit: body.limit,
    snippet_chars: body.snippet_chars
  };
  const notebookParams = {
    q,
    search: q,
    area_id: body.area_id || undefined,
    limit: body.notebook_limit || 40
  };

  try {
    const [nutriRes, notebookRes] = await Promise.all([
      runAdminAction('nutri_pro_ask', nutriParams).catch((err) => ({
        ok: false,
        domain: 'nutri_pro',
        error: (err && err.message) || String(err)
      })),
      runAdminAction('plan_pro_search', notebookParams).catch((err) => ({
        ok: false,
        domain: 'plan_pro',
        error: (err && err.message) || String(err)
      }))
    ]);

    const routes = buildRoutes(nutriRes, notebookRes);
    const nutriCount =
      (nutriRes && (nutriRes.source_count || (nutriRes.sources && nutriRes.sources.length))) || 0;
    const notebookCount = (notebookRes && notebookRes.count) || ((notebookRes && notebookRes.items) || []).length;

    return jsonResponse(200, {
      ok: true,
      via: 'plan_pro_assistant',
      question: q,
      nutri: nutriRes,
      notebook: notebookRes,
      routes,
      summary: {
        nutri_hits: nutriCount,
        notebook_hits: notebookCount,
        route_count: routes.length
      },
      gpt_hint:
        'Prioriza «routes» para decirle al usuario DÓNDE está (Notebook PRO › … / Nutri PRO › …). ' +
        'Usa snippets de nutri.sources / unified_citations y preview de notebook.items para responder. ' +
        'Neuron PRO = cruces apunte↔archivo en routes kind=neuron. No inventes rutas. ' +
        'Invest PRO = mercados (tickers/gráficas/watchlist) en Plan PRO → pestaña Invest PRO; no inventes precios.'
    });
  } catch (err) {
    return jsonResponse(500, { ok: false, error: (err && err.message) || String(err) });
  }
};
