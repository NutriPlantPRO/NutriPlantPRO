/**
 * STAC search + asset signing for Radar pilot (Sentinel-2 L2A, sin Google).
 * Default: Microsoft Planetary Computer (gratis, sin tarjeta).
 * Optional: CDSE STAC cuando existan CDSE_CLIENT_ID / CDSE_CLIENT_SECRET.
 */

const PC_STAC = 'https://planetarycomputer.microsoft.com/api/stac/v1/search';
const PC_SIGN = 'https://planetarycomputer.microsoft.com/api/sas/v1/sign';
const PC_TOKEN = 'https://planetarycomputer.microsoft.com/api/sas/v1/token/sentinel-2-l2a';
const CDSE_STAC = 'https://stac.dataspace.copernicus.eu/v1/search';
const CDSE_TOKEN =
  'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';

function bboxFromPolygon(polygon) {
  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;
  polygon.forEach(([lat, lng]) => {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  });
  return [minLng, minLat, maxLng, maxLat];
}

function isoDaysAgo(days) {
  const d = new Date(Date.now() - days * 86400000);
  return d.toISOString();
}

let pcCollectionTokenCache = null;
let pcCollectionTokenExpiry = 0;

async function getPcCollectionToken() {
  const now = Date.now();
  if (pcCollectionTokenCache && pcCollectionTokenExpiry > now + 60000) {
    return pcCollectionTokenCache;
  }
  const res = await fetch(PC_TOKEN);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.token) return null;
  pcCollectionTokenCache = data.token;
  const exp = data['msft:expiry'] ? Date.parse(data['msft:expiry']) : now + 3600000;
  pcCollectionTokenExpiry = Number.isFinite(exp) ? exp : now + 3600000;
  return pcCollectionTokenCache;
}

async function signPcHref(href) {
  const signedUrl =
    PC_SIGN + '?href=' + encodeURIComponent(href);
  const res = await fetch(signedUrl);
  if (res.ok) {
    const data = await res.json();
    if (data.href) return data.href;
  }
  const token = await getPcCollectionToken();
  if (token) {
    const sep = href.includes('?') ? '&' : '?';
    return href + sep + token;
  }
  throw new Error('PC sign HTTP ' + res.status);
}

async function getCdseToken(clientId, clientSecret) {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret
  });
  const res = await fetch(CDSE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error('CDSE token HTTP ' + res.status + ': ' + txt.slice(0, 200));
  }
  const data = await res.json();
  if (!data.access_token) throw new Error('CDSE token sin access_token');
  return data.access_token;
}

function isTransientStacHttp(status) {
  const s = Number(status);
  return s === 429 || s === 502 || s === 503 || s === 504;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sortFeaturesByCloud(features) {
  return (features || []).slice().sort((a, b) => {
    const ca = Number((a.properties || {})['eo:cloud_cover'] ?? (a.properties || {}).eo_cloud_cover);
    const cb = Number((b.properties || {})['eo:cloud_cover'] ?? (b.properties || {}).eo_cloud_cover);
    const na = Number.isFinite(ca) ? ca : 999;
    const nb = Number.isFinite(cb) ? cb : 999;
    if (na !== nb) return na - nb;
    const da = (a.properties || {}).datetime || '';
    const db = (b.properties || {}).datetime || '';
    return String(db).localeCompare(String(da));
  });
}

function sortScenesByCloud(scenes) {
  return (scenes || []).slice().sort((a, b) => {
    const ca = Number.isFinite(Number(a.cloudCover)) ? Number(a.cloudCover) : 999;
    const cb = Number.isFinite(Number(b.cloudCover)) ? Number(b.cloudCover) : 999;
    if (ca !== cb) return ca - cb;
    const da = a.datetime ? String(a.datetime) : '';
    const db = b.datetime ? String(b.datetime) : '';
    return db.localeCompare(da);
  });
}

async function stacSearch(url, body, headers, attempt) {
  const maxAttempts = 3;
  const a = Number(attempt) || 1;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    if (isTransientStacHttp(res.status) && a < maxAttempts) {
      await sleep(700 * a);
      return stacSearch(url, body, headers, a + 1);
    }
    throw new Error('STAC search HTTP ' + res.status + ': ' + txt.slice(0, 300));
  }
  return res.json();
}

/** Mediana corta: hasta N escenas; Pilot busca primero ≤14 d, luego 21, luego 30. */
const COMPOSITE_LOOKBACK_DAYS = 14;
const COMPOSITE_MAX_SCENES = 3;
const COMPOSITE_MAX_CLOUD = 35;
/** Tope duro: no buscar más atrás de 30 días (datos demasiado viejos para el cultivo). */
const MAX_LOOKBACK_DAYS = 30;

