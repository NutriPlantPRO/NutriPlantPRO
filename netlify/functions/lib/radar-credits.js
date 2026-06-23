/**
 * Créditos Radar NDVI/NDMI por mes y por superficie del polígono (ha).
 * Umbrales por defecto: ≤30 ha = 1 · >30 ha = 2 · >100 ha = 3
 */
const DEFAULT_MONTHLY = 20;
const DEFAULT_TIER2_HA = 30;
const DEFAULT_TIER3_HA = 100;

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

function getAreaHectaresFromLocation(location) {
  if (!location || location.areaHectares == null) return null;
  const ha = Number(location.areaHectares);
  if (!Number.isFinite(ha) || ha <= 0) return null;
  return ha;
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
  const ha = Number(areaHa);
  const normalizedHa = Number.isFinite(ha) && ha > 0 ? ha : null;
  return {
    area_hectares: normalizedHa,
    credits_charged: getRadarCreditCostForArea(normalizedHa),
    pricing: {
      monthly_base: getMonthlyBaseLimit(),
      tier2_threshold_ha: tier2Ha,
      tier3_threshold_ha: tier3Ha,
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
  getMonthlyBaseLimit,
  getAreaHectaresFromLocation,
  getRadarCreditCostForArea,
  getRadarCreditPricingInfo,
  sumCreditsFromRows
};
