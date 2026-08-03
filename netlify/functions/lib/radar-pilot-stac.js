/**
 * STAC search + asset signing for Radar pilot (Sentinel-2 L2A, sin Google).
 * Default: Microsoft Planetary Computer (gratis, sin tarjeta).
 * Optional: CDSE STAC cuando existan CDSE_CLIENT_ID / CDSE_CLIENT_SECRET.
 */

const PC_STAC = 'https://planetarycomputer.microsoft.com/api/stac/v1/search';
const PC_SIGN = 'https://planetarycomputer.microsoft.com/api/sas/v1/sign';
const PC_TOKEN = 'https://planetarycomputer.microsoft.com/api/sas/v1/token/sentinel-2-l2a';
const PC_TOKEN_DEM = 'https://planetarycomputer.microsoft.com/api/sas/v1/token/cop-dem-glo-30';
const CDSE_STAC = 'https://stac.dataspace.copernicus.eu/v1/search';
const CDSE_TOKEN =
  'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';
const COP_DEM_COLLECTION = 'cop-dem-glo-30';

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
const pcTokenByCollection = Object.create(null);

async function getPcCollectionToken(collectionId) {
  const collection = String(collectionId || 'sentinel-2-l2a').trim() || 'sentinel-2-l2a';
  if (collection === 'sentinel-2-l2a') {
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
  const cached = pcTokenByCollection[collection];
  const now = Date.now();
  if (cached && cached.expiry > now + 60000) return cached.token;
  const tokenUrl =
    collection === COP_DEM_COLLECTION
      ? PC_TOKEN_DEM
      : 'https://planetarycomputer.microsoft.com/api/sas/v1/token/' + encodeURIComponent(collection);
  const res = await fetch(tokenUrl);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.token) return null;
  const exp = data['msft:expiry'] ? Date.parse(data['msft:expiry']) : now + 3600000;
  pcTokenByCollection[collection] = {
    token: data.token,
    expiry: Number.isFinite(exp) ? exp : now + 3600000
  };
  return data.token;
}

async function signPcHref(href, collectionId) {
  const signedUrl =
    PC_SIGN + '?href=' + encodeURIComponent(href);
  const res = await fetch(signedUrl);
  if (res.ok) {
    const data = await res.json();
    if (data.href) return data.href;
  }
  const token = await getPcCollectionToken(collectionId);
  if (token) {
    const sep = href.includes('?') ? '&' : '?';
    return href + sep + token;
  }
  throw new Error('PC sign HTTP ' + res.status);
}

/**
 * Copernicus DEM GLO-30 (~30 m) via Planetary Computer.
 * Prefers the tile that covers the polygon center (fields << tile size).
 * @returns {Promise<{ urls: string[], itemIds: string[], bbox4326: number[] }>}
 */
