const BUCKET = 'radar-ndvi';
const CACHE_FOLDER = '_admin-cloud-context';
const CACHE_TTL_MS = 5 * 24 * 60 * 60 * 1000;
const PAGE_SIZE = 100;
const MAX_SCAN = 1000;
const MAX_DELETE = 200;

exports.config = { schedule: '17 4 * * *' };

async function getSupabaseAdmin() {
  const url = String(process.env.SUPABASE_URL || '').trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) return null;
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(url, key);
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}

exports.handler = async function handler(event, context) {
  const scheduled =
    !!context?.next_run || event.headers?.['x-netlify-event'] === 'schedule';
  const expectedSecret = String(process.env.RADAR_CLOUD_CLEANUP_SECRET || '');
  const suppliedSecret = String(event.queryStringParameters?.secret || '');
  if (!scheduled && (!expectedSecret || suppliedSecret !== expectedSecret)) {
    return response(403, { ok: false, message: 'Acceso no autorizado' });
  }

  try {
    const supabase = await getSupabaseAdmin();
    if (!supabase) throw new Error('Falta configuración Supabase');
    const cutoff = Date.now() - CACHE_TTL_MS;
    const expiredPaths = [];
    let scanned = 0;

    for (let offset = 0; offset < MAX_SCAN && expiredPaths.length < MAX_DELETE; offset += PAGE_SIZE) {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(CACHE_FOLDER, {
          limit: PAGE_SIZE,
          offset,
          sortBy: { column: 'created_at', order: 'asc' }
        });
      if (error) throw new Error(error.message);
      const items = data || [];
      scanned += items.length;
      for (const item of items) {
        const createdAt = Date.parse(item.created_at || item.updated_at || '');
        if (Number.isFinite(createdAt) && createdAt < cutoff) {
          expiredPaths.push(CACHE_FOLDER + '/' + item.name);
          if (expiredPaths.length >= MAX_DELETE) break;
        }
      }
      if (items.length < PAGE_SIZE) break;
    }

    if (expiredPaths.length) {
      const { error: removeError } = await supabase.storage
        .from(BUCKET)
        .remove(expiredPaths);
      if (removeError) throw new Error(removeError.message);
    }

    return response(200, {
      ok: true,
      scanned,
      deleted: expiredPaths.length,
      retention_days: 5
    });
  } catch (error) {
    console.error('radar-cloud-context-cleanup:', error);
    return response(500, {
      ok: false,
      message: error?.message || 'No se pudo limpiar la caché regional'
    });
  }
};
