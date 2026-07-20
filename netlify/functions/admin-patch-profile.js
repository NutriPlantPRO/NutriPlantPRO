/**
 * PATCH public.profiles por id con service_role (bypass RLS).
 * Misma clave ?k= del panel admin (NUTRIPLANT_ADMIN_KEY).
 *
 * Body: { admin_key, user_id, profile: { ... } }
 */
const { createClient } = require('@supabase/supabase-js');

const ALLOWED_KEYS = new Set([
  'name',
  'email',
  'phone',
  'profession',
  'location',
  'crops',
  'subscription_status',
  'subscription_amount',
  'cancelled_by_admin',
  'chat_blocked',
  'chat_limit_monthly',
  'chat_usage_current_month',
  'chat_usage_month',
  'exclude_from_revenue',
  'password_plain',
  'radar_credits_bonus',
  'updated_at'
]);

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
}

function json(statusCode, body) {
  return { statusCode, headers: corsHeaders(), body: JSON.stringify(body) };
}

function isUuid(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id || ''));
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Método no permitido' });
  }

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return json(400, { ok: false, error: 'Cuerpo JSON inválido' });
  }

  const expectedKey = (process.env.NUTRIPLANT_ADMIN_KEY || 'np_admin_key_8f4a2b9c1e7d').trim();
  const adminKey = body.admin_key != null ? String(body.admin_key).trim() : '';
  if (!adminKey || adminKey !== expectedKey) {
    return json(403, { ok: false, error: 'Acceso no autorizado' });
  }

  const userId = body.user_id != null ? String(body.user_id).trim() : '';
  const profile = body.profile;
  if (!isUuid(userId) || !profile || typeof profile !== 'object') {
    return json(400, { ok: false, error: 'user_id (UUID) y profile (objeto) son obligatorios' });
  }

  const clean = {};
  Object.keys(profile).forEach(function (k) {
    if (ALLOWED_KEYS.has(k)) clean[k] = profile[k];
  });
  if (clean.radar_credits_bonus != null) {
    clean.radar_credits_bonus = Math.max(0, Math.floor(Number(clean.radar_credits_bonus) || 0));
  }
  if (!Object.keys(clean).length) {
    return json(400, { ok: false, error: 'profile vacío o sin campos permitidos' });
  }

  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) {
    return json(500, {
      ok: false,
      error: 'Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en Netlify.'
    });
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from('profiles')
    .update(clean)
    .eq('id', userId)
    .select('id, radar_credits_bonus');

  if (error) {
    const msg = String(error.message || '');
    if (/radar_credits_bonus/i.test(msg) && /column/i.test(msg)) {
      const withoutBonus = Object.assign({}, clean);
      delete withoutBonus.radar_credits_bonus;
      const retry = await supabase.from('profiles').update(withoutBonus).eq('id', userId).select('id');
      if (retry.error) {
        return json(502, { ok: false, error: retry.error.message, data: [] });
      }
      return json(200, {
        ok: true,
        data: retry.data || [],
        warning:
          'Bonus Radar NO guardado: falta columna radar_credits_bonus. Ejecuta supabase/migrations/20260426_radar_profiles_bonus.sql'
      });
    }
    return json(502, { ok: false, error: error.message, data: [] });
  }

  if (!data || !data.length) {
    return json(404, {
      ok: false,
      error: 'No se actualizó ninguna fila (¿id inexistente en profiles?)',
      data: []
    });
  }

  return json(200, { ok: true, data: data });
};