async function findCopDemGlo30Urls(polygon) {
  if (!Array.isArray(polygon) || polygon.length < 3) {
    throw new Error('Polígono inválido para DEM');
  }
  const bbox = bboxFromPolygon(polygon);
  const centerLng = (bbox[0] + bbox[2]) / 2;
  const centerLat = (bbox[1] + bbox[3]) / 2;
  const body = {
    collections: [COP_DEM_COLLECTION],
    bbox,
    limit: 12
  };
  const result = await stacSearch(PC_STAC, body, { 'Content-Type': 'application/json' }, 0);
  const features = (result && result.features) || [];
  if (!features.length) {
    throw new Error('No hay teselas Copernicus DEM (GLO-30) para este predio');
  }

  function featureContainsCenter(feature) {
    const fb = Array.isArray(feature.bbox) ? feature.bbox : null;
    if (!fb || fb.length < 4) return false;
    return centerLng >= fb[0] && centerLng <= fb[2] && centerLat >= fb[1] && centerLat <= fb[3];
  }

  const ordered = features.slice().sort((a, b) => {
    const aIn = featureContainsCenter(a) ? 0 : 1;
    const bIn = featureContainsCenter(b) ? 0 : 1;
    return aIn - bIn;
  });

  const primary = ordered[0];
  const href =
    (primary.assets && primary.assets.data && primary.assets.data.href) ||
    (primary.assets && primary.assets.elevation && primary.assets.elevation.href) ||
    null;
  if (!href) {
    throw new Error('Teselas DEM sin asset de elevación firmable');
  }
  const signed = await signPcHref(href, COP_DEM_COLLECTION);
  return {
    urls: [signed],
    itemIds: [String(primary.id || '')],
    bbox4326: bbox,
    collection: COP_DEM_COLLECTION
  };
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

/** Mediana corta: hasta N escenas; Pilot busca primero ≤14 d, luego 21, 30, 45. */
const COMPOSITE_LOOKBACK_DAYS = 14;
/** Tope de pasadas por mediana (Sentinel ~cada 5 d → ~8–9 en 45 d). */
const COMPOSITE_MAX_SCENES = 8;
const COMPOSITE_MAX_CLOUD = 35;
/** Tope duro: no buscar más atrás de 45 días. */
const MAX_LOOKBACK_DAYS = 45;

/** Pilot sección 1: ventanas cortas primero (14 → 21 → 30 → 45 d). */
const PILOT_COMPOSITE_TIERS = [
  { days: 14, maxCloud: 35, label: '14d_35pct' },
  { days: 21, maxCloud: 40, label: '21d_40pct' },
  { days: 30, maxCloud: 50, label: '30d_50pct' },
  { days: 45, maxCloud: 55, label: '45d_55pct' }
];

/** Fallback una sola escena (mismas ventanas, nunca más de 45 d). */
const SCENE_SEARCH_TIERS = PILOT_COMPOSITE_TIERS;

function clampLookbackDays(days) {
  const n = Number(days);
  if (!Number.isFinite(n) || n <= 0) return COMPOSITE_LOOKBACK_DAYS;
  return Math.min(Math.max(Math.floor(n), 1), MAX_LOOKBACK_DAYS);
}
async function searchPlanetaryComputer(bbox, lookbackDays, maxCloud) {
  const base = {
    collections: ['sentinel-2-l2a'],
    bbox,
    datetime: isoDaysAgo(lookbackDays) + '/' + new Date().toISOString(),
    query: { 'eo:cloud_cover': { lt: maxCloud } },
    limit: 100
  };
  try {
    return await stacSearch(PC_STAC, {
      ...base,
      sort: [
        { field: 'eo:cloud_cover', direction: 'asc' },
        { field: 'datetime', direction: 'desc' }
      ]
    });
  } catch (e) {
    return stacSearch(PC_STAC, {
      ...base,
      sort: [{ field: 'datetime', direction: 'desc' }]
    });
  }
}

async function searchCdse(bbox, lookbackDays, maxCloud, token) {
  const base = {
    collections: ['sentinel-2-l2a'],
    bbox,
    datetime: isoDaysAgo(lookbackDays) + '/' + new Date().toISOString(),
    filter: { op: '<', args: [{ property: 'eo:cloud_cover' }, maxCloud] },
    'filter-lang': 'cql2-json',
    limit: 100
  };
  const headers = { Authorization: 'Bearer ' + token };
  try {
    return await stacSearch(
      CDSE_STAC,
      {
        ...base,
        sort: [
          { field: 'properties.eo:cloud_cover', direction: 'asc' },
          { field: 'properties.datetime', direction: 'desc' }
        ]
      },
      headers
    );
  } catch (e) {
    return stacSearch(
      CDSE_STAC,
      {
        ...base,
        sort: [{ field: 'properties.datetime', direction: 'desc' }]
      },
      headers
    );
  }
}

function rangeDatetime(startIso, endIso) {
  return String(startIso) + 'T00:00:00Z/' + String(endIso) + 'T23:59:59Z';
}

async function searchPlanetaryComputerRange(bbox, startIso, endIso, maxCloud) {
  const base = {
    collections: ['sentinel-2-l2a'],
    bbox,
    datetime: rangeDatetime(startIso, endIso),
    query: { 'eo:cloud_cover': { lt: maxCloud } },
    limit: 100
  };
  try {
    return await stacSearch(PC_STAC, {
      ...base,
      sort: [
        { field: 'eo:cloud_cover', direction: 'asc' },
        { field: 'datetime', direction: 'desc' }
      ]
    });
  } catch (e) {
    // Algunos STAC no aceptan sort por eo:cloud_cover; igual ordenamos en cliente.
    return stacSearch(PC_STAC, {
      ...base,
      sort: [{ field: 'datetime', direction: 'desc' }]
    });
  }
}

async function searchCdseRange(bbox, startIso, endIso, maxCloud, token) {
  const base = {
    collections: ['sentinel-2-l2a'],
    bbox,
    datetime: rangeDatetime(startIso, endIso),
    filter: { op: '<', args: [{ property: 'eo:cloud_cover' }, maxCloud] },
    'filter-lang': 'cql2-json',
    limit: 100
  };
  const headers = { Authorization: 'Bearer ' + token };
  try {
    return await stacSearch(
      CDSE_STAC,
      {
        ...base,
        sort: [
          { field: 'properties.eo:cloud_cover', direction: 'asc' },
          { field: 'properties.datetime', direction: 'desc' }
        ]
      },
      headers
    );
  } catch (e) {
    return stacSearch(
      CDSE_STAC,
      {
        ...base,
        sort: [{ field: 'properties.datetime', direction: 'desc' }]
      },
      headers
    );
  }
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
  // NDVI: B04+B08 · NDMI: B08+B11 · NDRE: B08+B05 · RGB: B04+B03+B02 · máscara: SCL
  const b02 = pickAssetHref(assets, ['B02', 'b02', 'blue']);
  const b03 = pickAssetHref(assets, ['B03', 'b03', 'green']);
  const b04 = pickAssetHref(assets, ['B04', 'b04', 'red']);
  const b05 = pickAssetHref(assets, ['B05', 'b05', 'rededge1', 'rededge']);
  const b08 = pickAssetHref(assets, ['B08', 'b08', 'nir']);
  const b11 = pickAssetHref(assets, ['B11', 'b11', 'swir16', 'swir']);
  const scl = pickAssetHref(assets, ['SCL', 'scl']);
  if (!b04 || !b08 || !b11) {
    throw new Error('Escena sin bandas B04/B08/B11');
  }
  if (!b05) {
    throw new Error('Escena sin banda B05 (necesaria para NDRE)');
  }
  if (!b02 || !b03) {
    throw new Error('Escena sin bandas B02/B03 (necesarias para RGB)');
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
      b02: await sign(b02),
      b03: await sign(b03),
      b04: await sign(b04),
      b05: await sign(b05),
      b08: await sign(b08),
      b11: await sign(b11),
      scl: await sign(scl)
    };
  }
  return {
    b02: await signPcHref(b02),
    b03: await signPcHref(b03),
    b04: await signPcHref(b04),
    b05: await signPcHref(b05),
    b08: await signPcHref(b08),
    b11: await signPcHref(b11),
    scl: await signPcHref(scl)
  };
}

