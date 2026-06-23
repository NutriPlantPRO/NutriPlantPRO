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

async function stacSearch(url, body, headers) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error('STAC search HTTP ' + res.status + ': ' + txt.slice(0, 300));
  }
  return res.json();
}

/** Mediana corta: hasta N escenas en los últimos 30 d (SCL + mediana por píxel). */
const COMPOSITE_LOOKBACK_DAYS = 30;
const COMPOSITE_MAX_SCENES = 4;
const COMPOSITE_MAX_CLOUD = 40;

/** Fallback si no hay escenas en 30 d: una sola escena reciente. */
const SCENE_SEARCH_TIERS = [
  { days: 7, maxCloud: 25, label: '7d_25pct' },
  { days: 21, maxCloud: 25, label: '21d_25pct' },
  { days: 45, maxCloud: 35, label: '45d_35pct' }
];

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

async function searchScenesForTier(bbox, tier, provider, cdseToken) {
  if (provider === 'cdse') {
    return searchCdse(bbox, tier.days, tier.maxCloud, cdseToken);
  }
  return searchPlanetaryComputer(bbox, tier.days, tier.maxCloud);
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
 * Escena más reciente con pocas nubes: 7 d → 21 d → 45 d (fallback).
 */
async function findBestSentinel2Scene(polygon, opts) {
  const bbox = bboxFromPolygon(polygon);
  const { provider, cdseToken } = await resolveProviderContext(opts);

  let lastErr = null;
  for (const tier of SCENE_SEARCH_TIERS) {
    let features = [];
    try {
      const data = await searchScenesForTier(bbox, tier, provider, cdseToken);
      features = data.features || [];
    } catch (e) {
      lastErr = e;
      continue;
    }
    if (!features.length) continue;

    for (const item of features) {
      try {
        const bandUrls = await resolveSceneAssets(item, provider, cdseToken);
        return sceneFromItem(item, provider, bbox, bandUrls, {
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
      'No hay escenas Sentinel-2 L2A despejadas en los últimos 45 días (probamos 7 d ≤25% nubes, 21 d ≤25%, 45 d ≤35%).'
    )
  );
}

/**
 * Hasta 4 escenas en 30 d para mediana + SCL (preferir recientes, ≤40% nubes escena).
 * Si no hay ninguna en 30 d, cae al fallback de una sola escena.
 */
async function findSentinel2ScenesForComposite(polygon, opts) {
  const bbox = bboxFromPolygon(polygon);
  const { provider, cdseToken } = await resolveProviderContext(opts);
  const maxScenes = Math.min(
    Math.max(Number(opts?.maxScenes) || COMPOSITE_MAX_SCENES, 1),
    COMPOSITE_MAX_SCENES
  );
  const lookbackDays = Number(opts?.lookbackDays) || COMPOSITE_LOOKBACK_DAYS;
  const maxCloud = Number(opts?.maxCloud) || COMPOSITE_MAX_CLOUD;

  let features = [];
  let searchErr = null;
  try {
    const tier = { days: lookbackDays, maxCloud, label: lookbackDays + 'd_' + maxCloud + 'pct' };
    const data = await searchScenesForTier(bbox, tier, provider, cdseToken);
    features = data.features || [];
  } catch (e) {
    searchErr = e;
  }

  const scenes = [];
  let lastErr = searchErr;
  for (const item of features) {
    if (scenes.length >= maxScenes) break;
    try {
      const bandUrls = await resolveSceneAssets(item, provider, cdseToken);
      scenes.push(sceneFromItem(item, provider, bbox, bandUrls));
    } catch (e) {
      lastErr = e;
    }
  }

  if (scenes.length) {
    const datetimes = scenes.map((s) => s.datetime).filter(Boolean).sort();
    return {
      provider,
      bbox,
      lookbackDays,
      maxCloudPct: maxCloud,
      composite: scenes.length > 1,
      sceneCount: scenes.length,
      dateStart: datetimes[0] ? datetimes[0].slice(0, 10) : null,
      dateEnd: datetimes.length ? datetimes[datetimes.length - 1].slice(0, 10) : null,
      scenes
    };
  }

  const fallback = await findBestSentinel2Scene(polygon, opts);
  return {
    provider: fallback.provider,
    bbox: fallback.bbox,
    lookbackDays: fallback.lookbackDays,
    maxCloudPct: fallback.maxCloudPct,
    composite: false,
    sceneCount: 1,
    dateStart: fallback.datetime ? String(fallback.datetime).slice(0, 10) : null,
    dateEnd: fallback.datetime ? String(fallback.datetime).slice(0, 10) : null,
    scenes: [fallback],
    fallbackTier: fallback.searchTier || null
  };
}

module.exports = {
  bboxFromPolygon,
  findBestSentinel2Scene,
  findSentinel2ScenesForComposite,
  SCENE_SEARCH_TIERS,
  COMPOSITE_LOOKBACK_DAYS,
  COMPOSITE_MAX_SCENES
};
