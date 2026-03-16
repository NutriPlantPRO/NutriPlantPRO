import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Json = Record<string, unknown>;

function env(key: string, def = ""): string {
  return (Deno.env.get(key) ?? def).trim();
}
const SUPABASE_URL = env("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = env("SUPABASE_SERVICE_ROLE_KEY");
const PAYPAL_CLIENT_ID = env("PAYPAL_CLIENT_ID");
const PAYPAL_CLIENT_SECRET = env("PAYPAL_CLIENT_SECRET");
const PAYPAL_WEBHOOK_ID = env("PAYPAL_WEBHOOK_ID");
const PAYPAL_API_BASE = env("PAYPAL_API_BASE") || "https://api-m.paypal.com";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function jsonResponse(body: Json, status = 200, extraHeaders?: Record<string, string>) {
  const headers: Record<string, string> = { "content-type": "application/json; charset=utf-8", ...extraHeaders };
  return new Response(JSON.stringify(body), { status, headers });
}

async function getPayPalAccessToken(): Promise<string> {
  const auth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`);
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`PayPal token error ${res.status}: ${txt}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

type VerifyResult = { ok: true } | { ok: false; reason: string };

async function verifyWebhookSignature(rawBody: string, headers: Headers): Promise<VerifyResult> {
  const transmissionId = headers.get("paypal-transmission-id");
  const transmissionTime = headers.get("paypal-transmission-time");
  const certUrl = headers.get("paypal-cert-url");
  const authAlgo = headers.get("paypal-auth-algo");
  const transmissionSig = headers.get("paypal-transmission-sig");

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    return { ok: false, reason: "Missing PayPal transmission headers" };
  }
  if (!PAYPAL_WEBHOOK_ID) {
    return { ok: false, reason: "PAYPAL_WEBHOOK_ID not set or empty (check Supabase secrets)" };
  }

  const accessToken = await getPayPalAccessToken();
  let webhookEvent: Json;
  try {
    webhookEvent = JSON.parse(rawBody) as Json;
  } catch {
    return { ok: false, reason: "Invalid webhook body JSON" };
  }
  // Use parsed object for verify (gateway may alter raw body; object works with Live in practice).
  const verifyPayload = {
    transmission_id: transmissionId,
    transmission_time: transmissionTime,
    cert_url: certUrl,
    auth_algo: authAlgo,
    transmission_sig: transmissionSig,
    webhook_id: PAYPAL_WEBHOOK_ID,
    webhook_event: webhookEvent,
  };

  const res = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(verifyPayload),
  });

  const data = (await res.json()) as { verification_status?: string; message?: string };
  if (res.ok && data.verification_status === "SUCCESS") return { ok: true };
  const reason = res.ok
    ? `PayPal verification_status=${data.verification_status ?? "unknown"}`
    : `PayPal API ${res.status}: ${data.message ?? res.statusText ?? "verify failed"}`;
  return { ok: false, reason };
}

