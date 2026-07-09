/**
 * Netlify Function: vista compartida de reportes por token.
 *
 * URL esperada:
 *   /api/report-view?rid=<report_id>&t=<share_token>
 *
 * Seguridad:
 * - Usa SUPABASE_SERVICE_ROLE_KEY en backend (nunca en navegador).
 * - Devuelve HTML solo si rid + token coinciden (sin fecha de vencimiento).
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

function withSharedViewChrome(reportHtml, options) {
  const opts = options || {};
  const proto = String(opts.proto || 'https').split(',')[0].trim();
  const host = String(opts.host || 'nutriplantpro.com').split(',')[0].trim();
  const baseHref = String(opts.baseUrl || `${proto}://${host}/`).replace(/\/?$/, '/');

  const baseTag = `<base href="${escapeHtml(baseHref)}">`;

  const chromeCss = `<style id="np-shared-view-style">
    .np-shared-topbar{position:sticky;top:0;z-index:9999;background:linear-gradient(135deg,#ffffff 0%,#f8fafc 100%);border-bottom:1px solid #e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,.08)}
    .np-shared-topbar .inner{height:48px;max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:0 16px;position:relative}
    .np-shared-topbar .brand{position:absolute;left:16px;top:50%;transform:translateY(-50%);line-height:0}
    .np-shared-topbar .brand img{height:40px;width:auto;display:block}
    .np-shared-topbar .np-shared-pdf-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border:none;border-radius:8px;background:#0284c7;color:#fff;font:600 13px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;cursor:pointer;box-shadow:0 1px 2px rgba(2,132,199,.25)}
    .np-shared-topbar .np-shared-pdf-btn:hover{background:#0369a1}
    .np-shared-topbar .links{display:flex;align-items:center;gap:10px}
    .np-shared-topbar .links a{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;color:#64748b;text-decoration:none;transition:all .2s ease}
    .np-shared-topbar .links a:hover{transform:translateY(-1px);background:#f8fafc}
    .np-shared-topbar .links a[data-social="facebook"]:hover{color:#1877f2}
    .np-shared-topbar .links a[data-social="instagram"]:hover{color:#e4405f}
    .np-shared-topbar .links a[data-social="tiktok"]:hover{color:#111827}
    .np-shared-topbar .links a[data-social="youtube"]:hover{color:#ff0000}
    .np-shared-topbar .links a[data-social="linkedin"]:hover{color:#0077b5}
    .np-shared-topbar .links svg{width:18px;height:18px}
    .np-shared-note{max-width:1200px;margin:10px auto 0;padding:10px 12px;border:1px solid #bae6fd;background:#eff6ff;color:#0c4a6e;border-radius:8px;font:600 13px/1.35 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
    /* Vista compartida móvil: ancho completo y rejillas en una columna (el reporte usa rutas relativas a dashboard.css) */
    html{-webkit-text-size-adjust:100%}
    html,body{max-width:100%!important;overflow-x:hidden;box-sizing:border-box}
    *,*::before,*::after{box-sizing:border-box}
    .report-main,.header,.project-info,.section,.footer,.footer-content{width:100%!important;max-width:100%!important;box-sizing:border-box}
    .data-grid,.report-kv{max-width:100%}
    @media screen and (max-width:720px){
      body{padding:12px 14px!important}
      .np-shared-note{max-width:none!important;margin-left:0;margin-right:0;width:100%}
      .data-grid{grid-template-columns:1fr!important;gap:10px}
      .report-kv{grid-template-columns:1fr!important}
      .report-header-meta,.footer-row{flex-direction:column!important;align-items:stretch!important;gap:10px}
      .report-header-generated-by,.report-generated-by{white-space:normal!important;text-align:left!important;margin-left:0!important}
      .report-block{overflow-x:auto}
      .report-table-wrap:not(.report-granular-materials):not(.report-pdf-compact-table):not(.report-hydro-table-wrap) .report-app-table{min-width:980px}
      .report-admin-table.report-vpd-wide-table{min-width:0;max-width:100%}
      .report-admin-table.report-vpd-saved-table{min-width:0;max-width:100%}
      .report-amend-results-wrap .results-table{min-width:520px}
    }
    /* Solo en vista compartida: evita que la marca de agua quede detrás de la banda */
    .report-watermark-corner{top:60px!important}
    @media (max-width:680px){
      .np-shared-topbar .inner{padding:0 10px}
      .np-shared-topbar .brand img{height:34px}
      .np-shared-topbar .links{gap:6px}
      .np-shared-topbar .links a{width:28px;height:28px}
      .report-watermark-corner{top:54px!important}
    }
    @media print{
      .np-shared-topbar,.np-shared-note{display:none!important}
      html,body{
        overflow:visible!important;
        height:auto!important;
        max-height:none!important;
        position:static!important;
      }
      .report-main,.section,.project-info,.header,.footer{
        overflow:visible!important;
        max-height:none!important;
      }
    }
  </style>`;
  const chromeScript = `<script>
