/**
 * Genera entradas e ICS de Plan PRO (servidor) — misma lógica UID que la descarga en app.
 */

const ORGANIZER_EMAIL = 'admin@nutriplantpro.com';

function escapeIcs(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n/g, '\\n')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateNote(s, max) {
  if (s == null || !String(s).trim()) return '';
  const t = String(s).replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return t.slice(0, max) + '…';
}

function notePreviewText(r, maxLen) {
  const max = maxLen != null ? maxLen : 140;
  const plainRaw = (r.body_plain || '').trim();
  const plain = plainRaw || stripHtml(r.body_html || '');
  const lineParts = plain
    .split(/\r?\n/)
    .map((ln) => ln.trim())
    .filter(Boolean);
  const chunks = [lineParts.length > 1 ? lineParts.join(' · ') : plain];
  (r.body_blocks || []).forEach((blk) => {
    if (blk && blk.type === 'note_section' && blk.html) chunks.push(stripHtml(blk.html));
  });
  const merged = chunks.filter(Boolean).join(' · ');
  return truncateNote(merged, max);
}

function noteFullText(r) {
  const chunks = [];
  const plainRaw = (r && r.body_plain ? r.body_plain : '').trim();
  const plain = plainRaw || stripHtml((r && r.body_html) || '');
  if (plain) chunks.push(plain);
  if (r && r.body_blocks && Array.isArray(r.body_blocks)) {
    r.body_blocks.forEach((blk) => {
      if (blk && blk.type === 'note_section' && blk.html) chunks.push(stripHtml(blk.html));
    });
  }
  return chunks.filter(Boolean).join(' ');
}

function firstUrlFromText(s) {
  const text = String(s || '');
  let m = text.match(/https?:\/\/[^\s<>"')\]]+/i);
  if (!m) {
    m = text.match(
      /\b(?:www\.)?(?:google\.com\/maps|maps\.google\.com|maps\.app\.goo\.gl|goo\.gl\/maps|waze\.com\/ul)[^\s<>"')\]]*/i
    );
  }
  if (!m) return '';
  let url = m[0].replace(/[.,;:]+$/g, '');
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  return url;
}

function normalizePlanProMapsUrl(raw) {
  let s = String(raw || '').trim();
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  try {
    const u = new URL(s);
    if (!/^https?:$/i.test(u.protocol)) return '';
    return u.href;
  } catch {
    return '';
  }
}

function getMapsUrlFromItem(item) {
  const atts = item && Array.isArray(item.attachments) ? item.attachments : [];
  for (let i = atts.length - 1; i >= 0; i--) {
    const a = atts[i];
    if (a && a.type === 'maps_location' && a.url) return normalizePlanProMapsUrl(a.url);
  }
  return '';
}

function planProCoordsFromMapsHref(href) {
  const s = String(href || '').trim();
  if (!s) return null;
  const plain = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/.exec(s);
  if (plain) return { lat: parseFloat(plain[1]), lng: parseFloat(plain[2]) };
  const at = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(s);
  if (at) return { lat: parseFloat(at[1]), lng: parseFloat(at[2]) };
  const d34 = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i.exec(s);
  if (d34) return { lat: parseFloat(d34[1]), lng: parseFloat(d34[2]) };
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s);
    const q = u.searchParams.get('q') || u.searchParams.get('ll') || u.searchParams.get('center') || '';
    const qp = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/.exec(q);
    if (qp) return { lat: parseFloat(qp[1]), lng: parseFloat(qp[2]) };
    const pathAt = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(u.pathname + u.search + u.hash);
    if (pathAt) return { lat: parseFloat(pathAt[1]), lng: parseFloat(pathAt[2]) };
    const hashD = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i.exec(u.hash || '');
    if (hashD) return { lat: parseFloat(hashD[1]), lng: parseFloat(hashD[2]) };
  } catch {
    /* ignore */
  }
  return null;
}

function planProCoordsFromMapsText(raw) {
  return planProCoordsFromMapsHref(String(raw || '').trim());
}

function calLevelPlainLabel(lv) {
  if (lv === 'alta') return 'Alta';
  if (lv === 'media') return 'Media';
  if (lv === 'baja') return 'Baja';
  return 'Sin prioridad';
}

function apunteLifePlainLabel(closedAt) {
  return closedAt ? 'Cerrado' : 'Activo';
}

function formatDueTimeLabel(raw) {
  const t = normalizeDueTime(raw);
  if (!t) return '';
  try {
    const p = t.split(':').map(Number);
    return new Date(2000, 0, 1, p[0], p[1]).toLocaleTimeString('es-MX', {
      hour: 'numeric',
      minute: '2-digit'
    });
  } catch {
    return t;
  }
}

function icsUrlValue(url) {
  return String(url || '').replace(/\s+/g, '').replace(/\r?\n/g, '');
}

function icsMapsUrlValue(url) {
  return icsUrlValue(url).replace(/,/g, '%2C');
}

function icsMapsCoords(url) {
  const c = planProCoordsFromMapsText(url);
  if (!c || !isFinite(c.lat) || !isFinite(c.lng)) return null;
  return {
    lat: Number(c.lat).toFixed(6),
    lng: Number(c.lng).toFixed(6)
  };
}

function normalizeDueTime(raw) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(raw || '').trim());
  return m ? `${m[1]}:${m[2]}` : '';
}

