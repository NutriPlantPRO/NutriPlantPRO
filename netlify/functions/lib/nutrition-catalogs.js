/**
 * Catálogos NutriPlant: fertilizantes solubles (fertirriego), granulares, cultivos y personalizados.
 * Built-in: nutrition-catalogs-builtin.json (generado desde el código fuente de la app).
 * Personalizados: profiles.custom_* y opcionalmente projects.data.*.customMaterials
 */
const builtin = require('./nutrition-catalogs-builtin.json');

const CATALOGS = {
  fertirriego_materials: {
    label: 'Fertilizantes solubles (Fertirriego)',
    module: 'fertirriego',
    builtin_type: 'array',
    builtin_key: 'fertirriego_solubles',
    profile_key: 'custom_ferti_materials',
    project_paths: [
      ['fertirriego', 'customMaterials', 'items'],
      ['sections', 'fertirriego', 'customMaterials', 'items']
    ],
    id_field: 'id',
    name_fields: ['name', 'label', 'id']
  },
  granular_materials: {
    label: 'Materias primas / fertilizantes granulares',
    module: 'granular',
    builtin_type: 'object',
    builtin_key: 'granular_materials',
    profile_key: 'custom_granular_materials',
    project_paths: [
      ['programa_granular', 'customMaterials', 'items'],
      ['granular', 'customMaterials', 'items'],
      ['sections', 'programa_granular', 'customMaterials', 'items']
    ],
    id_field: 'name',
    name_fields: ['name']
  },
  fertirriego_crops: {
    label: 'Cultivos (extracción kg/ton) — Fertirriego',
    module: 'fertirriego',
    builtin_type: 'object',
    builtin_key: 'fertirriego_crops',
    profile_key: 'custom_ferti_crops',
    project_paths: [],
    id_field: 'id',
    name_fields: ['name', 'id']
  },
  granular_crops: {
    label: 'Cultivos (extracción kg/ton) — Granular',
    module: 'granular',
    builtin_type: 'object',
    builtin_key: 'granular_crops',
    profile_key: 'custom_granular_crops',
    project_paths: [],
    id_field: 'id',
    name_fields: ['name', 'id']
  }
};

const GPT_RULES = [
  'Catálogos precargados NutriPlant + personalizados por usuario (profiles Supabase) y opcionalmente por proyecto.',
  'Fertirriego solubles: composición en % masa (N_NO3, N_NH4, P2O5, K2O, CaO, MgO, SO4, micros). Algunos en L con density.',
  'Granular: composición en % masa por nombre de producto (N, P2O5, K2O, CaO, MgO, SO4, micros).',
  'Cultivos: extracción kg nutriente / tonelada de producto (óxido salvo modo elemental del usuario).',
  'Personalizados del usuario: custom_ferti_materials.items, custom_granular_materials, custom_ferti_crops, custom_granular_crops en profiles.',
  'Para un suscriptor concreto pasa email o user_id. Para mezclar catálogo de un proyecto: project_id o project_name.',
  'No inventar composiciones: si no está en catálogo, dilo y sugiere nutrition_catalogs con q= búsqueda.'
];

function normStr(v) {
  return String(v == null ? '' : v)
    .trim()
    .toLowerCase();
}

function getPath(obj, parts) {
  let cur = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== 'object') return null;
    cur = cur[p];
  }
  return cur;
}

function summarizeMaterial(item, cfg) {
  if (!item || typeof item !== 'object') return null;
  const id = item.id || item.name || item.label || null;
  const name = item.name || item.label || item.id || id;
  const comp = {};
  Object.keys(item).forEach((k) => {
    if (['id', 'name', 'label', 'source', 'unit', 'density', 'notes'].includes(k)) return;
    const n = parseFloat(item[k]);
    if (!Number.isNaN(n) && n !== 0) comp[k] = n;
  });
  return {
    id: id || name,
    name,
    source: item.source || 'builtin',
    unit: item.unit || 'kg',
    density: item.density != null ? item.density : undefined,
    composition_pct: comp
  };
}

function summarizeCrop(cropId, entry, source) {
  const extraction = (entry && entry.extraction) || entry || {};
  const name = (entry && entry.name) || cropId;
  return {
    id: cropId,
    name,
    source: source || 'builtin',
    extraction_kg_per_ton: extraction
  };
}

