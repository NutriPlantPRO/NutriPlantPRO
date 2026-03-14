/**
 * Netlify Function: proxy a OpenAI para el chat de NutriPlant PRO.
 * Aplica límite mensual por usuario (créditos) leyendo/actualizando Supabase profiles.
 *
 * Variables de entorno en Netlify:
 *   OPENAI_API_KEY      - Clave de OpenAI (obligatoria)
 *   SUPABASE_URL        - URL del proyecto Supabase (para cuota por usuario)
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key (para leer/actualizar profiles)
 *
 * En profiles: chat_limit_monthly (créditos, -1 = sin límite), chat_usage_current_month (créditos),
 *   chat_usage_month (ej. "2025-02"). Si faltan columnas, crear en Supabase.
 *
 * Búsqueda web (opcional): si el body envía allowWebSearch: true y está definida SERPER_API_KEY
 * en Netlify, el modelo puede usar la herramienta search_web; cuando la use, se cobran 2 créditos.
 * Sin SERPER_API_KEY la herramienta no se ofrece. Obtener API key en https://serper.dev
 */

const MODEL_PRICING_USD_PER_1M = {
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 5.0, output: 15.0 }
};
const DEFAULT_MONTHLY_CREDITS = 500;
const CREDITS_TEXT_MESSAGE = 1;
const CREDITS_IMAGE_MESSAGE = 3; // 1 imagen por mensaje
const CREDITS_WEB_SEARCH = 2; // cuando el asistente consulta la web en esta petición

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

function countInlineImages(messages) {
  if (!Array.isArray(messages)) return 0;
  let count = 0;
  for (const m of messages) {
    if (!m || typeof m !== 'object' || !Array.isArray(m.content)) continue;
    for (const part of m.content) {
      if (part && typeof part === 'object' && part.type === 'image_url' && part.image_url && part.image_url.url) {
        count += 1;
      }
    }
  }
  return count;
}

function roughInputTokens(messages, imageCount = 0) {
  if (!Array.isArray(messages)) return 0;
  let total = 0;
  for (const m of messages) {
    if (m && typeof m === 'object' && m.content != null) {
      if (Array.isArray(m.content)) {
        m.content.forEach(part => {
          if (part && typeof part === 'object' && part.type === 'text' && part.text) total += String(part.text).length;
        });
      } else {
        total += String(m.content).length;
      }
    }
  }
  let tokens = total > 0 ? Math.max(Math.floor(total / 4), 1) : 0;
  if (imageCount > 0) tokens += (1200 * imageCount); // estimado tokens por imagen para cuota preventiva
  return tokens;
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

/** Herramienta: búsqueda web (Serper). Si SERPER_API_KEY no está definida, devuelve mensaje indicando que no está configurada. */
async function runWebSearch(query) {
  const key = (process.env.SERPER_API_KEY || '').trim();
  if (!key) return 'Búsqueda web no configurada en el servidor (falta SERPER_API_KEY). Responde con tu conocimiento.';
  const q = (query && String(query).trim()) ? String(query).trim().slice(0, 200) : '';
  if (!q) return 'Query vacío.';
  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': key },
      body: JSON.stringify({ q, num: 5 })
    });
    const data = await res.json().catch(() => ({}));
    const organic = (data.organic || []).slice(0, 5);
    if (organic.length === 0) return 'Sin resultados para esa búsqueda.';
    return organic.map((o, i) => `[${i + 1}] ${o.title || ''}\n${o.snippet || ''}\n${o.link || ''}`).join('\n\n');
  } catch (e) {
    return `Error al buscar: ${e.message}. Responde con tu conocimiento.`;
  }
}

const WEB_SEARCH_TOOL = {
  type: 'function',
  function: {
    name: 'search_web',
    description: 'Buscar en la web información actual cuando el usuario pide datos que no están en el contexto (referencias, fórmulas de autores, datos recientes, composición de soluciones nutritivas, etc.). Usar SOLO cuando sea necesario para responder con precisión; no usar para preguntas que ya puedes responder con el manual o los datos del proyecto.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Consulta de búsqueda en español o inglés' } },
      required: ['query']
    }
  }
};

/** Obtiene límite y uso del usuario desde Supabase (solo si hay client configurado). */
async function getQuotaFromSupabase(supabase, userId) {
  if (!supabase || !userId || userId === 'anonymous') return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('chat_blocked, chat_limit_monthly, chat_usage_current_month, chat_usage_month, subscription_status, cancelled_by_admin, next_payment_date')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.warn('Supabase getQuota error:', error.message);
    return null;
  }
  return data;
}

