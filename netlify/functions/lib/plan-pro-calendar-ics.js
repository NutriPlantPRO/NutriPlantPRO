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

function eventSummary(ent) {
  const rowTitle = String(ent.rowTitle || '').trim();
  if (ent.kind === 'table_row' && rowTitle && rowTitle !== '—') return rowTitle;
  if (ent.kind === 'note_due' && rowTitle) return rowTitle;
  const itemTitle = String(ent.itemTitle || '').trim();
  if (itemTitle && itemTitle !== '(Sin título)') return itemTitle;
  return 'Plan PRO';
}

function eventDescription(ent) {
  const lines = [];
  const rowTitle = String(ent.rowTitle || '').trim();
  if (rowTitle && rowTitle !== '—' && rowTitle !== 'Objetivo del apunte') lines.push(rowTitle);
  if (ent.kind === 'table_row') lines.push(`Tabla: ${ent.blockTitle || '—'}`);
  else if (ent.kind === 'note_due') lines.push('Semáforo en nota principal');
  else lines.push('Objetivo del apunte');
  lines.push(`Apunte: ${ent.itemTitle || '—'}`);
  lines.push(`Planta: ${ent.plantTitle || '—'}`);
  lines.push(`Rama: ${ent.catPath || '—'}`);
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
      catPath: buildCategoryPath(r.category_id, categories)
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
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H'
  ];
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  (entries || []).forEach((ent) => {
    const dk = String(ent.dateKey || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dk)) return;
    const uid = calendarEventUid(ent);
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
