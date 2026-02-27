/**
 * Netlify Function: proxy a OpenAI para el chat de NutriPlant PRO.
 * Aplica límite mensual por usuario (USD) leyendo/actualizando Supabase profiles.
 *
 * Variables de entorno en Netlify:
 *   OPENAI_API_KEY      - Clave de OpenAI (obligatoria)
 *   SUPABASE_URL        - URL del proyecto Supabase (para cuota por usuario)
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key (para leer/actualizar profiles)
 *
 * En profiles: chat_limit_monthly (USD, -1 = sin límite), chat_usage_current_month (USD),
 *   chat_usage_month (ej. "2025-02"). Si faltan columnas, crear en Supabase.
 */

const MODEL_PRICING_USD_PER_1M = {
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 5.0, output: 15.0 }
};

function monthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function tokenCostUsd(model, promptTokens, completionTokens) {
  const pricing = MODEL_PRICING_USD_PER_1M[model] || MODEL_PRICING_USD_PER_1M['gpt-4o-mini'];
  const inCost = (Math.max(promptTokens, 0) / 1e6) * pricing.input;
  const outCost = (Math.max(completionTokens, 0) / 1e6) * pricing.output;
  return inCost + outCost;
}

function roughInputTokens(messages) {
  if (!Array.isArray(messages)) return 0;
  let total = 0;
  for (const m of messages) {
    if (m && typeof m === 'object' && m.content != null) total += String(m.content).length;
  }
  return total > 0 ? Math.max(Math.floor(total / 4), 1) : 0;
}

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };
}

function jsonResponse(statusCode, body) {
  return { statusCode, headers: corsHeaders(), body: JSON.stringify(body) };
}

/** Obtiene límite y uso del usuario desde Supabase (solo si hay client configurado). */
async function getQuotaFromSupabase(supabase, userId) {
  if (!supabase || !userId || userId === 'anonymous') return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('chat_blocked, chat_limit_monthly, chat_usage_current_month, chat_usage_month')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.warn('Supabase getQuota error:', error.message);
    return null;
  }
  return data;
}

/** Actualiza uso mensual en Supabase. Si el mes cambió, resetea uso; luego suma costUsd. */
async function addUsageInSupabase(supabase, userId, costUsd) {
  if (!supabase || !userId || userId === 'anonymous') return;
  const currentMonth = monthKey();
  const { data: row, error: selectErr } = await supabase
    .from('profiles')
    .select('chat_usage_current_month, chat_usage_month')
    .eq('id', userId)
    .maybeSingle();
  if (selectErr) {
    console.warn('Supabase select usage error:', selectErr.message);
    return;
  }
  let usage = Number(row?.chat_usage_current_month) || 0;
  const usageMonth = row?.chat_usage_month || '';
  if (usageMonth !== currentMonth) usage = 0;
  usage = Math.round((usage + costUsd) * 1e8) / 1e8;
  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ chat_usage_current_month: usage, chat_usage_month: currentMonth })
    .eq('id', userId);
  if (updateErr) console.warn('Supabase update usage error:', updateErr.message);
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Método no permitido' });
  }

  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey || apiKey.startsWith('sk-your') || apiKey === 'TU_API_KEY_AQUI') {
    return jsonResponse(500, {
      error: 'OPENAI_API_KEY no configurada',
      message: 'En Netlify: Site configuration → Environment variables → añade OPENAI_API_KEY.'
    });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return jsonResponse(400, { error: 'JSON inválido' });
  }

  const model = body.model || 'gpt-4o-mini';
  const messages = body.messages || [];
  const max_tokens = Math.min(Math.max(Number(body.max_tokens) || 600, 1), 2000);
  const temperature = Math.max(0, Math.min(1, Number(body.temperature) || 0.4));
  const userId = String(body.userId || body.user_id || 'anonymous');

  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonResponse(400, { error: 'messages es obligatorio y debe ser un array' });
  }

  let supabase = null;
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (supabaseUrl && supabaseServiceKey) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      supabase = createClient(supabaseUrl, supabaseServiceKey);
    } catch (e) {
      console.warn('Supabase client not available:', e.message);
    }
  }

  const currentMonth = monthKey();
  const defaultLimitUsd = 1.0;

  if (supabase && userId && userId !== 'anonymous') {
    const quota = await getQuotaFromSupabase(supabase, userId);
    if (quota) {
      if (quota.chat_blocked === true) {
        return jsonResponse(403, {
          error: 'chat_blocked',
          message: 'El chat con la IA está deshabilitado para tu cuenta. Contacta al administrador si necesitas activarlo.'
        });
      }
      let limitUsd = quota.chat_limit_monthly;
      if (limitUsd === -1 || limitUsd == null || limitUsd === '' || limitUsd === undefined) {
        limitUsd = -1;
      } else {
        limitUsd = Math.max(0, Number(limitUsd));
      }
      if (limitUsd >= 0) {
        let usedUsd = Number(quota.chat_usage_current_month) || 0;
        const usageMonth = quota.chat_usage_month || '';
        if (usageMonth !== currentMonth) usedUsd = 0;

        if (usedUsd >= limitUsd) {
          return jsonResponse(429, {
            error: 'quota_exceeded',
            message: 'Has alcanzado el límite mensual de chat.',
            quota: { month: currentMonth, limit_usd: limitUsd, used_usd: Math.round(usedUsd * 1e6) / 1e6 }
          });
        }

        const roughPrompt = roughInputTokens(messages);
        const projectedCost = tokenCostUsd(model, roughPrompt, max_tokens);
        if (usedUsd + projectedCost > limitUsd) {
          return jsonResponse(429, {
            error: 'quota_preventive_block',
            message: 'Has alcanzado el límite mensual de chat.',
            quota: {
              month: currentMonth,
              limit_usd: limitUsd,
              used_usd: Math.round(usedUsd * 1e6) / 1e6,
              projected_extra_usd: Math.round(projectedCost * 1e6) / 1e6
            }
          });
        }
      }
    }
  }

  const payload = { model, messages, max_tokens, temperature };

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    let data = {};
    try {
      data = JSON.parse(text);
    } catch (_) {
      data = { error: text || 'Respuesta no JSON' };
    }

    if (res.ok && data.usage && supabase && userId && userId !== 'anonymous') {
      const pt = Number(data.usage.prompt_tokens) || 0;
      const ct = Number(data.usage.completion_tokens) || 0;
      const costUsd = tokenCostUsd(model, pt, ct);
      await addUsageInSupabase(supabase, userId, costUsd);
      if (!data._nutriplant) data._nutriplant = {};
      data._nutriplant.estimated_cost_usd = Math.round(costUsd * 1e8) / 1e8;
      data._nutriplant.month = currentMonth;
    }

    return {
      statusCode: res.ok ? 200 : res.status,
      headers: corsHeaders(),
      body: JSON.stringify(data)
    };
  } catch (err) {
    return jsonResponse(502, {
      error: 'Error de conexión con OpenAI',
      details: err.message
    });
  }
};