function toDateInputValue(s) {
  if (s == null || String(s).trim() === '') return '';
  const str = String(s).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/.exec(str);
  if (m) {
    let y = parseInt(m[3], 10);
    if (y < 100) y += 2000;
    const mo = parseInt(m[2], 10);
    const d = parseInt(m[1], 10);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      return `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  return '';
}

function parseDueDateKey(raw) {
  if (raw == null || raw === '') return '';
  const s = String(raw).trim();
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  if (iso) return iso[1];
  return toDateInputValue(s);
}

function priorityLevelFromRaw(raw) {
  const v = String(raw || '').trim().toLowerCase();
  if (!v) return '';
  if (/alta|high|urgente|critical|p1/.test(v)) return 'alta';
  if (/media|med|normal|p2/.test(v)) return 'media';
  if (/baja|low|p3/.test(v)) return 'baja';
  return '';
}

function columnLooksLikeDate(headerName, colIndex, ncol, variant) {
  if (variant === 'tasks' && ncol >= 2 && colIndex === ncol - 1) return true;
  if (variant !== 'tasks' && variant !== 'smart') return false;
  const h = String(headerName || '').toLowerCase();
  return /fecha|objetivo|due|plazo|deadline|date/.test(h);
}

function columnLooksLikePriorityHeader(h) {
  const s = String(h || '').toLowerCase();
  return /prioridad|priority|sem[aá]foro|urgencia|nivel/.test(s);
}

function resolveDateColIndex(b, ncol) {
  for (let c = 0; c < ncol; c++) {
    const hl = (b.headers && b.headers[c]) || '';
    if (columnLooksLikeDate(hl, c, ncol, b.variant)) return c;
  }
  if (b.variant === 'smart' && ncol >= 5) return 4;
  if (b.variant === 'tasks' && ncol >= 1) return ncol - 1;
  return -1;
}

function resolvePriorityColIndex(b, ncol) {
  for (let i = 0; i < ncol; i++) {
    if (columnLooksLikePriorityHeader((b.headers && b.headers[i]) || '')) return i;
  }
  if (b.variant === 'smart' && ncol >= 3) return 2;
  if (b.variant === 'tasks' && ncol >= 3) return 2;
  return -1;
}

function miniSheetColCountForAggr(b) {
  if (!b || b.type !== 'mini_sheet') return 1;
  let ncol = (b.headers || []).length;
  (b.rows || []).forEach((row) => {
    const L = Array.isArray(row) ? row.length : row && row.cells ? row.cells.length : 0;
    if (L > ncol) ncol = L;
  });
  const minCols = b.variant === 'smart' ? 6 : b.variant === 'tasks' ? 5 : 1;
  return Math.max(ncol, minCols);
}

function padRowCells(row, ncol) {
  const cells = Array.isArray(row) ? row.slice() : row && row.cells ? row.cells.slice() : [];
  while (cells.length < ncol) cells.push('');
  return cells;
}

function miniSheetRowTitleForDetail(b, cells) {
  if (b.variant === 'smart') return cells[1] != null ? String(cells[1]).trim() : '';
  return cells[0] != null ? String(cells[0]).trim() : '';
}

function getItemDueTime(item) {
  const atts = item && Array.isArray(item.attachments) ? item.attachments : [];
  for (let i = atts.length - 1; i >= 0; i--) {
    const a = atts[i];
    if (a && a.type === 'item_due_schedule') return normalizeDueTime(a.time);
  }
  return '';
}

function getItemDueEndTime(item) {
  const atts = item && Array.isArray(item.attachments) ? item.attachments : [];
  for (let i = atts.length - 1; i >= 0; i--) {
    const a = atts[i];
    if (a && a.type === 'item_due_schedule') return normalizeDueTime(a.end_time);
  }
  return '';
}

function attrFromTag(tag, name) {
  const m = new RegExp(`${name}="([^"]*)"`, 'i').exec(tag);
  return m ? m[1] : '';
}

