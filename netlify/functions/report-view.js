/**
 * Netlify Function: vista compartida de reportes por token.
 *
 * URL esperada:
 *   /api/report-view?rid=<report_id>&t=<share_token>
 *
 * Seguridad:
 * - Usa SUPABASE_SERVICE_ROLE_KEY en backend (nunca en navegador).
 * - Devuelve HTML solo si rid + token coinciden y el link no está vencido.
 */

function htmlResponse(statusCode, html) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow'
    },
    body: html
  };
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function errorPage(title, message) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin:0; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background:#f8fafc; color:#1e293b; }
    .box { max-width: 760px; margin: 48px auto; background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:24px; }
    h1 { margin:0 0 8px 0; font-size:22px; color:#0f172a; }
    p { margin:0; color:#475569; line-height:1.5; }
  </style>
</head>
<body>
  <div class="box">
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(message)}</p>
  </div>
</body>
</html>`;
}

function withSharedViewChrome(reportHtml, expiresAt) {
  const expText = expiresAt
    ? new Date(expiresAt).toLocaleString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '7 días';

  const chromeCss = `<style id="np-shared-view-style">
    .np-shared-topbar{position:sticky;top:0;z-index:9999;background:#ffffff;border-bottom:1px solid #e2e8f0}
    .np-shared-topbar .inner{max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;padding:10px 14px}
    .np-shared-topbar img{height:34px;width:auto;display:block}
    .np-shared-topbar .links{display:flex;align-items:center;gap:12px;color:#64748b;font-size:14px}
    .np-shared-topbar .links a{text-decoration:none;color:#64748b}
    .np-shared-note{max-width:1200px;margin:10px auto 0;padding:10px 12px;border:1px solid #bae6fd;background:#eff6ff;color:#0c4a6e;border-radius:8px;font:600 13px/1.35 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
  </style>`;
  const chromeHeader = `<header class="np-shared-topbar">
    <div class="inner">
      <a href="https://nutriplantpro.com/dashboard.html" target="_blank" rel="noopener noreferrer">
        <img src="https://nutriplantpro.com/assets/NutriPlant_PRO_blue.png" alt="NutriPlant PRO">
      </a>
      <nav class="links">
        <a href="https://www.facebook.com/share/16tGD4XMM9/" target="_blank" rel="noopener noreferrer">Facebook</a>
        <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer">Instagram</a>
        <a href="https://www.tiktok.com/" target="_blank" rel="noopener noreferrer">TikTok</a>
        <a href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer">YouTube</a>
      </nav>
    </div>
  </header>
  <div class="np-shared-note">Vista compartida de reporte. Este link es temporal y tiene vigencia de 7 días (vence: ${escapeHtml(expText)}).</div>`;

  let out = String(reportHtml || '');
  if (/<head[^>]*>/i.test(out)) out = out.replace(/<head[^>]*>/i, function(m) { return m + chromeCss; });
  else out = '<head>' + chromeCss + '</head>' + out;
  if (/<body[^>]*>/i.test(out)) out = out.replace(/<body[^>]*>/i, function(m) { return m + chromeHeader; });
  else out = '<body>' + chromeHeader + out + '</body>';
  return out;
}

exports.handler = async function(event) {
  try {
    const q = event.queryStringParameters || {};
    const reportId = String(q.rid || '').trim();
    const token = String(q.t || '').trim();

    if (!reportId || !token) {
      return htmlResponse(400, errorPage('Link inválido', 'Faltan parámetros para abrir esta vista compartida.'));
    }

    const supabaseUrl = String(process.env.SUPABASE_URL || '').trim();
    const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    if (!supabaseUrl || !serviceRoleKey) {
      return htmlResponse(500, errorPage('Configuración incompleta', 'El servidor no tiene credenciales para mostrar reportes compartidos.'));
    }

    const url = `${supabaseUrl}/rest/v1/reports?select=id,data&id=eq.${encodeURIComponent(reportId)}&limit=1`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Accept: 'application/json'
      }
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(function() { return ''; });
      return htmlResponse(502, errorPage('No se pudo abrir el reporte', `Error consultando datos (${resp.status}). ${txt || ''}`.trim()));
    }

    const rows = await resp.json();
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row || !row.data || typeof row.data !== 'object') {
      return htmlResponse(404, errorPage('Reporte no encontrado', 'No existe un reporte asociado a este link.'));
    }

    const data = row.data || {};
    const shareEnabled = !(data.shareEnabled === false || data.share_enabled === false);
    const storedToken = String(data.shareToken || data.share_token || '').trim();
    const expiresAt = data.shareExpiresAt || data.share_expires_at || null;

    if (!shareEnabled || !storedToken || storedToken !== token) {
      return htmlResponse(403, errorPage('Acceso denegado', 'Este link no es válido para ver el reporte solicitado.'));
    }
    if (expiresAt) {
      const expMs = new Date(expiresAt).getTime();
      if (Number.isFinite(expMs) && expMs < Date.now()) {
        return htmlResponse(410, errorPage('Link vencido', 'El link de vista compartida expiró. Solicita uno nuevo.'));
      }
    }

    const html = typeof data.reportHTML === 'string' ? data.reportHTML : '';
    if (!html) {
      return htmlResponse(410, errorPage('Vista no disponible', 'Este reporte no tiene una vista lista para compartir. Genera un nuevo link.'));
    }

    return htmlResponse(200, withSharedViewChrome(html, expiresAt));
  } catch (e) {
    return htmlResponse(500, errorPage('Error inesperado', e && e.message ? e.message : 'No se pudo abrir esta vista.'));
  }
};