/** Pilot sección 1: ventanas cortas primero (14 → 21 → 30 d). */
const PILOT_COMPOSITE_TIERS = [
  { days: 14, maxCloud: 35, label: '14d_35pct' },
  { days: 21, maxCloud: 40, label: '21d_40pct' },
  { days: 30, maxCloud: 50, label: '30d_50pct' }
];

/** Fallback una sola escena (mismas ventanas, nunca más de 30 d). */
const SCENE_SEARCH_TIERS = PILOT_COMPOSITE_TIERS;

function clampLookbackDays(days) {
  const n = Number(days);
  if (!Number.isFinite(n) || n <= 0) return COMPOSITE_LOOKBACK_DAYS;
  return Math.min(Math.max(Math.floor(n), 1), MAX_LOOKBACK_DAYS);
}
async function searchPlanetaryComputer(bbox, lookbackDays, maxCloud) {
  const body = {
    collections: ['sentinel-2-l2a'],
    bbox,
    datetime: isoDaysAgo(lookbackDays) + '/' + new Date().toISOString(),
    query: { 'eo:cloud_cover': { lt: maxCloud } },
    sort: [{ field: 'datetime', direction: 'desc' }],
    limit: 20
  };
  return stacSearch(PC_STAC, body);
}

async function searchCdse(bbox, lookbackDays, maxCloud, token) {
  const body = {
    collections: ['sentinel-2-l2a'],
    bbox,
    datetime: isoDaysAgo(lookbackDays) + '/' + new Date().toISOString(),
    filter: { op: '<', args: [{ property: 'eo:cloud_cover' }, maxCloud] },
    'filter-lang': 'cql2-json',
    sort: [{ field: 'properties.datetime', direction: 'desc' }],
    limit: 20
  };
  return stacSearch(CDSE_STAC, body, { Authorization: 'Bearer ' + token });
}

function rangeDatetime(startIso, endIso) {
  return String(startIso) + 'T00:00:00Z/' + String(endIso) + 'T23:59:59Z';
}

async function searchPlanetaryComputerRange(bbox, startIso, endIso, maxCloud) {
  const body = {
    collections: ['sentinel-2-l2a'],
    bbox,
    datetime: rangeDatetime(startIso, endIso),
    query: { 'eo:cloud_cover': { lt: maxCloud } },
    sort: [{ field: 'datetime', direction: 'desc' }],
    limit: 20
  };
  return stacSearch(PC_STAC, body);
}

async function searchCdseRange(bbox, startIso, endIso, maxCloud, token) {
  const body = {
    collections: ['sentinel-2-l2a'],
    bbox,
    datetime: rangeDatetime(startIso, endIso),
    filter: { op: '<', args: [{ property: 'eo:cloud_cover' }, maxCloud] },
    'filter-lang': 'cql2-json',
    sort: [{ field: 'properties.datetime', direction: 'desc' }],
    limit: 20
  };
  return stacSearch(CDSE_STAC, body, { Authorization: 'Bearer ' + token });
}

async function searchScenesForRange(bbox, startIso, endIso, maxCloud, provider, cdseToken) {
  if (provider === 'cdse') {
    return {
      data: await searchCdseRange(bbox, startIso, endIso, maxCloud, cdseToken),
      provider: 'cdse',
      cdseToken
    };
  }
  try {
    return {
      data: await searchPlanetaryComputerRange(bbox, startIso, endIso, maxCloud),
      provider: 'planetary',
      cdseToken: null
    };
  } catch (e) {
    const msg = String((e && e.message) || '');
    const clientId = (process.env.CDSE_CLIENT_ID || '').trim();
    const clientSecret = (process.env.CDSE_CLIENT_SECRET || '').trim();
    if (!/STAC search HTTP (429|502|503|504)/.test(msg) || !clientId || !clientSecret) throw e;
    const token = await getCdseToken(clientId, clientSecret);
    return {
      data: await searchCdseRange(bbox, startIso, endIso, maxCloud, token),
      provider: 'cdse',
      cdseToken: token
    };
  }
}