function collectRichDueEntriesFromHtml(html, meta) {
  const out = [];
  if (!html || !meta || !meta.id) return out;
  const re = /<span[^>]*\bnp-rich-due\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const tag = m[0];
    const dk = attrFromTag(tag, 'data-np-due-date');
    if (!dk || !/^\d{4}-\d{2}-\d{2}$/.test(dk)) continue;
    out.push({
      dateKey: dk,
      time: normalizeDueTime(attrFromTag(tag, 'data-np-due-time')),
      endTime: normalizeDueTime(attrFromTag(tag, 'data-np-due-end-time')),
      level: priorityLevelFromRaw(attrFromTag(tag, 'data-np-due-level')),
      kind: 'note_due',
      itemId: meta.id,
      itemTitle: meta.title,
      areaId: meta.areaId,
      plantTitle: meta.plantTitle,
      catPath: meta.catPath,
      notePreview: meta.notePreview || '',
      noteLink: meta.noteLink || '',
      mapsUrl: meta.mapsUrl || '',
      closedAt: meta.closedAt || null,
      rowTitle: 'Semáforo en nota · ' + (attrFromTag(tag, 'data-np-due-label') || dk),
      blockTitle: '—',
      dueId: attrFromTag(tag, 'data-np-due-id')
    });
  }
  return out;
}

function calendarEventUid(ent) {
  const item = String(ent.itemId || 'x').replace(/[^a-zA-Z0-9_-]/g, '');
  if (ent.kind === 'item_due') return `planpro-${item}-item-due@nutriplantpro.com`;
  if (ent.kind === 'note_due' && ent.dueId) {
    return `planpro-${item}-note-${String(ent.dueId).replace(/[^a-zA-Z0-9_-]/g, '')}@nutriplantpro.com`;
  }
  if (ent.kind === 'table_row' && ent.blockIndex != null && ent.rowIndex != null) {
    return `planpro-${item}-b${ent.blockIndex}-r${ent.rowIndex}@nutriplantpro.com`;
  }
  const dk = String(ent.dateKey || '0000-00-00');
  const slug = String(ent.rowTitle || ent.itemTitle || 'e')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return `planpro-${item}-${dk}-${ent.kind || 'e'}-${slug || 'evt'}@nutriplantpro.com`;
}

function eventKindLine(ent) {
  if (ent.kind === 'table_row') return `Tabla: ${ent.blockTitle || '—'}`;
  if (ent.kind === 'note_due') return 'Semáforo en nota principal';
  return 'Objetivo del apunte';
}

function eventSummary(ent) {
  const itemTitle = String(ent.itemTitle || '').trim();
  const plant = String(ent.plantTitle || '').trim();
  let title = itemTitle && itemTitle !== '(Sin título)' ? itemTitle : 'Plan PRO';
  if (ent.kind === 'table_row') {
    const rowTitle = String(ent.rowTitle || '').trim();
    if (rowTitle && rowTitle !== '—') title = rowTitle;
  }
  if (plant && plant !== 'Planta' && plant !== '—') title = `${title} · ${plant}`;
  return title;
}

