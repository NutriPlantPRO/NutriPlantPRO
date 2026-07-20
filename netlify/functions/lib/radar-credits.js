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

/**
 * Bonus admin = créditos EXTRA disponibles (se gastan cuando ya no queda base).
 * Disponibles = max(0, base − usados) + bonus.
 * Así, si ya gastó la base, bonus 10 → 10 disponibles (no hace falta bonus ≥ usados−base).
 */
function buildRadarCreditsView(base, bonus, used) {
  const b = Math.max(0, Math.floor(Number(base) || 0));
  const bonusRem = Math.max(0, Math.floor(Number(bonus) || 0));
  const u = Math.max(0, Math.floor(Number(used) || 0));
  const baseRemaining = Math.max(0, b - u);
  const available = baseRemaining + bonusRem;
  return {
    base: b,
    bonus: bonusRem,
    used: u,
    base_remaining: baseRemaining,
    available,
    /** Asignación admin: base + bonus (informativo). */
    limit: b + bonusRem
  };
}

function canAffordRadarCredits(view, cost) {
  const c = Math.max(0, Math.floor(Number(cost) || 0));
  const snap = view && typeof view === 'object' ? view : buildRadarCreditsView(0, 0, 0);
  return c <= Math.max(0, Number(snap.available) || 0);
}

/** Cuánto del costo sale de la base restante vs del bonus. */
function splitRadarCreditCharge(base, bonus, used, cost) {
  const snap = buildRadarCreditsView(base, bonus, used);
  const c = Math.max(0, Math.floor(Number(cost) || 0));
  if (c > snap.available) {
    return { ok: false, fromBase: 0, fromBonus: 0, ...snap, required: c };
  }
  const fromBase = Math.min(c, snap.base_remaining);
  const fromBonus = c - fromBase;
  return { ok: true, fromBase, fromBonus, ...snap, required: c };
}

async function setRadarBonusCredits(supabase, userId, nextBonus) {
  if (!supabase || !userId) return false;
  const next = Math.max(0, Math.floor(Number(nextBonus) || 0));
  const { error: upErr } = await supabase
    .from('profiles')
    .update({ radar_credits_bonus: next, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (upErr) {
    console.warn('setRadarBonusCredits:', upErr.message);
    return false;
  }
  return true;
}

async function consumeRadarBonusCredits(supabase, userId, fromBonus) {
  const n = Math.max(0, Math.floor(Number(fromBonus) || 0));
  if (!supabase || !userId || n <= 0) return true;
  const { data, error } = await supabase
    .from('profiles')
    .select('radar_credits_bonus')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.warn('consumeRadarBonusCredits read:', error.message);
    return false;
  }
  const current = Math.max(0, Math.floor(Number(data?.radar_credits_bonus) || 0));
  const next = Math.max(0, current - n);
  if (next === current) return true;
  return setRadarBonusCredits(supabase, userId, next);
}

/** Devuelve bonus (p. ej. si el job Pilot/Lectura falla tras haberlo reservado). */
async function restoreRadarBonusCredits(supabase, userId, amount) {
  const n = Math.max(0, Math.floor(Number(amount) || 0));
  if (!supabase || !userId || n <= 0) return true;
  const { data, error } = await supabase
    .from('profiles')
    .select('radar_credits_bonus')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.warn('restoreRadarBonusCredits read:', error.message);
    return false;
  }
  const current = Math.max(0, Math.floor(Number(data?.radar_credits_bonus) || 0));
  return setRadarBonusCredits(supabase, userId, current + n);
}

/**
 * Reserva/cobra: gasta primero lo que quede de base (vía `used`) y luego descuenta bonus.
 * Devuelve payload de créditos tras el cargo y cuánto salió del bonus.
 */
async function applyRadarCreditCharge(supabase, userId, base, bonus, used, cost) {
  const split = splitRadarCreditCharge(base, bonus, used, cost);
  if (!split.ok) {
    return { ok: false, ...split, credits: buildRadarCreditsView(base, bonus, used) };
  }
  if (split.fromBonus > 0) {
    const ok = await consumeRadarBonusCredits(supabase, userId, split.fromBonus);
    if (!ok) {
      return {
        ok: false,
        error: 'bonus_consume_failed',
        ...split,
        credits: buildRadarCreditsView(base, bonus, used)
      };
    }
  }
  const bonusAfter = Math.max(0, split.bonus - split.fromBonus);
  const usedAfter = split.used + split.required;
  return {
    ok: true,
    fromBase: split.fromBase,
    fromBonus: split.fromBonus,
    charged: split.required,
    credits: buildRadarCreditsView(base, bonusAfter, usedAfter)
  };
}

function creditsApiPayload(view, extra) {
  const v = view && typeof view === 'object' ? view : buildRadarCreditsView(0, 0, 0);
  return {
    used: v.used,
    limit: v.limit,
    base: v.base,
    bonus: v.bonus,
    base_remaining: v.base_remaining,
    available: v.available,
    ...(extra && typeof extra === 'object' ? extra : {})
  };
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
  sumCreditsFromRows,
  buildRadarCreditsView,
  canAffordRadarCredits,
  splitRadarCreditCharge,
  consumeRadarBonusCredits,
  restoreRadarBonusCredits,
  applyRadarCreditCharge,
  creditsApiPayload
};