async function searchScenesForTier(bbox, tier, provider, cdseToken) {
  if (provider === 'cdse') {
    return {
      data: await searchCdse(bbox, tier.days, tier.maxCloud, cdseToken),
      provider: 'cdse',
      cdseToken
    };
  }
  try {
    return {
      data: await searchPlanetaryComputer(bbox, tier.days, tier.maxCloud),
      provider: 'planetary',
      cdseToken: null
    };
  } catch (e) {
    const msg = String((e && e.message) || '');
    const clientId = (process.env.CDSE_CLIENT_ID || '').trim();
    const clientSecret = (process.env.CDSE_CLIENT_SECRET || '').trim();
    if (!/STAC search HTTP (429|502|503|504)/.test(msg) || !clientId || !clientSecret) throw e;
    const token = await getCdseToken(clientId, clientSecret);
    return {
      data: await searchCdse(bbox, tier.days, tier.maxCloud, token),
      provider: 'cdse',
      cdseToken: token
    };
  }
}

function pickAssetHref(assets, names) {
  if (!assets) return null;
  for (const name of names) {
    const a = assets[name];
    if (a && a.href) return a.href;
  }
  return null;
}

async function resolveSceneAssets(item, provider, cdseToken) {
  const assets = item.assets || {};
  const b04 = pickAssetHref(assets, ['B04', 'b04', 'red']);
  const b08 = pickAssetHref(assets, ['B08', 'b08', 'nir']);
  const b11 = pickAssetHref(assets, ['B11', 'b11', 'swir16', 'swir']);
  const scl = pickAssetHref(assets, ['SCL', 'scl']);
  if (!b04 || !b08 || !b11) {
    throw new Error('Escena sin bandas B04/B08/B11');
  }
  if (!scl) {
    throw new Error('Escena sin banda SCL');
  }
  if (provider === 'cdse') {
    const auth = cdseToken ? { Authorization: 'Bearer ' + cdseToken } : {};
    const sign = async (href) => {
      const res = await fetch(href, { method: 'HEAD', headers: auth });
      if (res.status === 401 || res.status === 403) {
        throw new Error('CDSE: descarga de banda denegada (revisa OAuth client)');
      }
      return href;
    };
    return {
      b04: await sign(b04),
      b08: await sign(b08),
      b11: await sign(b11),
      scl: await sign(scl)
    };
  }
  return {
    b04: await signPcHref(b04),
    b08: await signPcHref(b08),
    b11: await signPcHref(b11),
    scl: await signPcHref(scl)
  };
}

function sceneFromItem(item, provider, bbox, bandUrls, extra) {
  const props = item.properties || {};
  return {
    provider,
    itemId: item.id,
    datetime: props.datetime || null,
    cloudCover: props['eo:cloud_cover'] ?? props.eo_cloud_cover ?? null,
    bbox,
    bandUrls,
    collection: provider === 'cdse' ? 'sentinel-2-l2a' : 'planetary-sentinel-2-l2a',
    ...(extra || {})
  };
}

async function resolveProviderContext(opts) {
  const clientId = (process.env.CDSE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.CDSE_CLIENT_SECRET || '').trim();
  let provider = String(opts?.provider || process.env.RADAR_PILOT_PROVIDER || 'planetary').toLowerCase();
  if (provider === 'cdse' && (!clientId || !clientSecret)) {
    provider = 'planetary';
  }
  let cdseToken = null;
  if (provider === 'cdse') {
    cdseToken = await getCdseToken(clientId, clientSecret);
  }
  return { provider, cdseToken };
}

/**
 * Escena más clara en ventana corta: 14 → 21 → 30 d (nunca más de 30).
 */
async function findBestSentinel2Scene(polygon, opts) {
  const bbox = bboxFromPolygon(polygon);
  const { provider, cdseToken } = await resolveProviderContext(opts);
  const maxLb =
    opts?.maxLookbackDays != null ? clampLookbackDays(opts.maxLookbackDays) : MAX_LOOKBACK_DAYS;
  const tiers = SCENE_SEARCH_TIERS.filter((t) => t.days <= maxLb);

  let lastErr = null;
  for (const tier of tiers) {
    let features = [];
    let activeProvider = provider;
    let activeToken = cdseToken;
    try {
      const result = await searchScenesForTier(bbox, tier, provider, cdseToken);
      features = result.data.features || [];
      activeProvider = result.provider;
      activeToken = result.cdseToken;
    } catch (e) {
      lastErr = e;
      continue;
    }
    if (!features.length) continue;
    const ordered = sortFeaturesByCloud(features);

    for (const item of ordered) {
      try {
        const bandUrls = await resolveSceneAssets(item, activeProvider, activeToken);
        return sceneFromItem(item, activeProvider, bbox, bandUrls, {
          searchTier: tier.label,
          lookbackDays: tier.days,
          maxCloudPct: tier.maxCloud
        });
      } catch (e) {
        lastErr = e;
      }
    }
  }

  throw (
    lastErr ||
    new Error(
      'No hay escenas Sentinel-2 L2A despejadas en los últimos ' +
        maxLb +
        ' días (probamos 14 d ≤35% nubes, 21 d ≤40%, 30 d ≤50%).'
    )
  );
}