async function verifyWebhookByEventLookup(eventBody: Json): Promise<VerifyResult> {
  const eventId = asString(eventBody.id);
  if (!eventId) return { ok: false, reason: "Missing event id for PayPal lookup verification" };

  const accessToken = await getPayPalAccessToken();
  const res = await fetch(`${PAYPAL_API_BASE}/v1/notifications/webhooks-events/${encodeURIComponent(eventId)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
  });
  if (!res.ok) {
    const txt = await res.text();
    return { ok: false, reason: `PayPal webhook event lookup ${res.status}: ${txt}` };
  }

  const remote = (await res.json()) as Json;
  const localType = asString(eventBody.event_type);
  const remoteType = asString(remote.event_type);
  const localResource = (eventBody.resource ?? {}) as Json;
  const remoteResource = (remote.resource ?? {}) as Json;
  const localSubId = asString(localResource.id) ?? asString(localResource.billing_agreement_id);
  const remoteSubId = asString(remoteResource.id) ?? asString(remoteResource.billing_agreement_id);

  if (localType && remoteType && localType !== remoteType) {
    return { ok: false, reason: `PayPal lookup mismatch event_type local=${localType} remote=${remoteType}` };
  }
  if (localSubId && remoteSubId && localSubId !== remoteSubId) {
    return { ok: false, reason: `PayPal lookup mismatch subscription local=${localSubId} remote=${remoteSubId}` };
  }
  return { ok: true };
}

const SUBSCRIPTION_MONTHS = 5; // ciclo cada 5 meses
const TRIAL_DAYS = 10; // prueba gratis 10 días

function addMonths(date: Date, months: number): string {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

function addDays(date: Date | string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

async function getPayPalSubscriptionSnapshot(subscriptionId: string): Promise<{
  customUserId: string | null;
  startTime: string | null;
  nextBillingTime: string | null;
  lastPaymentTime: string | null;
}> {
  const accessToken = await getPayPalAccessToken();
  const res = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`PayPal subscription fetch error ${res.status}: ${txt}`);
  }

  const data = (await res.json()) as Json;
  const billingInfo = (data.billing_info ?? {}) as Json;
  const lastPayment = (billingInfo.last_payment ?? {}) as Json;

  return {
    customUserId: asString(data.custom_id),
    startTime: asString(data.start_time),
    nextBillingTime: asString(billingInfo.next_billing_time),
    lastPaymentTime: asString(lastPayment.time),
  };
}

async function applySubscriptionStatus(params: {
  subscriptionId: string;
  status: string;
  activatedAt?: string | null;
  lastPaymentDate?: string | null;
  nextPaymentDate?: string | null;
  customUserId?: string | null;
}) {
  const {
    subscriptionId,
    status,
    activatedAt,
    lastPaymentDate,
    nextPaymentDate,
    customUserId,
  } = params;
  const now = new Date().toISOString();
  const payFields: Record<string, string> = {};
  if (lastPaymentDate) payFields.last_payment_date = lastPaymentDate;
  if (nextPaymentDate) payFields.next_payment_date = nextPaymentDate;
  // Si PayPal no devolvió next_billing_time: en trial (sin último pago) = próximo pago en 10 días; si ya pagó = 5 meses.
  if (!payFields.next_payment_date && status === "active" && activatedAt) {
    if (!lastPaymentDate) {
      payFields.next_payment_date = addDays(activatedAt, TRIAL_DAYS); // fin de trial = primer cobro
    } else {
      payFields.next_payment_date = addMonths(new Date(activatedAt), SUBSCRIPTION_MONTHS);
    }
  }

  // Cancelación por PayPal: no es por admin → acceso hasta next_payment_date (se valida en auth).
  const baseUpdate: Record<string, unknown> = {
    subscription_status: status,
    updated_at: now,
    ...(activatedAt ? { subscription_activated_at: activatedAt } : {}),
    ...payFields,
  };
  if (status === "cancelled") baseUpdate.cancelled_by_admin = false;
  if (status === "active") baseUpdate.cancelled_by_admin = false;

  // Ruta 1: usuario ya tiene paypal_subscription_id guardado
  let query = supabase
    .from("profiles")
    .update(baseUpdate)
    .eq("paypal_subscription_id", subscriptionId)
    .select("id");

  const first = await query;
  if (!first.error && first.data && first.data.length > 0) {
    return { updated: first.data.length, mode: "by_subscription_id" };
  }

  // Ruta 2: fallback por custom_id (user UUID enviado en createSubscription)
  if (customUserId && /^[0-9a-f-]{36}$/i.test(customUserId)) {
    const second = await supabase
      .from("profiles")
      .update({
        paypal_subscription_id: subscriptionId,
        ...baseUpdate,
      })
      .eq("id", customUserId)
      .select("id");
    if (!second.error && second.data && second.data.length > 0) {
      return { updated: second.data.length, mode: "by_custom_id" };
    }
  }

  return { updated: 0, mode: "not_found" };
}

Deno.serve(async (req) => {
  // GET = diagnóstico de secrets (sin mostrar valores). Útil para comprobar sin esperar a PayPal.
  if (req.method === "GET") {
    const url = new URL(req.url);
    if (url.searchParams.get("diagnose") === "1") {
      return jsonResponse({
        ok: true,
        check: "diagnose",
        env: {
          SUPABASE_URL: SUPABASE_URL ? `set (${SUPABASE_URL.length} chars)` : "missing",
          SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_ROLE_KEY ? "set" : "missing",
          PAYPAL_CLIENT_ID: PAYPAL_CLIENT_ID ? `set (${PAYPAL_CLIENT_ID.length} chars)` : "missing",
          PAYPAL_CLIENT_SECRET: PAYPAL_CLIENT_SECRET ? "set" : "missing",
          PAYPAL_WEBHOOK_ID: PAYPAL_WEBHOOK_ID ? `set (${PAYPAL_WEBHOOK_ID.length} chars): ${PAYPAL_WEBHOOK_ID}` : "missing",
          PAYPAL_API_BASE: PAYPAL_API_BASE || "default (api-m.paypal.com)",
        },
      });
    }
    return jsonResponse({ error: "Method not allowed" }, 405);
  }
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET || !PAYPAL_WEBHOOK_ID) {
    return jsonResponse({ error: "Missing required env vars" }, 500);
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return jsonResponse({ error: "Failed to read body" }, 400);
  }
  let payload: Json;
  try {
    payload = JSON.parse(rawBody) as Json;
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  // POST con {"diagnose": true} = comprobar secrets sin verificación PayPal (para Test en Supabase).
  if (payload.diagnose === true) {
    return jsonResponse({
      ok: true,
      check: "diagnose",
      env: {
        SUPABASE_URL: SUPABASE_URL ? `set (${SUPABASE_URL.length} chars)` : "missing",
        SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_ROLE_KEY ? "set" : "missing",
        PAYPAL_CLIENT_ID: PAYPAL_CLIENT_ID ? `set (${PAYPAL_CLIENT_ID.length} chars)` : "missing",
        PAYPAL_CLIENT_SECRET: PAYPAL_CLIENT_SECRET ? "set" : "missing",
        PAYPAL_WEBHOOK_ID: PAYPAL_WEBHOOK_ID ? `set (${PAYPAL_WEBHOOK_ID.length} chars): ${PAYPAL_WEBHOOK_ID}` : "missing",
        PAYPAL_API_BASE: PAYPAL_API_BASE || "default (api-m.paypal.com)",
      },
    });
  }

  try {
    const result = await verifyWebhookSignature(rawBody, req.headers);
    if (!result.ok) {
      const fallback = await verifyWebhookByEventLookup(payload);
      if (!fallback.ok) {
        console.error("paypal-webhook 401:", `${result.reason} | fallback=${fallback.reason}`);
        const reason = String(`${result.reason} | fallback=${fallback.reason}`).slice(0, 500);
        try {
          await supabase.from("paypal_webhook_errors").insert({ reason: reason.slice(0, 2000) });
        } catch (e) {
          console.error("paypal_webhook_errors insert failed:", (e as Error).message);
        }
        return jsonResponse(
          { error: "Invalid PayPal signature", reason },
          401,
          { "X-PayPal-Webhook-Reason": reason },
        );
      }
      console.warn("paypal-webhook: signature verify failed but event lookup succeeded");
    }
  } catch (e) {
    const msg = (e as Error).message;
    console.error("paypal-webhook 401:", msg);
    const reason = msg.slice(0, 500);
    try {
      await supabase.from("paypal_webhook_errors").insert({ reason: msg.slice(0, 2000) });
    } catch (e) {
      console.error("paypal_webhook_errors insert failed:", (e as Error).message);
    }
    return jsonResponse(
      { error: "Signature verification failed", reason: msg },
      401,
      { "X-PayPal-Webhook-Reason": reason },
    );
  }

  const eventType = String(payload.event_type ?? "");
  const resource = (payload.resource ?? {}) as Json;

  // PAYMENT.SALE.COMPLETED: cobro realizado (p. ej. tras fin del trial). resource.id = sale id, subscription = billing_agreement_id
  if (eventType === "PAYMENT.SALE.COMPLETED") {
    const subscriptionId = asString(resource.billing_agreement_id);
    if (!subscriptionId) {
      return jsonResponse({ ok: true, ignored: true, event_type: eventType, reason: "No billing_agreement_id" });
    }
    const saleTime = asString(resource.create_time);
    let snapshot: Awaited<ReturnType<typeof getPayPalSubscriptionSnapshot>> | null = null;
    try {
      snapshot = await getPayPalSubscriptionSnapshot(subscriptionId);
    } catch (e) {
      console.warn("PayPal subscription snapshot not available:", (e as Error).message);
    }
    const result = await applySubscriptionStatus({
      subscriptionId,
      status: "active",
      lastPaymentDate: snapshot?.lastPaymentTime ?? saleTime ?? null,
      nextPaymentDate: snapshot?.nextBillingTime ?? null,
      customUserId: snapshot?.customUserId ?? null,
    });
    return jsonResponse({
      ok: true,
      event_type: eventType,
      subscription_id: subscriptionId,
      profile_updates: result.updated,
      update_mode: result.mode,
    });
  }

  // BILLING.SUBSCRIPTION.*: el resource.id es el subscription id
  const subscriptionId = String(resource.id ?? "");
  const customUserId = resource.custom_id ? String(resource.custom_id) : null;

  if (!eventType || !subscriptionId) {
    return jsonResponse({ ok: true, ignored: true, reason: "Missing event_type or subscription id" });
  }

  const statusMap: Record<string, string> = {
    "BILLING.SUBSCRIPTION.CREATED": "pending",
    "BILLING.SUBSCRIPTION.APPROVED": "pending",
    "BILLING.SUBSCRIPTION.ACTIVATED": "active",
    "BILLING.SUBSCRIPTION.CANCELLED": "cancelled",
    "BILLING.SUBSCRIPTION.SUSPENDED": "suspended",
    "BILLING.SUBSCRIPTION.EXPIRED": "expired",
  };
  const nextStatus = statusMap[eventType];
  if (!nextStatus) {
    return jsonResponse({ ok: true, ignored: true, event_type: eventType });
  }

  let snapshot: Awaited<ReturnType<typeof getPayPalSubscriptionSnapshot>> | null = null;
  try {
    snapshot = await getPayPalSubscriptionSnapshot(subscriptionId);
  } catch (e) {
    console.warn("PayPal subscription snapshot not available:", (e as Error).message);
  }

  const activatedAt =
    nextStatus === "active"
      ? snapshot?.startTime || asString(resource.start_time) || new Date().toISOString()
      : null;
  const result = await applySubscriptionStatus({
    subscriptionId,
    status: nextStatus,
    activatedAt,
    lastPaymentDate: snapshot?.lastPaymentTime ?? null,
    nextPaymentDate: snapshot?.nextBillingTime ?? null,
    customUserId: snapshot?.customUserId ?? customUserId,
  });

  return jsonResponse({
    ok: true,
    event_type: eventType,
    subscription_id: subscriptionId,
    profile_updates: result.updated,
    update_mode: result.mode,
  });
});

