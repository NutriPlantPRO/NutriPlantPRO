/**
 * Radar pilot — encola NDVI/NDMI async (respuesta rápida) o modo sync legacy (async:false).
 *
 * Netlify env:
 *   RADAR_CDSE_PILOT_ENABLED=true
 *   RADAR_PILOT_PROVIDER=planetary|cdse
 *
 * POST JSON: { polygon, project_id, async?: true, max_dim?, max_scenes? }
 */

const radarCredits = require('./lib/radar-credits');
const {
  monthKey,
  normalizePolygon,
  buildLocationSnapshot,
  sumMonthlyRadarCreditsUsed,
  getActivePilotJob,
  createPendingPilotJob,
  triggerPilotBackground
} = require('./lib/radar-pilot-job');
const { findSentinel2ScenesForComposite } = require('./lib/radar-pilot-stac');
const { renderNdviNdmiCompositePngs } = require('./lib/radar-pilot-render');

const BUCKET = 'radar-ndvi';

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

async function getSupabaseAdmin() {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) return null;
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(url, key);
}

async function getBonusCredits(supabase, userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('radar_credits_bonus')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.warn('pilot getBonusCredits:', error.message);
    return 0;
  }
  return Math.max(0, Math.floor(Number(data?.radar_credits_bonus) || 0));
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Método no permitido' });
  }

  const enabled = String(process.env.RADAR_CDSE_PILOT_ENABLED || '').toLowerCase();
  if (enabled !== 'true' && enabled !== '1' && enabled !== 'yes') {
    return jsonResponse(404, {
      error: 'pilot_disabled',
      message: 'Pilot Radar CDSE desactivado. En Netlify: RADAR_CDSE_PILOT_ENABLED=true'
    });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return jsonResponse(400, { error: 'JSON inválido' });
  }

  const supabase = await getSupabaseAdmin();
  if (!supabase) {
    return jsonResponse(500, { error: 'Supabase no configurado' });
  }

  const authHeader = (event.headers && (event.headers.Authorization || event.headers.authorization)) || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const accessToken = (body.access_token && String(body.access_token).trim()) || bearer;
  if (!accessToken) {
    return jsonResponse(401, { error: 'Falta access_token o Authorization Bearer' });
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken);
  if (userErr || !userData?.user?.id) {
    return jsonResponse(401, { error: 'Token inválido o expirado' });
  }
  const userId = userData.user.id;

  const polygon = normalizePolygon(body.polygon);
  if (!polygon) {
    return jsonResponse(400, {
      error: 'no_polygon',
      message: 'Envía polygon: [[lat,lng],...] con al menos 3 vértices.'
    });
  }

  const projectId = body.project_id != null ? String(body.project_id).trim() : '';
  const useAsync = body.async !== false;
  const maxDim = Math.min(Math.max(Number(body.max_dim) || 512, 256), 2048);
  const maxScenes = Math.min(Math.max(Number(body.max_scenes) || 1, 1), 4);
  const mk = monthKey();
  const baseLimit = radarCredits.getMonthlyBaseLimit();
  const bonus = await getBonusCredits(supabase, userId);
  const limit = baseLimit + bonus;
  const used = await sumMonthlyRadarCreditsUsed(supabase, userId, mk);
  let creditCost = 1;
  let pricing = radarCredits.getRadarCreditPricingInfo(null);
  let projectRow = null;

  if (projectId) {
    const { data: proj, error: projErr } = await supabase
      .from('projects')
      .select('id, user_id, data')
      .eq('id', projectId)
      .maybeSingle();

    if (projErr || !proj) {
      return jsonResponse(404, {
        error: 'project_not_found',
        message: 'Proyecto no encontrado en la nube. Sincroniza el proyecto antes de guardar Radar pilot.'
      });
    }
    if (proj.user_id !== userId) {
      return jsonResponse(403, { error: 'Este proyecto no pertenece a tu cuenta.' });
    }
    projectRow = proj;
    const areaHa = radarCredits.getAreaHectaresFromLocation(projectRow.data?.location);
    creditCost = radarCredits.getRadarCreditCostForArea(areaHa);
    pricing = radarCredits.getRadarCreditPricingInfo(areaHa);
    if (limit > 0 && used + creditCost > limit) {
      return jsonResponse(429, {
        error: 'radar_quota_exceeded',
        message:
          'No tienes créditos Radar suficientes este mes. Este predio requiere ' +
          creditCost +
          ' crédito' +
          (creditCost === 1 ? '' : 's') +
          (areaHa != null ? ' (' + areaHa.toFixed(2) + ' ha).' : '.'),
        credits: {
          used,
          limit,
          base: baseLimit,
          bonus,
          required: creditCost,
          available: Math.max(0, limit - used)
        },
        pricing
      });
    }
  }

  if (useAsync && projectId) {
    const active = await getActivePilotJob(supabase, userId, projectId);
    if (active) {
      return jsonResponse(409, {
        error: 'pilot_job_active',
        message:
          'Ya hay una imagen Pilot generándose para este predio. Revisa «Estado» en unos minutos; no hace falta volver a pulsar Generar.',
        request: { id: active.id, created_at: active.created_at },
        pending_job: { id: active.id, created_at: active.created_at, status: active.meta?.status || 'pending' }
      });
    }

    const queued = await createPendingPilotJob(supabase, {
      userId,
      projectId,
      polygon,
      projectRow,
      creditCost,
      maxDim,
      maxScenes,
      mk
    });
    if (!queued.ok) {
      return jsonResponse(500, { error: 'queue_failed', message: queued.error || 'No se pudo encolar Pilot' });
    }

    const triggered = await triggerPilotBackground(queued.row.id, accessToken);
    if (!triggered) {
      console.warn('Pilot encolado pero no se pudo disparar background:', queued.row.id);
    }

    return jsonResponse(202, {
      ok: true,
      async: true,
      queued: true,
      request: { id: queued.row.id, created_at: queued.row.created_at },
      message:
        'Solicitud enviada. Por temas de datos satelitales la imagen puede tardar unos minutos. Revisa «Estado» o vuelve más tarde; se guardará en la nube aunque cierres NutriPlant.',
      credits: {
        used: used + creditCost,
        limit,
        base: baseLimit,
        bonus,
        reserved: creditCost,
        available: Math.max(0, limit - (used + creditCost))
      },
      pricing
    });
  }

  // Modo sync legacy (async:false) — conservado para pruebas locales
  try {
    const maxScenesSync = maxScenes;
    const bundle = await findSentinel2ScenesForComposite(polygon, { maxScenes: maxScenesSync });
    const rendered = await renderNdviNdmiCompositePngs(
      { scenes: bundle.scenes, bbox4326: bundle.bbox, polygon },
      { maxDim }
    );

    let ndviDataUrl = null;
    let ndmiDataUrl = null;
    const latestScene = bundle.scenes[0] || {};
    let request = null;
    let storagePath = null;
    let ndmiStoragePath = null;
    let signedUrl = null;
    let ndmiSignedUrl = null;
    const locationSnapshot = buildLocationSnapshot(projectRow?.data?.location, polygon);
    const meta = {
      pilot: true,
      engine: 'cdse_pilot',
      async: false,
      status: 'done',
      provider: bundle.provider,
      source: bundle.provider === 'cdse' ? 'CDSE/sentinel-2-l2a' : 'PlanetaryComputer/sentinel-2-l2a',
      date_start: bundle.dateStart,
      date_end: bundle.dateEnd,
      composite: bundle.composite,
      scene_count: bundle.sceneCount,
      lookback_days: bundle.lookbackDays,
      max_cloud_pct: bundle.maxCloudPct,
      scl_masked: true,
      fallback_tier: bundle.fallbackTier || null,
      location_snapshot: locationSnapshot,
      area_hectares: locationSnapshot?.area_hectares ?? null,
      credits_charged: projectId ? creditCost : 0,
      ndvi_vis: { style: 'relative_p10_p90', scale: 'predio' },
      ndmi_vis: { style: 'relative_p10_p90', scale: 'predio' },
      vis: rendered.vis
    };

    if (projectId) {
      const ts = Date.now();
      storagePath = `${userId}/${projectId}/${mk}_${ts}_pilot_ndvi.png`;
      ndmiStoragePath = `${userId}/${projectId}/${mk}_${ts}_pilot_ndmi.png`;
      meta.ndmi_storage_path = ndmiStoragePath;
      meta.images = {
        ndvi: { storage_path: storagePath, label: 'NDVI', description: 'Pilot Copernicus · vigor relativo del predio' },
        ndmi: { storage_path: ndmiStoragePath, label: 'NDMI', description: 'Pilot Copernicus · humedad relativa del dosel' }
      };

      const [upNdvi, upNdmi] = await Promise.all([
        supabase.storage.from(BUCKET).upload(storagePath, rendered.ndviPng, { contentType: 'image/png', upsert: true }),
        supabase.storage.from(BUCKET).upload(ndmiStoragePath, rendered.ndmiPng, { contentType: 'image/png', upsert: true })
      ]);
      if (upNdvi.error) {
        return jsonResponse(500, { error: 'storage_upload_failed', message: upNdvi.error.message });
      }
      if (upNdmi.error) {
        return jsonResponse(500, { error: 'storage_upload_failed', message: upNdmi.error.message });
      }

      const { data: insRow, error: insErr } = await supabase
        .from('radar_requests')
        .insert({
          user_id: userId,
          project_id: projectId,
          month_key: mk,
          image_storage_path: storagePath,
          meta
        })
        .select('id, created_at')
        .single();

      if (insErr) {
        return jsonResponse(500, { error: 'db_insert_failed', message: insErr.message });
      }
      request = insRow;

      const [signedNdvi, signedNdmi] = await Promise.all([
        supabase.storage.from(BUCKET).createSignedUrl(storagePath, 3600),
        supabase.storage.from(BUCKET).createSignedUrl(ndmiStoragePath, 3600)
      ]);
      signedUrl = signedNdvi.data?.signedUrl || null;
      ndmiSignedUrl = signedNdmi.data?.signedUrl || null;
    } else {
      meta.note = 'Mediana 30 d + SCL; no guardado porque no se envió project_id.';
      ndviDataUrl = 'data:image/png;base64,' + rendered.ndviPng.toString('base64');
      ndmiDataUrl = 'data:image/png;base64,' + rendered.ndmiPng.toString('base64');
    }

    return jsonResponse(200, {
      ok: true,
      pilot: true,
      async: false,
      request,
      month_key: mk,
      provider: bundle.provider,
      signed_url: signedUrl,
      ndmi_signed_url: ndmiSignedUrl,
      ndvi_data_url: ndviDataUrl,
      ndmi_data_url: ndmiDataUrl,
      meta
    });
  } catch (e) {
    console.error('radar-cdse-pilot sync:', e);
    return jsonResponse(502, {
      error: 'pilot_render_failed',
      message: e.message || 'No se pudo generar NDVI/NDMI pilot'
    });
  }
};
