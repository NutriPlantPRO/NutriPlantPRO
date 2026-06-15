/**
 * Feed ICS en vivo para suscripción Outlook / Apple Calendar (webcal).
 * GET ?token=SECRET → text/calendar
 * GET + Authorization Bearer (admin) → JSON con URLs de suscripción
 */

const { createClient } = require('@supabase/supabase-js');
const {
  ORGANIZER_EMAIL,
  collectCalendarEntriesFromItems,
  buildPlanProIcsFromEntries
} = require('./lib/plan-pro-calendar-ics');

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}

async function verifyAdmin(supabase, accessToken) {
  const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken);
  if (userErr || !userData?.user?.id) {
    return { ok: false, status: 401, error: 'Token inválido o expirado.' };
  }
  const { data: prof, error: profErr } = await supabase
    .from('profiles')
    .select('is_admin, email')
    .eq('id', userData.user.id)
    .maybeSingle();
  if (profErr || !prof?.is_admin) {
    return { ok: false, status: 403, error: 'Solo administrador puede ver el enlace de suscripción.' };
  }
  return { ok: true, userId: userData.user.id, email: prof.email || userData.user.email || '' };
}

async function resolveOwnerId(supabase) {
  const fixed = (process.env.PLAN_PRO_CALENDAR_OWNER_ID || '').trim();
  if (fixed) return fixed;
  const { data: admins } = await supabase.from('profiles').select('id').eq('is_admin', true).limit(1);
  if (admins && admins[0] && admins[0].id) return admins[0].id;
  return null;
}

async function loadCalendarData(supabase, ownerId) {
  const selectCols =
    'id,title,area_id,category_id,status,priority,sort_order,updated_at,closed_at,body_plain,body_html,due_at,body_blocks,attachments';
  let res = await supabase
    .from('plan_pro_items')
    .select(selectCols)
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false });
  if (res.error && /sort_order|column|schema cache/i.test(res.error.message || '')) {
    res = await supabase
      .from('plan_pro_items')
      .select(
        'id,title,area_id,category_id,status,priority,updated_at,closed_at,body_plain,body_html,due_at,body_blocks,attachments'
      )
      .eq('owner_id', ownerId)
      .order('updated_at', { ascending: false });
  }
  if (res.error) throw res.error;
  const items = res.data || [];
  const areaIds = [...new Set(items.map((r) => r.area_id).filter(Boolean))];
  const { data: areas } = areaIds.length
    ? await supabase.from('plan_pro_areas').select('id,title').in('id', areaIds)
    : { data: [] };
  const { data: categories } = await supabase
    .from('plan_pro_categories')
    .select('id,title,parent_id,area_id')
    .eq('owner_id', ownerId);
  return { items, areas: areas || [], categories: categories || [] };
}

function buildSubscribeUrls(event, token) {
  const host = (event.headers && (event.headers.host || event.headers.Host)) || '';
  const proto =
    (event.headers && (event.headers['x-forwarded-proto'] || event.headers['X-Forwarded-Proto'])) || 'https';
  const base = host ? `${proto}://${host}` : '';
  const httpsUrl = `${base}/api/plan-pro-calendar-feed?token=${encodeURIComponent(token)}`;
  const webcalUrl = httpsUrl.replace(/^https:\/\//i, 'webcal://');
  return { httpsUrl, webcalUrl, base };
}

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Método no permitido' });
  }

  const params = event.queryStringParameters || {};
  const token = (params.token || '').trim();
  const feedToken = (process.env.PLAN_PRO_CALENDAR_FEED_TOKEN || '').trim();
  const authHeader = (event.headers && (event.headers.Authorization || event.headers.authorization)) || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const wantsMeta = !token && bearer;

  if (wantsMeta) {
    const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
    const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    if (!supabaseUrl || !serviceKey) {
      return jsonResponse(500, { error: 'Supabase no configurado en el servidor.' });
    }
    const supabase = createClient(supabaseUrl, serviceKey);
    const adminCheck = await verifyAdmin(supabase, bearer);
    if (!adminCheck.ok) return jsonResponse(adminCheck.status, { error: adminCheck.error });
    if (!feedToken) {
      return jsonResponse(503, {
        error: 'token_not_configured',
        message:
          'Falta PLAN_PRO_CALENDAR_FEED_TOKEN en Netlify. Genera uno (ej. openssl rand -hex 24) y vuelve a desplegar.'
      });
    }
    const urls = buildSubscribeUrls(event, feedToken);
    return jsonResponse(200, {
      ok: true,
      ...urls,
      organizerEmail: ORGANIZER_EMAIL,
      hint: 'Usa el enlace webcal o https en Outlook → Agregar calendario → Suscribirse desde web.'
    });
  }

  if (!feedToken || token !== feedToken) {
    return jsonResponse(401, { error: 'Token de calendario no válido.' });
  }

  const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse(500, { error: 'Supabase no configurado.' });
  }
  const supabase = createClient(supabaseUrl, serviceKey);
  const ownerId = await resolveOwnerId(supabase);
  if (!ownerId) {
    return jsonResponse(404, { error: 'No hay administrador configurado para el calendario.' });
  }

  try {
    const { items, areas, categories } = await loadCalendarData(supabase, ownerId);
    const entries = collectCalendarEntriesFromItems(items, areas, categories);
    entries.sort(
      (a, b) =>
        String(a.dateKey).localeCompare(String(b.dateKey)) ||
        String(a.itemTitle || '').localeCompare(String(b.itemTitle || ''))
    );
    const ics = buildPlanProIcsFromEntries(entries, ORGANIZER_EMAIL);
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders(),
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="plan-pro.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Plan-Pro-Events': String(entries.length)
      },
      body: ics
    };
  } catch (err) {
    console.error('plan-pro-calendar-feed:', err);
    return jsonResponse(502, { error: (err && err.message) || 'No se pudo generar el calendario.' });
  }
};