/**
 * Hasta 3 escenas en ventana corta para mediana + SCL (prefiere menos nubes).
 * Si no hay ninguna, cae al fallback de una sola escena (≤ maxLookbackDays).
 */
async function findSentinel2ScenesForComposite(polygon, opts) {
  const bbox = bboxFromPolygon(polygon);
  const { provider, cdseToken } = await resolveProviderContext(opts);
  const maxScenes = Math.min(
    Math.max(Number(opts?.maxScenes) || COMPOSITE_MAX_SCENES, 1),
    COMPOSITE_MAX_SCENES
  );
  const maxLookbackDays =
    opts?.maxLookbackDays != null
      ? clampLookbackDays(opts.maxLookbackDays)
      : opts?.lookbackDays != null
        ? clampLookbackDays(opts.lookbackDays)
        : MAX_LOOKBACK_DAYS;
  const lookbackDays = clampLookbackDays(opts?.lookbackDays || COMPOSITE_LOOKBACK_DAYS);
  const maxCloud = Number(opts?.maxCloud) || COMPOSITE_MAX_CLOUD;
  const candidateLimit = Math.min(Math.max(Number(opts?.candidateLimit) || 20, maxScenes), 40);

  let features = [];
  let searchErr = null;
  let activeProvider = provider;
  let activeToken = cdseToken;
  try {
    const tier = { days: lookbackDays, maxCloud, label: lookbackDays + 'd_' + maxCloud + 'pct' };
    const result = await searchScenesForTier(bbox, tier, provider, cdseToken);
    features = sortFeaturesByCloud(result.data.features || []);
    activeProvider = result.provider;
    activeToken = result.cdseToken;
  } catch (e) {
    searchErr = e;
  }

  const resolved = [];
  let lastErr = searchErr;
  for (const item of features.slice(0, candidateLimit)) {
    try {
      const bandUrls = await resolveSceneAssets(item, activeProvider, activeToken);
      resolved.push(sceneFromItem(item, activeProvider, bbox, bandUrls));
    } catch (e) {
      lastErr = e;
    }
  }
  const scenes = sortScenesByCloud(resolved).slice(0, maxScenes);

  if (scenes.length) {
    const datetimes = scenes.map((s) => s.datetime).filter(Boolean).sort();
    const cloudCovers = scenes
      .map((s) => (s.cloudCover != null ? Number(s.cloudCover) : null))
      .filter((n) => Number.isFinite(n));
    const sceneDates = scenes
      .map((s) => (s.datetime ? String(s.datetime).slice(0, 10) : null))
      .filter(Boolean);
    return {
      provider: activeProvider,
      bbox,
      lookbackDays,
      maxCloudPct: maxCloud,
      composite: scenes.length > 1,
      sceneCount: scenes.length,
      dateStart: datetimes[0] ? datetimes[0].slice(0, 10) : null,
      dateEnd: datetimes.length ? datetimes[datetimes.length - 1].slice(0, 10) : null,
      sceneDates,
      cloudCovers,
      avgCloudCover:
        cloudCovers.length > 0
          ? Math.round((cloudCovers.reduce((a, b) => a + b, 0) / cloudCovers.length) * 10) / 10
          : null,
      scenes
    };
  }

  const fallback = await findBestSentinel2Scene(polygon, { ...opts, maxLookbackDays });
  const fbCloud =
    fallback.cloudCover != null && Number.isFinite(Number(fallback.cloudCover))
      ? Number(fallback.cloudCover)
      : null;
  return {
    provider: fallback.provider,
    bbox: fallback.bbox,
    lookbackDays: Math.min(Number(fallback.lookbackDays) || MAX_LOOKBACK_DAYS, MAX_LOOKBACK_DAYS),
    maxCloudPct: fallback.maxCloudPct,
    composite: false,
    sceneCount: 1,
    dateStart: fallback.datetime ? String(fallback.datetime).slice(0, 10) : null,
    dateEnd: fallback.datetime ? String(fallback.datetime).slice(0, 10) : null,
    sceneDates: fallback.datetime ? [String(fallback.datetime).slice(0, 10)] : [],
    cloudCovers: fbCloud != null ? [fbCloud] : [],
    avgCloudCover: fbCloud,
    scenes: [fallback],
    fallbackTier: fallback.searchTier || null
  };
}

