/**
 * Expira suscripciones "manuales" (sin PayPal) cuando next_payment_date ya pasó.
 * Solo toca perfiles con subscription_status = 'active' y paypal_subscription_id NULL.
 * Las que tienen PayPal las maneja el webhook BILLING.SUBSCRIPTION.EXPIRED.
 *
 * Ejecutar 1 vez al día vía cron (ver supabase-cron-expire-subscriptions.sql).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function expireSubscriptionsByDate(): Promise<{ expired: number; error?: string }> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { expired: 0, error: "Missing env" };
  }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const { data, error } = await supabase
    .from("profiles")
    .update({
      subscription_status: "expired",
      updated_at: new Date().toISOString(),
    })
    .eq("subscription_status", "active")
    .is("paypal_subscription_id", null)
    .lt("next_payment_date", today)
    .not("next_payment_date", "is", null)
    .select("id");

  if (error) return { expired: 0, error: error.message };
  const expired = Array.isArray(data) ? data.length : 0;
  return { expired };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  const result = await expireSubscriptionsByDate();
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});
