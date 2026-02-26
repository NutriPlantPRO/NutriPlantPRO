/**
 * Netlify Function: proxy a OpenAI para el chat de NutriPlant PRO.
 * La API key NUNCA va en el frontend; se usa la variable de entorno OPENAI_API_KEY en Netlify.
 *
 * En Netlify: Site → Site configuration → Environment variables → Add variable
 *   Key: OPENAI_API_KEY
 *   Value: sk-proj-... (tu clave de OpenAI)
 */

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
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Método no permitido' })
    };
  }

  const apiKey = process.env.OPENAI_API_KEY || '';
  if (!apiKey || apiKey.startsWith('sk-your') || apiKey === 'TU_API_KEY_AQUI') {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'OPENAI_API_KEY no configurada',
        message: 'En Netlify: Site configuration → Environment variables → añade OPENAI_API_KEY con tu clave de OpenAI.'
      })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'JSON inválido' })
    };
  }

  const model = body.model || 'gpt-4o-mini';
  const messages = body.messages || [];
  const max_tokens = Math.min(Math.max(Number(body.max_tokens) || 600, 1), 2000);
  const temperature = Math.max(0, Math.min(1, Number(body.temperature) || 0.4));

  if (!Array.isArray(messages) || messages.length === 0) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'messages es obligatorio y debe ser un array' })
    };
  }

  const payload = {
    model,
    messages,
    max_tokens,
    temperature
  };

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

    return {
      statusCode: res.ok ? 200 : res.status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'Error de conexión con OpenAI',
        details: err.message
      })
    };
  }
};
