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
  createPendingLecturaJob,
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
  const maxScenes = Math.min(Math.max(Number(body.max_scenes) || 8, 1), 8);
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
    const areaLimitErr = radarCredits.getRadarAreaLimitError(areaHa);
    if (areaLimitErr) {
      return jsonResponse(400, {
        ...areaLimitErr,
        credits: {
          used,
          limit,
          base: baseLimit,
          bonus,
          available: Math.max(0, limit - used)
        },
        pricing
      });
    }
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

  // ===== Lectura Satelital (histórico por periodos) =====
  if (body.lectura && projectId) {
    const rawPeriods = Array.isArray(body.periods) ? body.periods : [];
    const periods = rawPeriods
      .map((p, i) => ({
        index: Number.isFinite(Number(p.index)) ? Number(p.index) : i,
        label: String(p.label || '').slice(0, 60),
        frequency: p.frequency === 'mensual' ? 'mensual' : 'quincenal',
        date_start: String(p.date_start || '').slice(0, 10),
        date_end: String(p.date_end || '').slice(0, 10)
      }))
      .filter((p) => p.date_start && p.date_end);

    if (periods.length < 2 || periods.length > 6) {
      return jsonResponse(400, {
        error: 'lectura_invalid_periods',
        message: 'Selecciona entre 2 y 6 periodos válidos para la Lectura Satelital.'
      });
    }

    // Costo FIJO por consulta completa (no por periodo):
    // predio normal (≤30 ha) = 3 créditos; predio >30 ha = 4 créditos.
    const totalCost = creditCost >= 2 ? 4 : 3;
    if (limit > 0 && used + totalCost > limit) {
      return jsonResponse(429, {
        error: 'radar_quota_exceeded',
        message:
          'No tienes créditos Radar suficientes este mes. La Lectura Satelital requiere ' +
          totalCost +
          ' crédito' +
          (totalCost === 1 ? '' : 's') +
          ' por toda la consulta.',
        credits: {
          used,
          limit,
          base: baseLimit,
          bonus,
          required: totalCost,
          available: Math.max(0, limit - used)
        },
        pricing
      });
    }

    const created = [];
    for (let i = 0; i < periods.length; i++) {
      const period = periods[i];
      // Todo el costo fijo se carga en el primer periodo; los demás no cobran.
      const jobCost = i === 0 ? totalCost : 0;
      const queued = await createPendingLecturaJob(supabase, {
        userId,
        projectId,
        polygon,
        projectRow,
        creditCost: jobCost,
        maxDim,
        maxScenes,
        mk,
        period
      });
      if (!queued.ok) {
        return jsonResponse(500, {
          error: 'queue_failed',
          message: queued.error || 'No se pudo encolar la Lectura Satelital',
          created
        });
      }
      created.push({
        id: queued.row.id,
        created_at: queued.row.created_at,
        period_index: period.index,
        period_label: period.label,
        date_start: period.date_start,
        date_end: period.date_end,
        frequency: period.frequency
      });
    }

    for (const item of created) {
      const triggered = await triggerPilotBackground(item.id, accessToken);
      if (!triggered) console.warn('Lectura encolada pero no se pudo disparar background:', item.id);
    }

    return jsonResponse(202, {
      ok: true,
      async: true,
      lectura: true,
      periods: created,
      credits: {
        used: used + totalCost,
        limit,
        base: baseLimit,
        bonus,
        reserved: totalCost,
        flat_cost: totalCost,
        available: Math.max(0, limit - (used + totalCost))
      },
      pricing
    });
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
    let ndreDataUrl = null;
    let rgbDataUrl = null;
    const latestScene = bundle.scenes[0] || {};
    let request = null;
    let storagePath = null;
    let ndmiStoragePath = null;
    let ndreStoragePath = null;
    let rgbStoragePath = null;
    let signedUrl = null;
    let ndmiSignedUrl = null;
    let ndreSignedUrl = null;
    let rgbSignedUrl = null;
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
      cloud_covers: bundle.cloudCovers || null,
      avg_cloud_cover: bundle.avgCloudCover != null ? bundle.avgCloudCover : null,
      scene_dates: bundle.sceneDates || null,
      coverage: rendered.coverage || null,
      valid_pct: rendered.coverage?.valid_pct != null ? rendered.coverage.valid_pct : null,
      ndvi_mean: rendered.ndviMean != null ? rendered.ndviMean : null,
      ndmi_mean: rendered.ndmiMean != null ? rendered.ndmiMean : null,
      ndre_mean: rendered.ndreMean != null ? rendered.ndreMean : null,
      scl_masked: true,
      fallback_tier: bundle.fallbackTier || null,
      location_snapshot: locationSnapshot,
      area_hectares: locationSnapshot?.area_hectares ?? null,
      credits_charged: projectId ? creditCost : 0,
      ndvi_vis: { style: 'relative_p10_p90', scale: 'predio' },
      ndmi_vis: { style: 'relative_p10_p90', scale: 'predio' },
      ndre_vis: { style: 'relative_p10_p90', scale: 'predio' },
      rgb_vis: { style: 'true_color_p2_p98', scale: 'predio' },
      vis: rendered.vis
    };

    if (projectId) {
      const ts = Date.now();
      storagePath = `${userId}/${projectId}/${mk}_${ts}_pilot_ndvi.png`;
      ndmiStoragePath = `${userId}/${projectId}/${mk}_${ts}_pilot_ndmi.png`;
      ndreStoragePath = `${userId}/${projectId}/${mk}_${ts}_pilot_ndre.png`;
      rgbStoragePath = `${userId}/${projectId}/${mk}_${ts}_pilot_rgb.png`;
      meta.ndmi_storage_path = ndmiStoragePath;
      meta.ndre_storage_path = ndreStoragePath;
      meta.rgb_storage_path = rgbStoragePath;
      meta.images = {
        ndvi: { storage_path: storagePath, label: 'NDVI', description: 'Pilot Copernicus · vigor relativo del predio' },
        ndmi: { storage_path: ndmiStoragePath, label: 'NDMI', description: 'Pilot Copernicus · humedad relativa del dosel' },
        ndre: { storage_path: ndreStoragePath, label: 'NDRE', description: 'Pilot Copernicus · clorofila y estado del dosel' },
        rgb: { storage_path: rgbStoragePath, label: 'RGB', description: 'Pilot Copernicus · vista natural del predio' }
      };

      const [upNdvi, upNdmi, upNdre, upRgb] = await Promise.all([
        supabase.storage.from(BUCKET).upload(storagePath, rendered.ndviPng, { contentType: 'image/png', upsert: true }),
        supabase.storage.from(BUCKET).upload(ndmiStoragePath, rendered.ndmiPng, { contentType: 'image/png', upsert: true }),
        supabase.storage.from(BUCKET).upload(ndreStoragePath, rendered.ndrePng, { contentType: 'image/png', upsert: true }),
        supabase.storage.from(BUCKET).upload(rgbStoragePath, rendered.rgbPng, { contentType: 'image/png', upsert: true })
      ]);
      if (upNdvi.error) {
        return jsonResponse(500, { error: 'storage_upload_failed', message: upNdvi.error.message });
      }
      if (upNdmi.error) {
        return jsonResponse(500, { error: 'storage_upload_failed', message: upNdmi.error.message });
      }
      if (upNdre.error) {
        return jsonResponse(500, { error: 'storage_upload_failed', message: upNdre.error.message });
      }
      if (upRgb.error) {
        return jsonResponse(500, { error: 'storage_upload_failed', message: upRgb.error.message });
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

      const [signedNdvi, signedNdmi, signedNdre, signedRgb] = await Promise.all([
        supabase.storage.from(BUCKET).createSignedUrl(storagePath, 3600),
        supabase.storage.from(BUCKET).createSignedUrl(ndmiStoragePath, 3600),
        supabase.storage.from(BUCKET).createSignedUrl(ndreStoragePath, 3600),
        supabase.storage.from(BUCKET).createSignedUrl(rgbStoragePath, 3600)
      ]);
      signedUrl = signedNdvi.data?.signedUrl || null;
      ndmiSignedUrl = signedNdmi.data?.signedUrl || null;
      ndreSignedUrl = signedNdre.data?.signedUrl || null;
      rgbSignedUrl = signedRgb.data?.signedUrl || null;
    } else {
      meta.note = 'Mediana 45 d + SCL; no guardado porque no se envió project_id.';
      ndviDataUrl = 'data:image/png;base64,' + rendered.ndviPng.toString('base64');
      ndmiDataUrl = 'data:image/png;base64,' + rendered.ndmiPng.toString('base64');
      ndreDataUrl = 'data:image/png;base64,' + rendered.ndrePng.toString('base64');
      rgbDataUrl = 'data:image/png;base64,' + rendered.rgbPng.toString('base64');
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
      ndre_signed_url: ndreSignedUrl,
      rgb_signed_url: rgbSignedUrl,
      ndvi_data_url: ndviDataUrl,
      ndmi_data_url: ndmiDataUrl,
      ndre_data_url: ndreDataUrl,
      rgb_data_url: rgbDataUrl,
      meta
    });
  } catch (e) {
    console.error('radar-cdse-pilot sync:', e);
    return jsonResponse(502, {
      error: 'pilot_render_failed',
      message: e.message || 'No se pudo generar imágenes Pilot (NDVI/NDMI/NDRE/RGB)'
    });
  }
};