function npSharedReportPrint(){
  var pw=window.open('about:blank','_blank');
  if(!pw){
    alert('Tu navegador bloqueó la ventana emergente. Habilita pop-ups para descargar el PDF completo.');
    return;
  }
  var parts=[];
  var wm=document.querySelector('.report-watermark-corner');
  if(wm)parts.push(wm.outerHTML);
  var main=document.querySelector('.report-main');
  if(main){
    parts.push(main.outerHTML);
  }else{
    Array.prototype.forEach.call(document.body.children,function(el){
      if(!el||!el.classList)return;
      if(el.classList.contains('np-shared-topbar')||el.classList.contains('np-shared-note'))return;
      parts.push(el.outerHTML);
    });
  }
  if(!parts.length){
    alert('No se encontró el contenido del reporte para imprimir.');
    try{pw.close();}catch(e){}
    return;
  }
  var headNodes=document.head.cloneNode(true).childNodes;
  var headHtml='';
  for(var i=0;i<headNodes.length;i++){
    var node=headNodes[i];
    if(!node||node.id==='np-shared-view-style')continue;
    if(node.outerHTML)headHtml+=node.outerHTML;
    else if(node.nodeType===3&&node.textContent.trim())headHtml+=node.textContent;
  }
  var lang=document.documentElement.getAttribute('lang')||'es';
  var html='<!DOCTYPE html><html lang="'+lang+'" class="notranslate" translate="no"><head>'+headHtml+
    '<title>NutriPlant PRO - Reporte</title></head><body class="notranslate" translate="no">'+parts.join('')+'</body></html>';
  pw.document.open();
  pw.document.write(html);
  pw.document.close();
  var fired=false;
  function doPrint(){
    if(fired)return;
    fired=true;
    try{pw.focus();pw.print();}catch(e){}
  }
  try{
    if(pw.document&&pw.document.readyState==='complete'){setTimeout(doPrint,400);return;}
    pw.addEventListener('load',function(){setTimeout(doPrint,400);});
    setTimeout(doPrint,1200);
  }catch(e){setTimeout(doPrint,500);}
}
</script>`;
  const chromeHeader = `<header class="np-shared-topbar">
    <div class="inner">
      <a class="brand" href="https://nutriplantpro.com/dashboard.html" target="_blank" rel="noopener noreferrer">
        <img src="https://nutriplantpro.com/assets/NutriPlant_PRO_blue.png" alt="NutriPlant PRO">
      </a>
      <button type="button" class="np-shared-pdf-btn" onclick="npSharedReportPrint()" title="Guardar como PDF">📥 Descargar PDF</button>
      <nav class="links" aria-label="Redes sociales NutriPlant PRO">
        <a href="https://www.facebook.com/share/16tGD4XMM9/" target="_blank" rel="noopener noreferrer" data-social="facebook" title="Facebook" aria-label="Facebook">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
        </a>
        <a href="https://www.instagram.com/nutriplantpro?utm_source=qr&igsh=MWx3dTZeamw1dD12gw==" target="_blank" rel="noopener noreferrer" data-social="instagram" title="Instagram" aria-label="Instagram">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
        </a>
        <a href="https://www.tiktok.com/@nutriplantpro?_t=Z8-8zhq7GhZnmvY&_r=1" target="_blank" rel="noopener noreferrer" data-social="tiktok" title="TikTok" aria-label="TikTok">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
        </a>
        <a href="https://youtube.com/@nutriplantpro?si=3W90eDXRAgyZxd" target="_blank" rel="noopener noreferrer" data-social="youtube" title="YouTube" aria-label="YouTube">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-1.94C18.88 4 12 4 12 4s-6.88 0-8.6.48a2.78 2.78 0 0 0-1.94 1.94A29 29 0 0 0 1 11.75a29 29 0 0 0 .48 5.33A2.78 2.78 0 0 0 3.4 19c1.72.48 8.6.48 8.6.48s6.88 0 8.6-.48a2.78 2.78 0 0 0 1.94-1.94 29 29 0 0 0 .48-5.33 29 29 0 0 0-.48-5.33z"/><polygon points="9.75,15.02 15.5,11.75 9.75,8.48"/></svg>
        </a>
        <a href="https://www.linkedin.com/company/nutriplant-pro/" target="_blank" rel="noopener noreferrer" data-social="linkedin" title="LinkedIn" aria-label="LinkedIn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
        </a>
      </nav>
    </div>
  </header>
  <div class="np-shared-note">Vista compartida de reporte NutriPlant PRO. Este enlace <strong>no caduca</strong>. Usa «Descargar PDF» o Imprimir → Guardar como PDF. Solo deja de abrir si eliminas el reporte o si la subida a la nube falló al compartir.</div>`;

  let out = String(reportHtml || '');
  const docHasBase = /<base\s/i.test(out);
  if (/<head[^>]*>/i.test(out)) {
    out = out.replace(/<head[^>]*>/i, function(m) {
      return m + (docHasBase ? '' : baseTag) + chromeCss;
    });
  } else {
    out = '<head>' + (docHasBase ? '' : baseTag) + chromeCss + '</head>' + out;
  }
  if (/<body[^>]*>/i.test(out)) out = out.replace(/<body[^>]*>/i, function(m) { return m + chromeHeader; });
  else out = '<body>' + chromeHeader + out + '</body>';
  if (/<\/body>/i.test(out)) out = out.replace(/<\/body>/i, chromeScript + '</body>');
  else out = out + chromeScript;
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

    if (!shareEnabled || !storedToken || storedToken !== token) {
      return htmlResponse(403, errorPage('Acceso denegado', 'Este link no coincide con el reporte en el servidor. Suele pasar si la subida a la nube falló al compartir o si el reporte fue eliminado. Vuelve al panel, pulsa «Compartir vista» una sola vez y espera el mensaje de éxito.'));
    }

    // Política NutriPlant: los links compartidos no caducan (shareExpiresAt se ignora).

    const html = typeof data.reportHTML === 'string' ? data.reportHTML : '';
    if (!html) {
      return htmlResponse(410, errorPage('Vista no disponible', 'Este reporte no tiene una vista lista para compartir. Genera un nuevo link.'));
    }

    const h = event.headers || {};
    const xfProto = (h['x-forwarded-proto'] || h['X-Forwarded-Proto'] || 'https').toString().split(',')[0].trim();
    const xfHost = (h['x-forwarded-host'] || h['X-Forwarded-Host'] || h.host || h.Host || 'nutriplantpro.com').toString().split(',')[0].trim();
    const baseUrl = `${xfProto}://${xfHost}/`;

    return htmlResponse(200, withSharedViewChrome(html, {
      proto: xfProto,
      host: xfHost,
      baseUrl: baseUrl
    }));
  } catch (e) {
    return htmlResponse(500, errorPage('Error inesperado', e && e.message ? e.message : 'No se pudo abrir esta vista.'));
  }
};