async function resolveSceneSclAsset(item, provider, cdseToken) {
  const scl = pickAssetHref(item?.assets || {}, ['SCL', 'scl']);
  if (!scl) throw new Error('Escena sin banda SCL');
  if (provider === 'cdse') {
    const auth = cdseToken ? { Authorization: 'Bearer ' + cdseToken } : {};
    const res = await fetch(scl, { method: 'HEAD', headers: auth });
    if (res.status === 401 || res.status === 403) {
      throw new Error('CDSE: descarga SCL denegada (revisa OAuth client)');
    }
    return scl;
  }
  return signPcHref(scl);
}

function sceneFromItem(item, provider, bbox, bandUrls, extra) {
  const props = item.properties || {};
  return {
    provider,
    itemId: item.id,
    datetime: props.datetime || null,
    cloudCover: props['eo:cloud_cover'] ?? props.eo_cloud_cover ?? null,
    bbox,
    footprintBbox: Array.isArray(item.bbox) ? item.bbox : null,
    footprintGeometry:
      item.geometry && (item.geometry.type === 'Polygon' || item.geometry.type === 'MultiPolygon')
        ? item.geometry
        : null,
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
 * Escena más clara en ventana corta: 14 → 21 → 30 → 45 d (nunca más de 45).
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
        ' días (probamos 14 d ≤35% nubes, 21 d ≤40%, 30 d ≤50%, 45 d ≤55%).'
    )
  );
}

