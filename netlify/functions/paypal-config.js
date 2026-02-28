/**
 * Netlify Function: devuelve Client ID y Plan ID de PayPal para el frontend (Live en producción).
 * La clave secreta de PayPal NUNCA se expone; va en Supabase para el webhook.
 *
 * Variables de entorno en Netlify:
 *   PAYPAL_CLIENT_ID  - Client ID Live de PayPal (Apps & Credentials → Live)
 *   PAYPAL_PLAN_ID    - Plan ID Live (P-xxxxx) del plan de suscripción cada 5 meses
 *
 * Si no están definidas, devuelve null para que el frontend use fallback (sandbox/local).
 */

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };
}

exports.handler = async function (event, context) {
  const clientId = (process.env.PAYPAL_CLIENT_ID || '').trim();
  const planId = (process.env.PAYPAL_PLAN_ID || '').trim();

  return {
    statusCode: 200,
    headers: corsHeaders(),
    body: JSON.stringify({
      clientId: clientId || null,
      planId: planId || null
    })
  };
};
