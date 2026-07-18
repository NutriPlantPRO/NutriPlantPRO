/**
 * Créditos Radar NDVI/NDMI/NDRE/RGB por mes y por superficie del polígono (ha).
 * Umbrales por defecto: ≤30 ha = 1 · >30 ha = 2 · >100 ha = 3
 * Tope duro: máximo 250 ha (Radar máximo N ha; divide el polígono).
 */
const DEFAULT_MONTHLY = 20;
const DEFAULT_TIER2_HA = 30;
const DEFAULT_TIER3_HA = 100;
const DEFAULT_MAX_AREA_HA = 250;

function getMonthlyBaseLimit() {
  return Math.max(
    0,
    Math.floor(
      Number(
        process.env.RADAR_MONTHLY_CREDITS != null && process.env.RADAR_MONTHLY_CREDITS !== ''
          ? process.env.RADAR_MONTHLY_CREDITS
          : DEFAULT_MONTHLY
      )
    )
  );
}

function getRadarMaxAreaHa() {
  const n = Number(process.env.RADAR_MAX_AREA_HA || DEFAULT_MAX_AREA_HA);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_AREA_HA;
}

function getAreaHectaresFromLocation(location) {
  if (!location || location.areaHectares == null) return null;
  const ha = Number(location.areaHectares);
  if (!Number.isFinite(ha) || ha <= 0) return null;
  return ha;
}

/**
 * Si el predio supera el tope, devuelve payload de error API; si no, null.
 */
function getRadarAreaLimitError(areaHa) {
  const maxHa = getRadarMaxAreaHa();
  const ha = Number(areaHa);
  if (!Number.isFinite(ha) || ha <= 0) return null;
  if (ha <= maxHa) return null;
  const haLabel = Math.round(ha * 100) / 100;
  return {
    error: 'radar_area_too_large',
    message:
      'Radar máximo ' +
      maxHa +
      ' ha; divide el polígono. Este predio tiene ' +
      haLabel +
      ' ha.',
    max_area_ha: maxHa,
    area_hectares: ha
  };
}

function getRadarCreditCostForArea(areaHa) {
  const tier3Ha = Number(process.env.RADAR_AREA_TIER3_HA || DEFAULT_TIER3_HA);
  const tier2Ha = Number(process.env.RADAR_AREA_TIER2_HA || DEFAULT_TIER2_HA);
  const credits3 = Math.max(1, Math.floor(Number(process.env.RADAR_CREDITS_TIER3 || 3)));
  const credits2 = Math.max(1, Math.floor(Number(process.env.RADAR_CREDITS_TIER2 || 2)));
  const ha = Number(areaHa);
  if (!Number.isFinite(ha) || ha <= 0) return 1;
  if (ha > tier3Ha) return credits3;
  if (ha > tier2Ha) return credits2;
  return 1;
}

function getRadarCreditPricingInfo(areaHa) {
  const tier2Ha = Number(process.env.RADAR_AREA_TIER2_HA || DEFAULT_TIER2_HA);
  const tier3Ha = Number(process.env.RADAR_AREA_TIER3_HA || DEFAULT_TIER3_HA);
  const maxHa = getRadarMaxAreaHa();
  const ha = Number(areaHa);
  const normalizedHa = Number.isFinite(ha) && ha > 0 ? ha : null;
  return {
    area_hectares: normalizedHa,
    credits_charged: getRadarCreditCostForArea(normalizedHa),
    max_area_ha: maxHa,
    area_allowed: normalizedHa == null || normalizedHa <= maxHa,
    pricing: {
      monthly_base: getMonthlyBaseLimit(),
      tier2_threshold_ha: tier2Ha,
      tier3_threshold_ha: tier3Ha,
      max_area_ha: maxHa,
      credits_up_to_tier2: 1,
      credits_over_tier2: Math.max(1, Math.floor(Number(process.env.RADAR_CREDITS_TIER2 || 2))),
      credits_over_tier3: Math.max(1, Math.floor(Number(process.env.RADAR_CREDITS_TIER3 || 3)))
    }
  };
}

function sumCreditsFromRows(rows) {
  return (rows || []).reduce((acc, row) => {
    const c = row?.meta?.credits_charged;
    if (c != null && Number.isFinite(Number(c))) {
      return acc + Math.max(0, Math.floor(Number(c)));
    }
    return acc + 1;
  }, 0);
}

module.exports = {
  DEFAULT_MONTHLY,
  DEFAULT_TIER2_HA,
  DEFAULT_TIER3_HA,
  DEFAULT_MAX_AREA_HA,
  getMonthlyBaseLimit,
  getRadarMaxAreaHa,
  getAreaHectaresFromLocation,
  getRadarAreaLimitError,
  getRadarCreditCostForArea,
  getRadarCreditPricingInfo,
  sumCreditsFromRows
};