/**
 * Escenas dentro de un rango de fechas FIJO (Lectura Satelital por periodo).
 * No usa "últimos N días desde hoy"; respeta dateStart/dateEnd del periodo.
 * Prefiere las escenas con menos nubes (no solo las más recientes), para que
 * mensual encuentre lo mismo que pudo ver quincenal en ese mismo mes.
 */
async function findSentinel2ScenesForRange(polygon, opts) {
  const bbox = bboxFromPolygon(polygon);
  const { provider, cdseToken } = await resolveProviderContext(opts);
  const dateStart = String(opts?.dateStart || '').slice(0, 10);
  const dateEnd = String(opts?.dateEnd || '').slice(0, 10);
  if (!dateStart || !dateEnd) {
    throw new Error('findSentinel2ScenesForRange requiere dateStart y dateEnd');
  }
  const maxScenes = Math.min(Math.max(Number(opts?.maxScenes) || COMPOSITE_MAX_SCENES, 1), COMPOSITE_MAX_SCENES);
  const maxCloud = Number(opts?.maxCloud) || COMPOSITE_MAX_CLOUD;
  const candidateLimit = Math.min(Math.max(Number(opts?.candidateLimit) || 20, maxScenes), 40);

  async function collectScenes(cloudLimit) {
    let features = [];
    let searchErr = null;
    let activeProvider = provider;
    let activeToken = cdseToken;
    try {
      const result = await searchScenesForRange(bbox, dateStart, dateEnd, cloudLimit, provider, cdseToken);
      features = result.data.features || [];
      activeProvider = result.provider;
      activeToken = result.cdseToken;
    } catch (e) {
      searchErr = e;
    }
    const resolved = [];
    let lastErr = searchErr;
    for (const item of features.slice(0, candidateLimit)) {
      try {
        const bandUrls = await resolveSceneAssets(item, activeProvider, activeToken);
        resolved.push(sceneFromItem(item, activeProvider, bbox, bandUrls));
      } catch (e) {
        lastErr = e;
      }
    }
    // Preferir menor nubosidad; empate → más reciente.
    resolved.sort((a, b) => {
      const ca = Number.isFinite(Number(a.cloudCover)) ? Number(a.cloudCover) : 999;
      const cb = Number.isFinite(Number(b.cloudCover)) ? Number(b.cloudCover) : 999;
      if (ca !== cb) return ca - cb;
      const da = a.datetime ? String(a.datetime) : '';
      const db = b.datetime ? String(b.datetime) : '';
      return db.localeCompare(da);
    });
    return { scenes: resolved.slice(0, maxScenes), allResolved: resolved, lastErr };
  }

  let picked = await collectScenes(maxCloud);
  // Si no hay escenas con el umbral normal, reintenta con umbral más amplio dentro del MISMO rango.
  if (!picked.scenes.length && maxCloud < 60) {
    picked = await collectScenes(60);
  }

  if (!picked.scenes.length) {
    throw (
      picked.lastErr ||
      new Error(
        'No hay escenas Sentinel-2 L2A con ≤' +
          Math.max(maxCloud, 60) +
          '% de nubes entre ' +
          dateStart +
          ' y ' +
          dateEnd +
          '.'
      )
    );
  }

  const scenes = picked.scenes;
  const datetimes = scenes.map((s) => s.datetime).filter(Boolean).sort();
  const cloudCovers = scenes
    .map((s) => (s.cloudCover != null ? Number(s.cloudCover) : null))
    .filter((n) => Number.isFinite(n));
  const sceneDates = scenes
    .map((s) => (s.datetime ? String(s.datetime).slice(0, 10) : null))
    .filter(Boolean);

  return {
    provider,
    bbox,
    dateStart,
    dateEnd,
    maxCloudPct: maxCloud,
    composite: scenes.length > 1,
    sceneCount: scenes.length,
    sceneDates,
    cloudCovers,
    avgCloudCover:
      cloudCovers.length > 0
        ? Math.round((cloudCovers.reduce((a, b) => a + b, 0) / cloudCovers.length) * 10) / 10
        : null,
    scenes,
    candidatesResolved: picked.allResolved.length
  };
}

module.exports = {
  bboxFromPolygon,
  findBestSentinel2Scene,
  findSentinel2ScenesForComposite,
  findSentinel2ScenesForRange,
  SCENE_SEARCH_TIERS,
  COMPOSITE_LOOKBACK_DAYS,
  COMPOSITE_MAX_SCENES,
  MAX_LOOKBACK_DAYS,
  clampLookbackDays
};