function eventDescription(ent) {
  const kindLine = eventKindLine(ent);
  const lines = [];
  const rowTitle = String(ent.rowTitle || '').trim();
  if (rowTitle && rowTitle !== '—' && rowTitle !== kindLine && rowTitle !== 'Objetivo del apunte') {
    lines.push(rowTitle);
  }
  lines.push(`🏷️ Tipo: ${kindLine}`);
  lines.push(`📋 Tema: ${apunteLifePlainLabel(ent.closedAt)}`);
  lines.push(`🚦 Semáforo: ${calLevelPlainLabel(ent.level)}`);
  lines.push(
    `🕒 Hora: ${
      ent.time
        ? formatDueTimeLabel(ent.time) + (ent.endTime ? ` - ${formatDueTimeLabel(ent.endTime)}` : '')
        : 'Todo el día'
    }`
  );
  lines.push(`🌱 Planta: ${ent.plantTitle || '—'}`);
  lines.push(`🌿 Rama: ${ent.catPath || '—'}`);
  lines.push(`📝 Apunte: ${ent.itemTitle || '—'}`);
  if (ent.notePreview) lines.push(`📌 Nota: ${ent.notePreview}`);
  if (ent.noteLink) lines.push(`🔗 Link: ${ent.noteLink}`);
  if (ent.mapsUrl) lines.push(`📍 Ubicación Maps: ${icsMapsUrlValue(ent.mapsUrl)}`);
  return lines.join('\n');
}

function addDaysToDateKey(dateKey, days) {
  const p = String(dateKey).split('-').map(Number);
  if (p.length !== 3) return dateKey;
  const dt = new Date(p[0], p[1] - 1, p[2]);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function icsDateTimeLocal(dateKey, timeRaw) {
  const tm = normalizeDueTime(timeRaw);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || '')) || !tm) return '';
  return String(dateKey).replace(/-/g, '') + 'T' + tm.replace(':', '') + '00';
}

