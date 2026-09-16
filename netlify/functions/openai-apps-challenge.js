'use strict';

/**
 * Domain verification for OpenAI Plugins Directory.
 * Set Netlify env OPENAI_APPS_CHALLENGE to the exact portal token.
 * URL: https://nutriplantpro.com/.well-known/openai-apps-challenge
 */
exports.handler = async function () {
  const token = String(process.env.OPENAI_APPS_CHALLENGE || '').trim();
  if (!token) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
      body: 'OPENAI_APPS_CHALLENGE not configured'
    };
  }
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    body: token
  };
};