/** Actualiza uso mensual en Supabase. Si el mes cambió, resetea uso; luego suma créditos. */
async function addUsageInSupabase(supabase, userId, creditsToAdd) {
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
  usage = Math.max(0, Math.round((usage + (Number(creditsToAdd) || 0)) * 1000) / 1000);
  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ chat_usage_current_month: usage, chat_usage_month: currentMonth })
    .eq('id', userId);
  if (updateErr) console.warn('Supabase update usage error:', updateErr.message);
}

/** Mismo criterio que usuarios: estimado USD por petición. Cuenta en todos los equipos (Supabase). */
const ADMIN_CHAT_USD_PER_REQUEST = 0.001;
const ADMIN_CHAT_USD_PER_IMAGE = 0.003;

async function addAdminUsageInSupabase(supabase, hasImage) {
  if (!supabase) return;
  const currentMonth = monthKey();
  const cost = hasImage ? ADMIN_CHAT_USD_PER_IMAGE : ADMIN_CHAT_USD_PER_REQUEST;
  const { data: row, error: selectErr } = await supabase
    .from('admin_chat_usage')
    .select('total_requests, total_usd_est, month_key, month_requests, month_usd_est')
    .eq('id', 'default')
    .maybeSingle();
  if (selectErr) {
    console.warn('Supabase admin_chat_usage select error:', selectErr.message);
    return;
  }
  let totalRequests = Number(row?.total_requests) || 0;
  let totalUsd = Number(row?.total_usd_est) || 0;
  let monthRequests = Number(row?.month_requests) || 0;
  let monthUsd = Number(row?.month_usd_est) || 0;
  const rowMonth = row?.month_key || '';
  if (rowMonth !== currentMonth) {
    monthRequests = 0;
    monthUsd = 0;
  }
  totalRequests += 1;
  totalUsd = Math.round((totalUsd + cost) * 1e8) / 1e8;
  monthRequests += 1;
  monthUsd = Math.round((monthUsd + cost) * 1e8) / 1e8;
  const { error: upsertErr } = await supabase
    .from('admin_chat_usage')
    .upsert({
      id: 'default',
      total_requests: totalRequests,
      total_usd_est: totalUsd,
      month_key: currentMonth,
      month_requests: monthRequests,
      month_usd_est: monthUsd,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
  if (upsertErr) console.warn('Supabase admin_chat_usage upsert error:', upsertErr.message);
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
  let messages = Array.isArray(body.messages) ? [...body.messages] : [];
  const max_tokens = Math.min(Math.max(Number(body.max_tokens) || 600, 1), 2000);
  const temperature = Math.max(0, Math.min(1, Number(body.temperature) || 0.4));
  let userId = String(body.userId || body.user_id || 'anonymous');
  const scopeAdmin = body.scope === 'admin' || userId === '__admin__';
  if (scopeAdmin) userId = '__admin__';

  const imageBase64 = (body.imageBase64 && String(body.imageBase64).trim()) ? String(body.imageBase64).trim() : null;
  const imageContentType = (body.imageContentType && String(body.imageContentType).trim()) ? String(body.imageContentType).trim() : 'image/jpeg';
  const allowWebSearch = body.allowWebSearch === true || body.allow_web_search === true;

  if (messages.length === 0) {
    return jsonResponse(400, { error: 'messages es obligatorio y debe ser un array' });
  }

  // Si hay imagen explícita en body, convertir el último mensaje user en multimodal (vision)
  if (imageBase64 && messages.length > 0) {
    let lastIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i] && messages[i].role === 'user') {
        lastIdx = i;
        break;
      }
    }
    if (lastIdx >= 0) {
      const last = messages[lastIdx];
      const text = (last.content && typeof last.content === 'string') ? last.content : '';
      const url = 'data:' + (imageContentType || 'image/jpeg') + ';base64,' + imageBase64;
      messages[lastIdx] = {
        ...last,
        content: [
          { type: 'text', text: text || '¿Qué puedes ver en esta imagen en contexto de mi proyecto?' },
          { type: 'image_url', image_url: { url } }
        ]
      };
    }
  }
  const inlineImageCount = countInlineImages(messages);
  const totalImageCount = Math.max(inlineImageCount, imageBase64 ? 1 : 0);

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

  if (supabase && userId && userId !== 'anonymous' && userId !== '__admin__') {
    const quota = await getQuotaFromSupabase(supabase, userId);
    if (quota) {
      if (quota.chat_blocked === true) {
        return jsonResponse(403, {
          error: 'chat_blocked',
          message: 'El chat con la IA está deshabilitado para tu cuenta. Contacta al administrador si necesitas activarlo.'
        });
      }
      let limitCredits = quota.chat_limit_monthly;
      const hasAccess = quota.subscription_status === 'active' || (quota.subscription_status === 'cancelled' && quota.cancelled_by_admin !== true && quota.next_payment_date && new Date() <= new Date(quota.next_payment_date + 'T23:59:59'));
      const isActiveSubscriber = !!hasAccess;
      if (limitCredits === -1 || limitCredits == null || limitCredits === '' || limitCredits === undefined) {
        limitCredits = isActiveSubscriber ? DEFAULT_MONTHLY_CREDITS : -1;
      } else {
        limitCredits = Math.max(0, Number(limitCredits));
      }
      if (limitCredits >= 0) {
        let usedCredits = Number(quota.chat_usage_current_month) || 0;
        const usageMonth = quota.chat_usage_month || '';
        if (usageMonth !== currentMonth) usedCredits = 0;
        const requiredCredits = totalImageCount > 0
          ? CREDITS_IMAGE_MESSAGE
          : (allowWebSearch ? CREDITS_WEB_SEARCH : CREDITS_TEXT_MESSAGE);

        if (usedCredits >= limitCredits) {
          return jsonResponse(429, {
            error: 'quota_exceeded',
            message: 'Has alcanzado el límite mensual de chat.',
            quota: { month: currentMonth, limit_credits: limitCredits, used_credits: Math.floor(usedCredits) }
          });
        }
        if (usedCredits + requiredCredits > limitCredits) {
          return jsonResponse(429, {
            error: 'quota_preventive_block',
            message: 'Has alcanzado el límite mensual de chat.',
            quota: {
              month: currentMonth,
              limit_credits: limitCredits,
              used_credits: Math.floor(usedCredits),
              required_credits: requiredCredits
            }
          });
        }
      }
    }
  }

  const serperKey = (process.env.SERPER_API_KEY || '').trim();
  const webSearchEnabled = allowWebSearch && !!serperKey;

  let usedWebSearch = false;
  let currentMessages = [...messages];
  let payload = { model, messages: currentMessages, max_tokens, temperature };
  if (webSearchEnabled) {
    payload.tools = [WEB_SEARCH_TOOL];
    payload.tool_choice = 'auto';
  }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    let text = await res.text();
    let data = {};
    try {
      data = JSON.parse(text);
    } catch (_) {
      data = { error: text || 'Respuesta no JSON' };
    }

    const choice = data.choices && data.choices[0];
    const msg = choice && choice.message;

    if (res.ok && webSearchEnabled && msg && msg.tool_calls && msg.tool_calls.length > 0) {
      const searchCall = msg.tool_calls.find(tc => tc.function && tc.function.name === 'search_web');
      if (searchCall && searchCall.function && searchCall.function.arguments) {
        let args = {};
        try {
          args = JSON.parse(searchCall.function.arguments);
        } catch (_) {}
        const query = args.query || '';
        const searchResult = await runWebSearch(query);
        usedWebSearch = true;
        currentMessages.push(msg);
        currentMessages.push({
          role: 'tool',
          tool_call_id: searchCall.id,
          content: searchResult.slice(0, 4000)
        });
        const secondPayload = { model, messages: currentMessages, max_tokens, temperature };
        const res2 = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify(secondPayload)
        });
        const text2 = await res2.text();
        if (res2.ok) {
          try {
            data = JSON.parse(text2);
          } catch (_) {}
        }
      }
    }

    if (res.ok && supabase && userId && userId !== 'anonymous' && userId !== '__admin__') {
      const creditsUsed = totalImageCount > 0
        ? CREDITS_IMAGE_MESSAGE
        : (usedWebSearch ? CREDITS_WEB_SEARCH : CREDITS_TEXT_MESSAGE);
      await addUsageInSupabase(supabase, userId, creditsUsed);
      if (!data._nutriplant) data._nutriplant = {};
      data._nutriplant.month = currentMonth;
      data._nutriplant.credits_used_this_request = creditsUsed;
      data._nutriplant.used_web_search = usedWebSearch;
      if (data.usage) {
        const pt = Number(data.usage.prompt_tokens) || 0;
        const ct = Number(data.usage.completion_tokens) || 0;
        const costUsd = tokenCostUsd(model, pt, ct);
        data._nutriplant.estimated_cost_usd = Math.round(costUsd * 1e8) / 1e8;
      }
    }
    if (res.ok && supabase && scopeAdmin) {
      await addAdminUsageInSupabase(supabase, totalImageCount > 0);
    }
    if (!data._nutriplant) data._nutriplant = {};
    data._nutriplant.image_received = totalImageCount > 0;
    data._nutriplant.image_count = totalImageCount;
    data._nutriplant.used_web_search = usedWebSearch;

    const hasContent = data.choices && data.choices[0] && data.choices[0].message;
    return {
      statusCode: hasContent ? 200 : (res.status || 500),
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