/**
 * Hasta N escenas en ventana corta para mediana + SCL (prefiere menos nubes).
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
  // Solo resolver assets de las N más claras (no 40+ COGs: eso tumba el worker).
  const tryBudget = Math.min(Math.max(Number(opts?.candidateLimit) || maxScenes * 3, maxScenes), 12);

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
  let tried = 0;
  for (const item of features) {
    if (resolved.length >= maxScenes) break;
    if (tried >= tryBudget) break;
    tried += 1;
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
  // Presupuesto de firmas COG: pocas. Ordenamos por nubes y paramos al tener maxScenes.
  const tryBudget = Math.min(Math.max(Number(opts?.candidateLimit) || maxScenes * 3, maxScenes), 12);

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
    // CRÍTICO: ordenar por nubes ANTES de firmar. Solo resolvemos las más claras.
    const ordered = sortFeaturesByCloud(features);
    const resolved = [];
    let lastErr = searchErr;
    let tried = 0;
    for (const item of ordered) {
      if (resolved.length >= maxScenes) break;
      if (tried >= tryBudget) break;
      tried += 1;
      try {
        const bandUrls = await resolveSceneAssets(item, activeProvider, activeToken);
        resolved.push(sceneFromItem(item, activeProvider, bbox, bandUrls));
      } catch (e) {
        lastErr = e;
      }
    }
    const sortedScenes = sortScenesByCloud(resolved);
    return { scenes: sortedScenes.slice(0, maxScenes), allResolved: sortedScenes, lastErr };
  }

  let picked = await collectScenes(maxCloud);
  // Ampliar umbral de nubes del tile (el predio puede estar despejado aunque el tile diga 40–90%).
  if (!picked.scenes.length && maxCloud < 80) {
    picked = await collectScenes(Math.max(maxCloud, 80));
  }
  if (!picked.scenes.length && maxCloud < 100) {
    picked = await collectScenes(100);
  }

  if (!picked.scenes.length) {
    throw (
      picked.lastErr ||
      new Error(
        'No hay escenas Sentinel-2 L2A con ≤' +
          Math.max(maxCloud, 100) +
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

async function findSentinel2SceneSclById(polygon, opts) {
  const bbox = bboxFromPolygon(polygon);
  const { provider, cdseToken } = await resolveProviderContext(opts);
  const date = String(opts?.date || '').slice(0, 10);
  const itemId = String(opts?.itemId || '').trim();
  if (!date) throw new Error('La fecha Sentinel es obligatoria para recuperar SCL');

  const result = await searchScenesForRange(bbox, date, date, 101, provider, cdseToken);
  const features = result.data.features || [];
  const item =
    (itemId && features.find((feature) => String(feature.id) === itemId)) ||
    (!itemId ? sortFeaturesByCloud(features)[0] : null);
  if (!item) {
    throw new Error(
      itemId
        ? 'No se encontró la escena Sentinel guardada: ' + itemId
        : 'No se encontró escena Sentinel para ' + date
    );
  }
  return {
    provider: result.provider,
    itemId: item.id,
    datetime: item.properties?.datetime || null,
    cloudCover:
      item.properties?.['eo:cloud_cover'] ?? item.properties?.eo_cloud_cover ?? null,
    footprintBbox: Array.isArray(item.bbox) ? item.bbox : null,
    footprintGeometry: item.geometry || null,
    sclUrl: await resolveSceneSclAsset(item, result.provider, result.cdseToken)
  };
}

module.exports = {
  bboxFromPolygon,
  findBestSentinel2Scene,
  findSentinel2ScenesForComposite,
  findSentinel2ScenesForRange,
  findSentinel2SceneSclById,
  findCopDemGlo30Urls,
  COP_DEM_COLLECTION,
  SCENE_SEARCH_TIERS,
  COMPOSITE_LOOKBACK_DAYS,
  COMPOSITE_MAX_SCENES,
  MAX_LOOKBACK_DAYS,
  clampLookbackDays
};