function icsAddMinutesLocal(dateKey, timeRaw, minutes) {
  const tm = normalizeDueTime(timeRaw);
  if (!tm) return '';
  const p = String(dateKey || '').split('-').map(Number);
  const t = tm.split(':').map(Number);
  if (p.length !== 3 || t.length !== 2) return '';
  const d = new Date(p[0], p[1] - 1, p[2], t[0], t[1]);
  d.setMinutes(d.getMinutes() + (minutes || 60));
  return (
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}` +
    'T' +
    String(d.getHours()).padStart(2, '0') +
    String(d.getMinutes()).padStart(2, '0') +
    '00'
  );
}

function buildCategoryPath(categoryId, categories) {
  if (!categoryId) return '—';
  const parts = [];
  let cur = categories.find((c) => c.id === categoryId);
  let guard = 0;
  while (cur && guard++ < 40) {
    parts.unshift(cur.title || '');
    cur = cur.parent_id ? categories.find((c) => c.id === cur.parent_id) : null;
  }
  return parts.length ? parts.join(' › ') : '—';
}

function collectCalendarEntriesFromItems(items, areas, categories) {
  const areaTitle = {};
  (areas || []).forEach((a) => {
    if (a && a.id) areaTitle[a.id] = a.title || 'Planta';
  });
  const out = [];
  (items || []).forEach((r) => {
    if (!r || !r.id) return;
    const meta = {
      id: r.id,
      title: r.title || '(Sin título)',
      areaId: r.area_id || '',
      plantTitle: areaTitle[r.area_id] || 'Planta',
      catPath: buildCategoryPath(r.category_id, categories),
      notePreview: notePreviewText(r, 250),
      noteLink: firstUrlFromText(noteFullText(r)),
      mapsUrl: getMapsUrlFromItem(r),
      closedAt: r.closed_at || null
    };
    const dkItem = parseDueDateKey(r.due_at);
    if (dkItem) {
      out.push({
        dateKey: dkItem,
        time: getItemDueTime(r),
        endTime: getItemDueEndTime(r),
        level: priorityLevelFromRaw(r.priority != null ? String(r.priority) : ''),
        kind: 'item_due',
        itemId: r.id,
        itemTitle: meta.title,
        areaId: meta.areaId,
        plantTitle: meta.plantTitle,
        catPath: meta.catPath,
        notePreview: meta.notePreview,
        noteLink: meta.noteLink,
        mapsUrl: meta.mapsUrl,
        closedAt: meta.closedAt,
        rowTitle: 'Objetivo del apunte',
        blockTitle: '—'
      });
    }
    (r.body_blocks || []).forEach((b, blockIndex) => {
      if (!b || b.type !== 'mini_sheet') return;
      if (b.variant !== 'tasks' && b.variant !== 'smart') return;
      const ncol = miniSheetColCountForAggr(b);
      const dateCol = resolveDateColIndex(b, ncol);
      const prioCol = resolvePriorityColIndex(b, ncol);
      if (dateCol < 0) return;
      (b.rows || []).forEach((row, ri) => {
        const rk = b.rowKinds && b.rowKinds[ri];
        if (b.variant === 'smart' && rk === 'section') return;
        if (b.rowDone && b.rowDone[ri]) return;
        const cells = padRowCells(row, ncol);
        const dk = toDateInputValue(cells[dateCol] != null ? String(cells[dateCol]) : '');
        if (!dk) return;
        out.push({
          dateKey: dk,
          level: prioCol >= 0 ? priorityLevelFromRaw(cells[prioCol] != null ? String(cells[prioCol]) : '') : '',
          kind: 'table_row',
          itemId: r.id,
          itemTitle: meta.title,
          areaId: meta.areaId,
          plantTitle: meta.plantTitle,
          catPath: meta.catPath,
          notePreview: meta.notePreview,
          noteLink: meta.noteLink,
          mapsUrl: meta.mapsUrl,
          closedAt: meta.closedAt,
          rowTitle: miniSheetRowTitleForDetail(b, cells) || '—',
          blockTitle: b.title || (b.variant === 'tasks' ? 'Lista / tareas' : 'Seguimiento'),
          blockIndex,
          rowIndex: ri
        });
      });
    });
    if (r.body_html && String(r.body_html).trim()) {
      collectRichDueEntriesFromHtml(r.body_html, meta).forEach((e) => out.push(e));
    }
    (r.body_blocks || []).forEach((b) => {
      if (b && b.type === 'note_section' && b.html && String(b.html).trim()) {
        collectRichDueEntriesFromHtml(b.html, meta).forEach((e) => out.push(e));
      }
    });
  });
  return out;
}

function buildPlanProIcsFromEntries(entries, organizerEmail) {
  const org = String(organizerEmail || ORGANIZER_EMAIL).trim().toLowerCase();
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NutriPlant PRO//Plan PRO//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Plan PRO',
    'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
    'X-PUBLISHED-TTL:PT15M'
  ];
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  (entries || []).forEach((ent) => {
    const dk = String(ent.dateKey || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dk)) return;
    const uid = calendarEventUid(ent);
    const mapsUrl = normalizePlanProMapsUrl(ent.mapsUrl || '');
    const mapsUrlIcs = mapsUrl ? icsMapsUrlValue(mapsUrl) : '';
    const mapsCoords = mapsUrl ? icsMapsCoords(mapsUrl) : null;
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push('LAST-MODIFIED:' + stamp);
    lines.push('SEQUENCE:1');
    if (ent.time) {
      lines.push('DTSTART:' + icsDateTimeLocal(dk, ent.time));
      lines.push(
        'DTEND:' + (ent.endTime ? icsDateTimeLocal(dk, ent.endTime) : icsAddMinutesLocal(dk, ent.time, 60))
      );
    } else {
      lines.push(`DTSTART;VALUE=DATE:${dk.replace(/-/g, '')}`);
      lines.push(`DTEND;VALUE=DATE:${addDaysToDateKey(dk, 1).replace(/-/g, '')}`);
    }
    lines.push(`SUMMARY:${escapeIcs(eventSummary(ent))}`);
    lines.push(`DESCRIPTION:${escapeIcs(eventDescription(ent))}`);
    if (mapsUrlIcs) {
      lines.push(
        `LOCATION:${escapeIcs(mapsCoords ? `${mapsCoords.lat},${mapsCoords.lng}` : mapsUrlIcs)}`
      );
      if (mapsCoords) lines.push(`GEO:${mapsCoords.lat};${mapsCoords.lng}`);
      lines.push(
        `X-APPLE-STRUCTURED-LOCATION;VALUE=URI;X-TITLE=${escapeIcs('Ubicación Plan PRO')}:${mapsUrlIcs}`
      );
    }
    if (ent.noteLink) lines.push(`URL:${icsUrlValue(ent.noteLink)}`);
    else if (mapsUrlIcs) lines.push(`URL:${mapsUrlIcs}`);
    lines.push(`ORGANIZER;CN=Plan PRO:mailto:${org}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('TRANSP:TRANSPARENT');
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

module.exports = {
  ORGANIZER_EMAIL,
  collectCalendarEntriesFromItems,
  buildPlanProIcsFromEntries,
  eventSummary
};
