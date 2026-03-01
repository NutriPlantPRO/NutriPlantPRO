import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Json = Record<string, unknown>;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID") ?? "";
const PAYPAL_CLIENT_SECRET = Deno.env.get("PAYPAL_CLIENT_SECRET") ?? "";
const PAYPAL_WEBHOOK_ID = Deno.env.get("PAYPAL_WEBHOOK_ID") ?? "";
const PAYPAL_API_BASE = Deno.env.get("PAYPAL_API_BASE") || "https://api-m.paypal.com";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function jsonResponse(body: Json, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
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

async function verifyWebhookSignature(eventBody: Json, headers: Headers): Promise<boolean> {
  const transmissionId = headers.get("paypal-transmission-id");
  const transmissionTime = headers.get("paypal-transmission-time");
  const certUrl = headers.get("paypal-cert-url");
  const authAlgo = headers.get("paypal-auth-algo");
  const transmissionSig = headers.get("paypal-transmission-sig");

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig || !PAYPAL_WEBHOOK_ID) {
    return false;
  }

  const accessToken = await getPayPalAccessToken();
  const payload = {
    transmission_id: transmissionId,
    transmission_time: transmissionTime,
    cert_url: certUrl,
    auth_algo: authAlgo,
    transmission_sig: transmissionSig,
    webhook_id: PAYPAL_WEBHOOK_ID,
    webhook_event: eventBody,
  };

  const res = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) return false;
  const data = await res.json();
  return data.verification_status === "SUCCESS";
}

const SUBSCRIPTION_MONTHS = 5; // ciclo cada 5 meses

function addMonths(date: Date, months: number): string {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
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
  // Fallback de compatibilidad si PayPal no devuelve next_billing_time.
  if (!payFields.next_payment_date && status === "active" && activatedAt) {
    payFields.next_payment_date = addMonths(new Date(activatedAt), SUBSCRIPTION_MONTHS);
  }

  const baseUpdate = {
    subscription_status: status,
    updated_at: now,
    ...(activatedAt ? { subscription_activated_at: activatedAt } : {}),
    ...payFields,
  };

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
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET || !PAYPAL_WEBHOOK_ID) {
    return jsonResponse({ error: "Missing required env vars" }, 500);
  }

  let payload: Json;
  try {
    payload = (await req.json()) as Json;
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  try {
    const valid = await verifyWebhookSignature(payload, req.headers);
    if (!valid) return jsonResponse({ error: "Invalid PayPal signature" }, 401);
  } catch (e) {
    return jsonResponse({ error: `Signature verification failed: ${(e as Error).message}` }, 401);
  }

  const eventType = String(payload.event_type ?? "");
  const resource = (payload.resource ?? {}) as Json;
  const subscriptionId = String(resource.id ?? "");
  const customUserId = resource.custom_id ? String(resource.custom_id) : null;

  if (!eventType || !subscriptionId) {
    return jsonResponse({ ok: true, ignored: true, reason: "Missing event_type or subscription id" });
  }

  // Mapear eventos PayPal -> estado interno (cubre todos los que PayPal envía para suscripciones)
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
    // Si falla consulta a PayPal, seguimos con webhook para no perder transición de estado.
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

