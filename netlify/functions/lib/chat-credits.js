/**
 * Cuota de créditos de chat (profiles) compartida por Chat IA y extract PDF lab.
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * profiles: chat_blocked, chat_limit_monthly, chat_usage_current_month, chat_usage_month,
 *           subscription_status, cancelled_by_admin, next_payment_date
 */

'use strict';

const { createClient } = require('@supabase/supabase-js');

const DEFAULT_MONTHLY_CREDITS = 250;

/** Créditos por extracción PDF/imagen de laboratorio (misma bolsa que el chat). */
const CREDITS_LAB_EXTRACT = 3;

function monthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getServiceSupabase() {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

async function getQuotaFromSupabase(supabase, userId) {
  if (!supabase || !userId || userId === 'anonymous') return null;
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'chat_blocked, chat_limit_monthly, chat_usage_current_month, chat_usage_month, subscription_status, cancelled_by_admin, next_payment_date'
    )
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.warn('chat-credits getQuota', error.message);
    return null;
  }
  return data;
}

async function addUsageInSupabase(supabase, userId, creditsToAdd) {
  if (!supabase || !userId || userId === 'anonymous') return;
  const currentMonth = monthKey();
  const { data: row, error: selectErr } = await supabase
    .from('profiles')
    .select('chat_usage_current_month, chat_usage_month')
    .eq('id', userId)
    .maybeSingle();
  if (selectErr) {
    console.warn('chat-credits select usage', selectErr.message);
    return;
  }
  let usage = Number(row && row.chat_usage_current_month) || 0;
  const usageMonth = (row && row.chat_usage_month) || '';
  if (usageMonth !== currentMonth) usage = 0;
  usage = Math.max(0, Math.round((usage + (Number(creditsToAdd) || 0)) * 1000) / 1000);
  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ chat_usage_current_month: usage, chat_usage_month: currentMonth })
    .eq('id', userId);
  if (updateErr) console.warn('chat-credits update usage', updateErr.message);
}

/**
 * @returns {{ ok: true, supabase, limitCredits, usedCredits, month } | { ok: false, status, error, code, quota? }}
 */
async function assertChatCredits(userId, requiredCredits) {
  const needed = Math.max(1, Number(requiredCredits) || 1);
  const supabase = getServiceSupabase();
  if (!supabase) {
    // Sin service role no podemos cobrar; permitir extracción pero avisar en logs.
    console.warn('chat-credits: SUPABASE_SERVICE_ROLE_KEY ausente; no se descontarán créditos.');
    return { ok: true, supabase: null, limitCredits: -1, usedCredits: 0, month: monthKey(), skipped: true };
  }

  const quota = await getQuotaFromSupabase(supabase, userId);
  if (!quota) {
    return { ok: true, supabase, limitCredits: -1, usedCredits: 0, month: monthKey(), skipped: true };
  }

  if (quota.chat_blocked === true) {
    return {
      ok: false,
      status: 403,
      code: 'chat_blocked',
      error:
        'El chat/IA está deshabilitado para tu cuenta. Contacta al administrador si necesitas activarlo.'
    };
  }

  let limitCredits = quota.chat_limit_monthly;
  const hasAccess =
    quota.subscription_status === 'active' ||
    (quota.subscription_status === 'cancelled' &&
      quota.cancelled_by_admin !== true &&
      quota.next_payment_date &&
      new Date() <= new Date(quota.next_payment_date + 'T23:59:59'));
  const isActiveSubscriber = !!hasAccess;
  if (limitCredits === -1 || limitCredits == null || limitCredits === '') {
    limitCredits = isActiveSubscriber ? DEFAULT_MONTHLY_CREDITS : -1;
  } else {
    limitCredits = Math.max(0, Number(limitCredits));
  }

  const currentMonth = monthKey();
  let usedCredits = Number(quota.chat_usage_current_month) || 0;
  if ((quota.chat_usage_month || '') !== currentMonth) usedCredits = 0;

  if (limitCredits >= 0) {
    if (usedCredits >= limitCredits) {
      return {
        ok: false,
        status: 429,
        code: 'quota_exceeded',
        error: 'Has alcanzado el límite mensual de créditos de IA (chat / PDF).',
        quota: {
          month: currentMonth,
          limit_credits: limitCredits,
          used_credits: Math.floor(usedCredits),
          required_credits: needed
        }
      };
    }
    if (usedCredits + needed > limitCredits) {
      return {
        ok: false,
        status: 429,
        code: 'quota_preventive_block',
        error:
          'No te quedan créditos suficientes para esta extracción (cuesta ' +
          needed +
          ').',
        quota: {
          month: currentMonth,
          limit_credits: limitCredits,
          used_credits: Math.floor(usedCredits),
          required_credits: needed
        }
      };
    }
  }

  return {
    ok: true,
    supabase,
    limitCredits,
    usedCredits,
    month: currentMonth,
    skipped: false
  };
}

module.exports = {
  DEFAULT_MONTHLY_CREDITS,
  CREDITS_LAB_EXTRACT,
  monthKey,
  getServiceSupabase,
  getQuotaFromSupabase,
  addUsageInSupabase,
  assertChatCredits
};
