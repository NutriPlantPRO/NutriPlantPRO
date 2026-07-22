const crypto = require('crypto');

const REQUEST_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function numberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function round(value, decimals = 1) {
  const n = numberOrNull(value);
  if (n == null) return null;
  const p = 10 ** decimals;
  return Math.round(n * p) / p;
}

function addDaysIso(iso, days) {
  const [y, m, d] = String(iso).split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

function mondayOfWeek(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const offset = (date.getUTCDay() + 6) % 7;
  return addDaysIso(iso, -offset);
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function createAccessToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function createReportTokenForSubscriber(subscriberId) {
  const id = String(subscriberId || '').trim();
  const secret = String(process.env.AGROCLIMATE_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!id || !secret) throw new Error('agroclimate_token_secret_missing');
  const payload = Buffer.from(id, 'utf8').toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`report:${id}`).digest('base64url');
  return `${payload}.${signature}`;
}

function createRequestCode() {
  const bytes = crypto.randomBytes(4);
  let code = '';
  for (let i = 0; i < 4; i += 1) code += REQUEST_ALPHABET[bytes[i] % REQUEST_ALPHABET.length];
  return code;
}

function normalizePhone(countryCode, national) {
  const code = String(countryCode || '').replace(/[^\d+]/g, '');
  const local = String(national || '').replace(/\D/g, '').replace(/^0+/, '');
  if (!/^\+\d{1,4}$/.test(code) || local.length < 6 || local.length > 15) return null;
  return `${code}${local}`;
}

function vpdAtHour(temp, humidity, radiation) {
  const t = numberOrNull(temp);
  const h = numberOrNull(humidity);
  const rad = numberOrNull(radiation);
  if (t == null || h == null) return null;
  const leaf = rad != null && rad > 200 ? t + ((rad - 200) * 0.6) / 100 : t;
  const esLeaf = 0.6108 * Math.exp((17.27 * leaf) / (leaf + 237.3));
  const esAir = 0.6108 * Math.exp((17.27 * t) / (t + 237.3));
  return Math.max(0, esLeaf - (esAir * h / 100));
}

function openMeteoUrl(lat, lng) {
  const daily = [
    'temperature_2m_max',
    'temperature_2m_min',
    'precipitation_sum',
    'et0_fao_evapotranspiration',
    'shortwave_radiation_sum'
  ].join(',');
  const hourly = 'temperature_2m,relative_humidity_2m,dew_point_2m,shortwave_radiation';
  return (
    'https://api.open-meteo.com/v1/forecast?latitude=' +
    encodeURIComponent(lat) +
    '&longitude=' +
    encodeURIComponent(lng) +
    '&past_days=8&forecast_days=9&daily=' +
    daily +
    '&hourly=' +
    hourly +
    '&current=temperature_2m&timezone=auto'
  );
}

async function fetchOpenMeteo(lat, lng) {
  const response = await fetch(openMeteoUrl(lat, lng), {
    headers: { 'User-Agent': 'NutriPlantPRO-Agroclimate/1.0' },
    signal: AbortSignal.timeout(25000)
  });
  if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
  const data = await response.json();
  if (!data || !data.daily || !Array.isArray(data.daily.time)) {
    throw new Error('Open-Meteo no devolvió datos diarios.');
  }
  return data;
}

function rowsFromOpenMeteo(data, kc, mode = 'weekly') {
  const hourlyByDay = {};
  (data.hourly?.time || []).forEach((time, index) => {
    const day = String(time).slice(0, 10);
    if (!hourlyByDay[day]) hourlyByDay[day] = { vpds: [], radiation: [], humidity: [], dew: [] };
    const vpd = vpdAtHour(
      data.hourly.temperature_2m?.[index],
      data.hourly.relative_humidity_2m?.[index],
      data.hourly.shortwave_radiation?.[index]
    );
    if (vpd != null) hourlyByDay[day].vpds.push(vpd);
    const rad = numberOrNull(data.hourly.shortwave_radiation?.[index]);
    if (rad != null) hourlyByDay[day].radiation.push(rad);
    const humidity = numberOrNull(data.hourly.relative_humidity_2m?.[index]);
    if (humidity != null) hourlyByDay[day].humidity.push(humidity);
    const dew = numberOrNull(data.hourly.dew_point_2m?.[index]);
    if (dew != null) hourlyByDay[day].dew.push(dew);
  });

  const today = String(data.current?.time || data.daily.time[8]).slice(0, 10);
  let historicalStart = null;
  let historicalEnd = null;
  let forecastStart;
  let forecastEnd;

  if (mode === 'activation_partial') {
    const weekStart = mondayOfWeek(today);
    const weekEnd = addDaysIso(weekStart, 6);
    historicalStart = weekStart < today ? weekStart : null;
    historicalEnd = weekStart < today ? addDaysIso(today, -1) : null;
    forecastStart = today;
    forecastEnd = weekEnd;
  } else {
    historicalStart = addDaysIso(today, -7);
    historicalEnd = addDaysIso(today, -1);
    forecastStart = addDaysIso(today, 1);
    forecastEnd = addDaysIso(today, 7);
  }

  const kcValue = numberOrNull(kc);
  const rows = data.daily.time
    .map((date, index) => {
      const h = hourlyByDay[date] || { vpds: [], radiation: [], humidity: [], dew: [] };
      const et0 = numberOrNull(data.daily.et0_fao_evapotranspiration?.[index]);
      return {
        date,
        kind: historicalEnd && date <= historicalEnd ? 'history' : 'forecast',
        tempMin: numberOrNull(data.daily.temperature_2m_min?.[index]),
        tempMax: numberOrNull(data.daily.temperature_2m_max?.[index]),
        humidityMin: h.humidity.length ? Math.min(...h.humidity) : null,
        humidityMax: h.humidity.length ? Math.max(...h.humidity) : null,
        dewMin: h.dew.length ? round(Math.min(...h.dew), 1) : null,
        dewMax: h.dew.length ? round(Math.max(...h.dew), 1) : null,
        radiationSum: numberOrNull(data.daily.shortwave_radiation_sum?.[index]),
        radiationMax: h.radiation.length ? round(Math.max(...h.radiation), 0) : null,
        vpdMin: h.vpds.length ? round(Math.min(...h.vpds), 2) : null,
        vpdMax: h.vpds.length ? round(Math.max(...h.vpds), 2) : null,
        et0,
        etc: et0 != null && kcValue != null ? round(et0 * kcValue, 1) : null,
        rain: numberOrNull(data.daily.precipitation_sum?.[index])
      };
    })
    .filter((row) => {
      const inHistory = historicalStart && historicalEnd && row.date >= historicalStart && row.date <= historicalEnd;
      const inForecast = row.date >= forecastStart && row.date <= forecastEnd;
      return !!(inHistory || inForecast);
    });

  return {
    rows,
    timezone: data.timezone || null,
    utcOffsetSeconds: numberOrNull(data.utc_offset_seconds),
    today,
    historicalStart,
    historicalEnd,
    forecastStart,
    forecastEnd
  };
}

function sumRows(rows, key) {
  const values = rows.map((row) => numberOrNull(row[key])).filter((value) => value != null);
  return values.length ? round(values.reduce((acc, value) => acc + value, 0), 1) : null;
}

function minRows(rows, key) {
  const values = rows.map((row) => numberOrNull(row[key])).filter((value) => value != null);
  return values.length ? Math.min(...values) : null;
}

function maxRows(rows, key) {
  const values = rows.map((row) => numberOrNull(row[key])).filter((value) => value != null);
  return values.length ? Math.max(...values) : null;
}

function summarize(rows) {
  const forecast = rows.filter((row) => row.kind === 'forecast');
  return {
    forecastDays: forecast.length,
    tempMin: minRows(forecast, 'tempMin'),
    tempMax: maxRows(forecast, 'tempMax'),
    humidityMin: minRows(forecast, 'humidityMin'),
    humidityMax: maxRows(forecast, 'humidityMax'),
    vpdMin: minRows(forecast, 'vpdMin'),
    vpdMax: maxRows(forecast, 'vpdMax'),
    et0Total: sumRows(forecast, 'et0'),
    etcTotal: sumRows(forecast, 'etc'),
    rainTotal: sumRows(forecast, 'rain'),
    radiationTotal: sumRows(forecast, 'radiationSum')
  };
}

module.exports = {
  addDaysIso,
  createAccessToken,
  createReportTokenForSubscriber,
  createRequestCode,
  fetchOpenMeteo,
  mondayOfWeek,
  normalizePhone,
  numberOrNull,
  rowsFromOpenMeteo,
  sha256,
  summarize
};
