'use strict';

const crypto = require('crypto');

const PREFIX = 'nutri-pro-pdf-file:';

function shareSecret() {
  return (
    process.env.NUTRIPLANT_FILE_SHARE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  ).trim();
}

function nutriProFileShareToken(fileId) {
  const secret = shareSecret();
  const id = String(fileId || '').trim();
  if (!secret || !id) return '';
  return crypto.createHmac('sha256', secret).update(PREFIX + id).digest('hex').slice(0, 48);
}

function verifyNutriProFileShareToken(fileId, token) {
  const expected = nutriProFileShareToken(fileId);
  const got = String(token || '').trim();
  if (!expected || !got || got.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(got));
  } catch (_e) {
    return false;
  }
}

function nutriProFileOpenUrl(fileId, baseUrl) {
  const base = String(baseUrl || '').replace(/\/$/, '');
  const t = nutriProFileShareToken(fileId);
  if (!t) return '';
  return (
    base +
    '/api/nutri-pro-file-open?fid=' +
    encodeURIComponent(String(fileId || '').trim()) +
    '&t=' +
    encodeURIComponent(t)
  );
}

module.exports = {
  nutriProFileShareToken,
  verifyNutriProFileShareToken,
  nutriProFileOpenUrl
};
