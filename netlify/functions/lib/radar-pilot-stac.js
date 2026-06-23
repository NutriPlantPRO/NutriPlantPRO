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

async function searchPlanetaryComputer(bbox, lookbackDays) {
  const body = {
    collections: ['sentinel-2-l2a'],
    bbox,
    datetime: isoDaysAgo(lookbackDays) + '/' + new Date().toISOString(),
    query: { 'eo:cloud_cover': { lt: 40 } },
    sort: [{ field: 'eo:cloud_cover', direction: 'asc' }],
    limit: 8
  };
  return stacSearch(PC_STAC, body);
}

async function searchCdse(bbox, lookbackDays, token) {
  const body = {
    collections: ['sentinel-2-l2a'],
    bbox,
    datetime: isoDaysAgo(lookbackDays) + '/' + new Date().toISOString(),
    filter: { op: '<', args: [{ property: 'eo:cloud_cover' }, 40] },
    'filter-lang': 'cql2-json',
    sort: [{ field: 'properties.eo:cloud_cover', direction: 'asc' }],
    limit: 8
  };
  return stacSearch(CDSE_STAC, body, { Authorization: 'Bearer ' + token });
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
  if (!b04 || !b08 || !b11) {
    throw new Error('Escena sin bandas B04/B08/B11');
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
      b11: await sign(b11)
    };
  }
  return {
    b04: await signPcHref(b04),
    b08: await signPcHref(b08),
    b11: await signPcHref(b11)
  };
}

/**
 * @param {Array<[number,number]>} polygon [[lat,lng],...]
 * @param {{ lookbackDays?: number, provider?: string }} opts
 */
async function findBestSentinel2Scene(polygon, opts) {
  const lookbackDays = Math.min(Math.max(Number(opts?.lookbackDays) || 120, 14), 365);
  const bbox = bboxFromPolygon(polygon);
  const clientId = (process.env.CDSE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.CDSE_CLIENT_SECRET || '').trim();
  let provider = String(opts?.provider || process.env.RADAR_PILOT_PROVIDER || 'planetary').toLowerCase();
  if (provider === 'cdse' && (!clientId || !clientSecret)) {
    provider = 'planetary';
  }

  let features = [];
  let cdseToken = null;
  if (provider === 'cdse') {
    cdseToken = await getCdseToken(clientId, clientSecret);
    const data = await searchCdse(bbox, lookbackDays, cdseToken);
    features = data.features || [];
  } else {
    const data = await searchPlanetaryComputer(bbox, lookbackDays);
    features = data.features || [];
  }

  if (!features.length) {
    throw new Error(
      'No hay escenas Sentinel-2 L2A con nubes <40% en los últimos ' + lookbackDays + ' días.'
    );
  }

  let lastErr = null;
  for (const item of features) {
    try {
      const bandUrls = await resolveSceneAssets(item, provider, cdseToken);
      const props = item.properties || {};
      return {
        provider,
        itemId: item.id,
        datetime: props.datetime || item.properties?.datetime || null,
        cloudCover: props['eo:cloud_cover'] ?? props.eo_cloud_cover ?? null,
        bbox,
        bandUrls,
        collection: provider === 'cdse' ? 'sentinel-2-l2a' : 'planetary-sentinel-2-l2a'
      };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('No se pudieron firmar/descargar bandas de escenas candidatas');
}

module.exports = {
  bboxFromPolygon,
  findBestSentinel2Scene
};