function normalizeProfileMaterials(raw, source) {
  const out = [];
  if (!raw) return out;
  if (Array.isArray(raw)) {
    raw.forEach((m) => {
      const s = summarizeMaterial(m, null);
      if (s) {
        s.source = source;
        out.push(s);
      }
    });
    return out;
  }
  if (typeof raw === 'object' && Array.isArray(raw.items)) {
    raw.items.forEach((m) => {
      const s = summarizeMaterial(m, null);
      if (s) {
        s.source = source;
        out.push(s);
      }
    });
    return out;
  }
  if (typeof raw === 'object') {
    Object.keys(raw).forEach((name) => {
      const val = raw[name];
      if (val && typeof val === 'object') {
        out.push(
          summarizeMaterial({ name, ...val, source }, null) || {
            id: name,
            name,
            source,
            composition_pct: val
          }
        );
      }
    });
  }
  return out;
}

function normalizeProfileCrops(raw, source) {
  const out = [];
  if (!raw || typeof raw !== 'object') return out;
  Object.keys(raw).forEach((cropId) => {
    out.push(summarizeCrop(cropId, raw[cropId], source));
  });
  return out;
}

function getBuiltinMaterials(cfg) {
  const raw = builtin[cfg.builtin_key];
  if (cfg.builtin_type === 'array') {
    return (raw || []).map((m) => summarizeMaterial({ ...m, source: 'builtin' }, cfg));
  }
  return Object.keys(raw || {}).map((name) =>
    summarizeMaterial({ name, ...(raw[name] || {}), source: 'builtin' }, cfg)
  );
}

function getBuiltinCrops(cfg) {
  const raw = builtin[cfg.builtin_key] || {};
  return Object.keys(raw).map((id) => summarizeCrop(id, { name: id, extraction: raw[id] }, 'builtin'));
}

function mergeById(items) {
  const map = new Map();
  items.forEach((it) => {
    if (!it) return;
    const key = normStr(it.id || it.name);
    if (!key) return;
    map.set(key, it);
  });
  return Array.from(map.values());
}

function matchesQuery(item, q, cfg) {
  if (!q) return true;
  const parts = [item.id, item.name];
  if (item.composition_pct) parts.push(JSON.stringify(item.composition_pct));
  if (item.extraction_kg_per_ton) parts.push(JSON.stringify(item.extraction_kg_per_ton));
  return parts.some((p) => normStr(p).includes(q));
}

function pickCatalogKeys(catalogParam) {
  const c = normStr(catalogParam || 'all');
  if (c === 'all') return Object.keys(CATALOGS);
  if (CATALOGS[c]) return [c];
  return null;
}

async function resolveProfile(supabase, params) {
  const userId = (params.user_id || '').trim();
  const email = normStr(params.email || params.user_email);
  if (!userId && !email) return null;
  let q = supabase
    .from('profiles')
    .select(
      'id, email, name, custom_ferti_materials, custom_granular_materials, custom_ferti_crops, custom_granular_crops'
    );
  if (userId) q = q.eq('id', userId);
  else q = q.ilike('email', email);
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error('profiles: ' + error.message);
  return data;
}

async function resolveProject(supabase, params) {
  const projectId = (params.project_id || '').trim();
  const projectName = (params.project_name || params.q_project || '').trim();
  if (!projectId && !projectName) return null;
  let q = supabase.from('projects').select('id, user_id, name, title, data');
  if (projectId) q = q.eq('id', projectId);
  else q = q.or(`name.ilike.%${projectName}%,title.ilike.%${projectName}%`).limit(5);
  const { data, error } = await q;
  if (error) throw new Error('projects: ' + error.message);
  if (!data || !data.length) return null;
  if (!projectId && data.length > 1) {
    return {
      multiple: true,
      matches: data.map((p) => ({ id: p.id, name: p.name || p.title, user_id: p.user_id }))
    };
  }
  return data[0];
}

function projectCustomMaterials(projectData, cfg) {
  const out = [];
  if (!projectData || typeof projectData !== 'object') return out;
  (cfg.project_paths || []).forEach((pathParts) => {
    const raw = getPath(projectData, pathParts);
    if (Array.isArray(raw)) {
      raw.forEach((m) => {
        const s = summarizeMaterial(m, cfg);
        if (s) {
          s.source = 'project';
          out.push(s);
        }
      });
    }
  });
  return out;
}

function buildCatalogSection(catalogKey, cfg, scope, profile, project, params) {
  const q = normStr(params.q || params.search);
  const limit = Math.min(Math.max(parseInt(params.limit, 10) || 150, 1), 400);
  const materialId = normStr(params.material_id || params.name || params.id);
  const cropId = normStr(params.crop_id || params.id);
  const isCrop = cfg.builtin_key.includes('crops');

  let items = [];
  if (scope === 'builtin' || scope === 'all') {
    items = items.concat(isCrop ? getBuiltinCrops(cfg) : getBuiltinMaterials(cfg));
  }
  if ((scope === 'user' || scope === 'all') && profile) {
    const raw = profile[cfg.profile_key];
    if (isCrop) items = items.concat(normalizeProfileCrops(raw, 'user'));
    else items = items.concat(normalizeProfileMaterials(raw, 'user'));
  }
  if ((scope === 'user' || scope === 'all' || scope === 'project') && project && project.data) {
    if (!isCrop) items = items.concat(projectCustomMaterials(project.data, cfg));
  }

  items = mergeById(items);

  if (isCrop && cropId) {
    items = items.filter((it) => normStr(it.id) === cropId || normStr(it.name) === cropId);
  } else if (!isCrop && materialId && (params.material_id || params.name)) {
    items = items.filter(
      (it) => normStr(it.id) === materialId || normStr(it.name) === materialId
    );
  } else if (q) {
    items = items.filter((it) => matchesQuery(it, q, cfg));
  }

  items = items.slice(0, limit);

  return {
    catalog: catalogKey,
    label: cfg.label,
    module: cfg.module,
    scope,
    count: items.length,
    items
  };
}

async function handleNutritionCatalogs(supabase, params) {
  params = params || {};
  const catalogKeys = pickCatalogKeys(params.catalog);
  if (!catalogKeys) {
    return {
      ok: false,
      error: 'catalog_invalid',
      message: 'catalog debe ser: fertirriego_materials, granular_materials, fertirriego_crops, granular_crops o all',
      available: Object.keys(CATALOGS)
    };
  }

  const scope = normStr(params.scope || 'all') || 'all';
  if (!['builtin', 'user', 'all', 'project'].includes(scope)) {
    return { ok: false, error: 'scope_invalid', message: 'scope: builtin | user | all | project' };
  }

  let profile = null;
  let project = null;
  if (scope !== 'builtin') {
    try {
      profile = await resolveProfile(supabase, params);
      project = await resolveProject(supabase, params);
    } catch (e) {
      return { ok: false, error: 'lookup_failed', message: e.message };
    }
  }

  if (project && project.multiple) {
    return {
      ok: false,
      error: 'multiple_projects',
      message: 'Varios proyectos coinciden; usa project_id.',
      matches: project.matches
    };
  }

  if ((scope === 'user' || scope === 'project') && !profile && !project) {
    return {
      ok: false,
      error: 'user_or_project_required',
      message: 'Para scope user/project indica email, user_id y/o project_id/project_name.'
    };
  }

  const sections = catalogKeys.map((key) =>
    buildCatalogSection(key, CATALOGS[key], scope, profile, project, params)
  );

  if (catalogKeys.length === 1) {
    const one = sections[0];
    return {
      ok: true,
      domain: 'nutrition_catalogs',
      version: builtin.version,
      gptRules: GPT_RULES,
      user: profile
        ? { id: profile.id, email: profile.email, name: profile.name }
        : project
          ? { id: project.user_id, note: 'Perfil no resuelto; solo catálogo de proyecto si aplica.' }
          : null,
      project: project ? { id: project.id, name: project.name || project.title } : null,
      ...one,
      catalog: catalogKeys[0]
    };
  }

  return {
    ok: true,
    domain: 'nutrition_catalogs',
    version: builtin.version,
    gptRules: GPT_RULES,
    user: profile ? { id: profile.id, email: profile.email, name: profile.name } : null,
    project: project ? { id: project.id, name: project.name || project.title } : null,
    catalogs: sections.reduce((acc, s) => {
      acc[s.catalog] = { label: s.label, count: s.count, items: s.items };
      return acc;
    }, {}),
    summary: sections.map((s) => ({ catalog: s.catalog, label: s.label, count: s.count }))
  };
}

module.exports = {
  handleNutritionCatalogs,
  CATALOGS,
  GPT_RULES,
  builtin
};
