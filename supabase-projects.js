/**
 * NutriPlant PRO - Sincronización de proyectos con Supabase
 * Guarda y carga proyectos desde la nube para usuarios registrados en Supabase
 */
(function() {
  'use strict';

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  function isSupabaseUser() {
    const userId = localStorage.getItem('nutriplant_user_id');
    return userId && UUID_REGEX.test(userId);
  }

  function getClient() {
    return (typeof window.getSupabaseClient === 'function' && window.getSupabaseClient()) || null;
  }

  function normalizeDate(value) {
    if (!value) return 0;
    const ts = new Date(value).getTime();
    return Number.isFinite(ts) ? ts : 0;
  }

  function collectUserIdentity() {
    const currentUserId = localStorage.getItem('nutriplant_user_id');
    const identityUserIds = new Set();
    const identityEmails = new Set();
    const identityProjectIds = new Set();
    if (currentUserId) identityUserIds.add(currentUserId);

    try {
      const rawSession = localStorage.getItem('np_user');
      if (rawSession) {
        const session = JSON.parse(rawSession);
        if (session && session.email) identityEmails.add(String(session.email).toLowerCase());
      }
    } catch (e) {
      console.warn('⚠️ collectUserIdentity(np_user):', e);
    }

    try {
      if (currentUserId) {
        const rawProfile = localStorage.getItem('nutriplant_user_' + currentUserId);
        if (rawProfile) {
          const profile = JSON.parse(rawProfile);
          if (profile && profile.email) identityEmails.add(String(profile.email).toLowerCase());
          if (profile && Array.isArray(profile.projects)) profile.projects.forEach(pid => identityProjectIds.add(pid));
        }
      }
    } catch (e) {
      console.warn('⚠️ collectUserIdentity(profile):', e);
    }

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('nutriplant_user_') || key.includes('_email_') || key.includes('_project_')) continue;
      try {
        const raw = localStorage.getItem(key);
        if (!raw || !raw.startsWith('{')) continue;
        const user = JSON.parse(raw);
        if (!user || typeof user !== 'object') continue;

        const uid = key.replace('nutriplant_user_', '');
        const emailLc = (user.email || '').toLowerCase();
        const sameIdentity = identityUserIds.has(uid) || (emailLc && identityEmails.has(emailLc));
        if (!sameIdentity) continue;

        identityUserIds.add(uid);
        if (emailLc) identityEmails.add(emailLc);
        if (Array.isArray(user.projects)) user.projects.forEach(pid => identityProjectIds.add(pid));
      } catch (e) {
        continue;
      }
    }

    return { identityUserIds, identityEmails, identityProjectIds };
  }

  function collectLocalProjectsForIdentity() {
    const { identityUserIds, identityEmails, identityProjectIds } = collectUserIdentity();
    const byId = new Map();

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const isProjectKey = key && (key.startsWith('nutriplant_project_') || key.startsWith('nutriplant-project-'));
      if (!isProjectKey) continue;
      try {
        const raw = localStorage.getItem(key);
        if (!raw || (!raw.startsWith('{') && !raw.startsWith('['))) continue;
        const data = JSON.parse(raw);
        if (!data || typeof data !== 'object') continue;

        const projectId = data.id || key.replace(/^nutriplant[-_]project[-_]/, '');
        if (!projectId) continue;

        const projectUserId = data.user_id || data.userId;
        const projectEmail = (data.user_email || data.userEmail || '').toLowerCase();
        const belongs = identityUserIds.has(projectUserId) || (projectEmail && identityEmails.has(projectEmail)) || identityProjectIds.has(projectId);
        if (!belongs) continue;

        const currentTs = normalizeDate(data.updated_at || data.updatedAt || data.created_at || data.createdAt);
        const existing = byId.get(projectId);
        const existingTs = existing ? normalizeDate(existing.data.updated_at || existing.data.updatedAt || existing.data.created_at || existing.data.createdAt) : 0;
        if (!existing || currentTs >= existingTs) {
          byId.set(projectId, { projectId, data, localUpdatedTs: currentTs });
        }
      } catch (e) {
        continue;
      }
    }

    return Array.from(byId.values());
  }

  window.nutriplantSupabaseProjects = {
    isSupabaseUser: isSupabaseUser,

    /** Sincronizar proyecto a Supabase (upsert) */
    syncProject: async function(projectId, projectData) {
      if (!isSupabaseUser()) return;
      const client = getClient();
      if (!client) return;

      const userId = localStorage.getItem('nutriplant_user_id');
      if (!userId) return;

      try {
        const row = {
          id: projectId,
          user_id: userId,
          name: projectData.name || projectData.title || 'Sin nombre',
          title: projectData.title || projectData.name || '',
          data: projectData,
          updated_at: new Date().toISOString()
        };

        const { error } = await client.from('projects').upsert(row, {
          onConflict: 'id',
          ignoreDuplicates: false
        });

        if (error) {
          console.warn('⚠️ Supabase sync error:', error.message);
        } else {
          console.log('☁️ Proyecto sincronizado a la nube:', projectId);
        }
      } catch (e) {
        console.warn('⚠️ Supabase sync:', e);
      }
    },

    /** Obtener lista de proyectos desde Supabase */
    fetchProjects: async function() {
      if (!isSupabaseUser()) return [];
      const client = getClient();
      if (!client) return [];

      try {
        const { data, error } = await client.from('projects').select('id, user_id, name, title, data, updated_at').order('updated_at', { ascending: false });
        if (error) {
          console.warn('⚠️ Supabase fetch projects:', error.message);
          return [];
        }
        return (data || []).map(p => ({
          id: p.id,
          user_id: p.user_id,
          name: p.name || p.title || 'Sin nombre',
          updated_at: p.updated_at,
          data: p.data,
          hasLocation: !!(p.data && p.data.location && p.data.location.polygon),
          hasSoilAnalysis: !!(p.data && p.data.soilAnalysis && Object.keys(p.data.soilAnalysis).length > 0),
          hasFertirriego: !!(p.data && p.data.fertirriego && Object.keys(p.data.fertirriego).length > 0),
          hasGranular: !!(p.data && p.data.granular && Object.keys(p.data.granular).length > 0)
        }));
      } catch (e) {
        console.warn('⚠️ Supabase fetch projects:', e);
        return [];
      }
    },

    /** Metadatos de frescura desde caché cloud para un proyecto */
    getCloudProjectMeta: function(projectId) {
      if (!projectId) return null;
      const cache = Array.isArray(window._np_cloud_projects_cache) ? window._np_cloud_projects_cache : [];
      const p = cache.find(x => x && x.id === projectId);
      if (!p) return null;
      return {
        id: p.id,
        updatedAt: p.updatedAt || p.updated_at || null,
        title: p.title || p.name || 'Sin nombre'
      };
    },

    /** Obtener un proyecto desde Supabase */
    fetchProject: async function(projectId) {
      if (!isSupabaseUser()) return null;
      const client = getClient();
      if (!client) return null;

      try {
        const { data, error } = await client.from('projects').select('*').eq('id', projectId).single();
        if (error || !data) return null;
        return data.data || data;
      } catch (e) {
        return null;
      }
    },

    /** Eliminar un proyecto en la nube (usuario borra el suyo; RLS solo permite los propios). Primero reportes del proyecto, luego el proyecto. */
    deleteProject: async function(projectId) {
      if (!isSupabaseUser()) return false;
      const client = getClient();
      if (!client) return false;
      try {
        await client.from('reports').delete().eq('project_id', projectId);
        const { error } = await client.from('projects').delete().eq('id', projectId);
        if (error) {
          console.warn('⚠️ Supabase delete project:', error.message);
          return false;
        }
        return true;
      } catch (e) {
        console.warn('⚠️ Supabase delete project:', e);
        return false;
      }
    },

    /**
     * Sincronizar todos los proyectos del usuario desde localStorage a la nube.
     * Útil cuando vuelve la conexión después de haber guardado sin internet.
     */
    syncAllLocalProjectsToCloud: async function(options) {
      if (!isSupabaseUser()) return;
      const opts = options || {};
      const silent = !!opts.silent;
      const localProjects = collectLocalProjectsForIdentity();
      const cloudList = await this.fetchProjects();
      const cloudUpdatedMap = new Map((cloudList || []).map(p => [p.id, normalizeDate(p.updated_at)]));
      var scanned = localProjects.length;
      var synced = 0;
      var skippedOlder = 0;

      for (var i = 0; i < localProjects.length; i++) {
        var item = localProjects[i];
        var id = item.projectId;
        var data = item.data;
        var localUpdatedTs = item.localUpdatedTs || 0;
        var cloudUpdatedTs = cloudUpdatedMap.get(id) || 0;
        if (cloudUpdatedTs > 0 && localUpdatedTs > 0 && localUpdatedTs <= cloudUpdatedTs) {
          skippedOlder++;
          continue;
        }
        try {
          await this.syncProject(id, data);
          synced++;
        } catch (err) {
          console.warn('⚠️ Sync proyecto ' + id + ':', err);
        }
      }

      if (synced > 0 && !silent) {
        console.log('☁️ Conexión restaurada: ' + synced + ' proyecto(s) sincronizado(s) a la nube.');
        if (typeof window.showMessage === 'function') {
          window.showMessage('Conexión restaurada. Tus cambios se han sincronizado con la nube.', 'success');
        }
      }
      return { scanned: scanned, synced: synced, skippedOlder: skippedOlder };
    },

    /** Obtener chat sin proyecto del perfil desde Supabase (para cargar en otro dispositivo) */
    fetchUserChatNoProject: async function(userId) {
      if (!userId || !UUID_REGEX.test(String(userId))) return null;
      const client = getClient();
      if (!client) return null;
      try {
        const { data, error } = await client.from('profiles').select('chat_history_no_project').eq('id', userId).single();
        if (error || !data) return null;
        return Array.isArray(data.chat_history_no_project) ? data.chat_history_no_project : null;
      } catch (e) { return null; }
    },

    /** Sincronizar chat sin proyecto del usuario a Supabase (profiles.chat_history_no_project) */
    syncUserChatNoProject: async function(userId, messages) {
      if (!userId || !UUID_REGEX.test(String(userId))) return;
      const client = getClient();
      if (!client) return;
      try {
        const { error } = await client.from('profiles').update({
          chat_history_no_project: Array.isArray(messages) ? messages : [],
          updated_at: new Date().toISOString()
        }).eq('id', userId);
        if (error) console.warn('⚠️ Supabase sync chat sin proyecto:', error.message);
        else console.log('☁️ Chat sin proyecto sincronizado a la nube');
      } catch (e) { console.warn('⚠️ syncUserChatNoProject:', e); }
    },

    /** Obtener enmiendas personalizadas del usuario desde Supabase (profiles.custom_amendments) */
    fetchUserCustomAmendments: async function(userId) {
      if (!userId || !UUID_REGEX.test(String(userId))) return null;
      const client = getClient();
      if (!client) return null;
      try {
        const { data, error } = await client.from('profiles').select('custom_amendments').eq('id', userId).single();
        if (error || !data) return null;
        return Array.isArray(data.custom_amendments) ? data.custom_amendments : null;
      } catch (e) { return null; }
    },

    /** Sincronizar enmiendas personalizadas del usuario a Supabase (profiles.custom_amendments) */
    syncUserCustomAmendments: async function(userId, customAmendments) {
      if (!userId || !UUID_REGEX.test(String(userId))) return;
      const client = getClient();
      if (!client) return;
      try {
        const payload = Array.isArray(customAmendments) ? customAmendments : [];
        const { error } = await client.from('profiles').update({
          custom_amendments: payload,
          updated_at: new Date().toISOString()
        }).eq('id', userId);
        if (error) console.warn('⚠️ Supabase sync enmiendas personalizadas:', error.message);
        else console.log('☁️ Enmiendas personalizadas sincronizadas a la nube');
      } catch (e) { console.warn('⚠️ syncUserCustomAmendments:', e); }
    },

    /** Obtener materiales granulares personalizados del usuario desde Supabase (profiles.custom_granular_materials) */
    fetchUserCustomGranularMaterials: async function(userId) {
      if (!userId || !UUID_REGEX.test(String(userId))) return null;
      const client = getClient();
      if (!client) return null;
      try {
        const { data, error } = await client.from('profiles').select('custom_granular_materials').eq('id', userId).single();
        if (error || !data) return null;
        return data.custom_granular_materials && typeof data.custom_granular_materials === 'object' ? data.custom_granular_materials : null;
      } catch (e) { return null; }
    },

    /** Sincronizar catálogo de materiales granulares personalizados a Supabase (profiles.custom_granular_materials) */
    syncUserCustomGranularMaterials: async function(userId, customGranularMaterials) {
      if (!userId || !UUID_REGEX.test(String(userId))) return;
      const client = getClient();
      if (!client) return;
      try {
        const payload = customGranularMaterials && typeof customGranularMaterials === 'object' ? customGranularMaterials : {};
        const { error } = await client.from('profiles').update({
          custom_granular_materials: payload,
          updated_at: new Date().toISOString()
        }).eq('id', userId);
        if (error) console.warn('⚠️ Supabase sync materiales granulares:', error.message);
        else console.log('☁️ Materiales granulares personalizados sincronizados a la nube');
      } catch (e) { console.warn('⚠️ syncUserCustomGranularMaterials:', e); }
    },

    /** Obtener cultivos granulares personalizados del usuario desde Supabase (profiles.custom_granular_crops) */
    fetchUserCustomGranularCrops: async function(userId) {
      if (!userId || !UUID_REGEX.test(String(userId))) return null;
      const client = getClient();
      if (!client) return null;
      try {
        const { data, error } = await client.from('profiles').select('custom_granular_crops').eq('id', userId).single();
        if (error || !data) return null;
        return data.custom_granular_crops && typeof data.custom_granular_crops === 'object' ? data.custom_granular_crops : null;
      } catch (e) { return null; }
    },

    /** Sincronizar catálogo de cultivos granulares personalizados a Supabase (profiles.custom_granular_crops) */
    syncUserCustomGranularCrops: async function(userId, customGranularCrops) {
      if (!userId || !UUID_REGEX.test(String(userId))) return;
      const client = getClient();
      if (!client) return;
      try {
        const payload = customGranularCrops && typeof customGranularCrops === 'object' ? customGranularCrops : {};
        const { error } = await client.from('profiles').update({
          custom_granular_crops: payload,
          updated_at: new Date().toISOString()
        }).eq('id', userId);
        if (error) console.warn('⚠️ Supabase sync cultivos granulares:', error.message);
        else console.log('☁️ Cultivos granulares personalizados sincronizados a la nube');
      } catch (e) { console.warn('⚠️ syncUserCustomGranularCrops:', e); }
    },

    /** Obtener fertilizantes solubles personalizados del usuario desde Supabase (profiles.custom_ferti_materials) */
    fetchUserCustomFertiMaterials: async function(userId) {
      if (!userId || !UUID_REGEX.test(String(userId))) return null;
      const client = getClient();
      if (!client) return null;
      try {
        const { data, error } = await client.from('profiles').select('custom_ferti_materials').eq('id', userId).single();
        if (error || !data) return null;
        return data.custom_ferti_materials && typeof data.custom_ferti_materials === 'object' ? data.custom_ferti_materials : null;
      } catch (e) { return null; }
    },

    /** Sincronizar catálogo de fertilizantes solubles personalizados a Supabase (profiles.custom_ferti_materials) */
    syncUserCustomFertiMaterials: async function(userId, customFertiMaterials) {
      if (!userId || !UUID_REGEX.test(String(userId))) return;
      const client = getClient();
      if (!client) return;
      try {
        const payload = customFertiMaterials && typeof customFertiMaterials === 'object' ? customFertiMaterials : { items: [] };
        const { error } = await client.from('profiles').update({
          custom_ferti_materials: payload,
          updated_at: new Date().toISOString()
        }).eq('id', userId);
        if (error) console.warn('⚠️ Supabase sync fertilizantes solubles:', error.message);
        else console.log('☁️ Fertilizantes solubles personalizados sincronizados a la nube');
      } catch (e) { console.warn('⚠️ syncUserCustomFertiMaterials:', e); }
    },

    /** Obtener cultivos fertirriego personalizados del usuario desde Supabase (profiles.custom_ferti_crops) */
    fetchUserCustomFertiCrops: async function(userId) {
      if (!userId || !UUID_REGEX.test(String(userId))) return null;
      const client = getClient();
      if (!client) return null;
      try {
        const { data, error } = await client.from('profiles').select('custom_ferti_crops').eq('id', userId).single();
        if (error || !data) return null;
        return data.custom_ferti_crops && typeof data.custom_ferti_crops === 'object' ? data.custom_ferti_crops : null;
      } catch (e) { return null; }
    },

    /** Sincronizar catálogo de cultivos fertirriego personalizados a Supabase (profiles.custom_ferti_crops) */
    syncUserCustomFertiCrops: async function(userId, customFertiCrops) {
      if (!userId || !UUID_REGEX.test(String(userId))) return;
      const client = getClient();
      if (!client) return;
      try {
        const payload = customFertiCrops && typeof customFertiCrops === 'object' ? customFertiCrops : {};
        const { error } = await client.from('profiles').update({
          custom_ferti_crops: payload,
          updated_at: new Date().toISOString()
        }).eq('id', userId);
        if (error) console.warn('⚠️ Supabase sync cultivos fertirriego:', error.message);
        else console.log('☁️ Cultivos fertirriego personalizados sincronizados a la nube');
      } catch (e) { console.warn('⚠️ syncUserCustomFertiCrops:', e); }
    },

    /** Obtener fertilizantes hidroponía personalizados del usuario desde Supabase (profiles.custom_hydro_materials) */
    fetchUserCustomHydroMaterials: async function(userId) {
      if (!userId || !UUID_REGEX.test(String(userId))) return null;
      const client = getClient();
      if (!client) return null;
      try {
        const { data, error } = await client.from('profiles').select('custom_hydro_materials').eq('id', userId).single();
        if (error || !data) return null;
        return data.custom_hydro_materials && typeof data.custom_hydro_materials === 'object' ? data.custom_hydro_materials : null;
      } catch (e) { return null; }
    },

    /** Sincronizar catálogo de fertilizantes hidroponía personalizados a Supabase (profiles.custom_hydro_materials) */
    syncUserCustomHydroMaterials: async function(userId, customHydroMaterials) {
      if (!userId || !UUID_REGEX.test(String(userId))) return;
      const client = getClient();
      if (!client) return;
      try {
        const payload = customHydroMaterials && typeof customHydroMaterials === 'object' ? customHydroMaterials : { items: [] };
        const { error } = await client.from('profiles').update({
          custom_hydro_materials: payload,
          updated_at: new Date().toISOString()
        }).eq('id', userId);
        if (error) console.warn('⚠️ Supabase sync materiales hidroponía:', error.message);
        else console.log('☁️ Fertilizantes hidroponía personalizados sincronizados a la nube');
      } catch (e) { console.warn('⚠️ syncUserCustomHydroMaterials:', e); }
    },

    /** Obtener reportes del usuario para un proyecto desde Supabase (tabla reports) */
    fetchUserReports: async function(userId, projectId) {
      if (!userId || !UUID_REGEX.test(String(userId)) || !projectId) return [];
      const client = getClient();
      if (!client) return [];
      try {
        const { data, error } = await client.from('reports').select('id, data, created_at').eq('user_id', userId).eq('project_id', projectId).order('created_at', { ascending: false });
        if (error) {
          console.warn('⚠️ Supabase fetch reports:', error.message);
          return [];
        }
        return (data || []).map(function(r) {
          const report = r.data && typeof r.data === 'object' ? r.data : {};
          if (r.id && !report.id) report.id = r.id;
          if (r.created_at && !report.timestamp) report.timestamp = r.created_at;
          return report;
        });
      } catch (e) {
        console.warn('⚠️ Supabase fetch reports:', e);
        return [];
      }
    },

    /** Sincronizar un reporte a Supabase (insert/upsert por id) */
    syncReport: async function(userId, projectId, reportData) {
      if (!userId || !UUID_REGEX.test(String(userId)) || !projectId || !reportData || typeof reportData !== 'object') return;
      const reportId = reportData.id || 'report_' + Date.now();
      const client = getClient();
      if (!client) {
        console.warn('⚠️ Sync reporte: no hay cliente Supabase (revisa supabase-config.js)');
        return;
      }
      try {
        const { data: sessionData } = await client.auth.getSession();
        if (!sessionData || !sessionData.session) {
          console.warn('⚠️ Sync reporte: no hay sesión de Supabase. Cierra sesión y vuelve a iniciar sesión desde la pantalla de Login para que los reportes se guarden en la nube.');
          return;
        }
        const row = {
          id: reportId,
          user_id: userId,
          project_id: projectId,
          data: reportData,
          created_at: (reportData.timestamp && new Date(reportData.timestamp).toISOString()) || new Date().toISOString()
        };
        const { error } = await client.from('reports').upsert(row, { onConflict: 'id', ignoreDuplicates: false });
        if (error) {
          console.error('⚠️ Supabase sync report falló:', error.code || error.message, error.message);
        } else {
          console.log('☁️ Reporte sincronizado a la nube:', reportId);
        }
      } catch (e) {
        console.warn('⚠️ syncReport:', e);
      }
    },

    /** Eliminar un reporte en la nube por id */
    deleteReport: async function(reportId) {
      if (!reportId) return false;
      const client = getClient();
      if (!client) return false;
      try {
        const { error } = await client.from('reports').delete().eq('id', reportId);
        if (error) {
          console.warn('⚠️ Supabase delete report:', error.message);
          return false;
        }
        return true;
      } catch (e) {
        console.warn('⚠️ Supabase delete report:', e);
        return false;
      }
    }
  };

  window.nutriplantSyncUserChatNoProjectToCloud = function(userId, messages) {
    if (window.nutriplantSupabaseProjects && window.nutriplantSupabaseProjects.syncUserChatNoProject) {
      window.nutriplantSupabaseProjects.syncUserChatNoProject(userId, messages);
    }
  };

  /** Sincronizar catálogo de enmiendas personalizadas a la nube (por usuario). Devuelve Promise para poder await y que otro navegador/dispositivo vea el catálogo. */
  window.nutriplantSyncCustomAmendmentsToCloud = function(userId, customAmendments) {
    if (window.nutriplantSupabaseProjects && window.nutriplantSupabaseProjects.syncUserCustomAmendments) {
      return window.nutriplantSupabaseProjects.syncUserCustomAmendments(userId, customAmendments);
    }
    return Promise.resolve();
  };

  /** Obtener enmiendas personalizadas desde la nube (por usuario) */
  window.nutriplantFetchCustomAmendmentsFromCloud = function(userId) {
    if (window.nutriplantSupabaseProjects && window.nutriplantSupabaseProjects.fetchUserCustomAmendments) {
      return window.nutriplantSupabaseProjects.fetchUserCustomAmendments(userId);
    }
    return Promise.resolve(null);
  };

  /** Sincronizar catálogo de materiales granulares personalizados a la nube (por usuario) */
  window.nutriplantSyncCustomGranularMaterialsToCloud = function(userId, customGranularMaterials) {
    if (window.nutriplantSupabaseProjects && window.nutriplantSupabaseProjects.syncUserCustomGranularMaterials) {
      window.nutriplantSupabaseProjects.syncUserCustomGranularMaterials(userId, customGranularMaterials);
    }
  };

  /** Obtener materiales granulares personalizados desde la nube (por usuario) */
  window.nutriplantFetchCustomGranularMaterialsFromCloud = function(userId) {
    if (window.nutriplantSupabaseProjects && window.nutriplantSupabaseProjects.fetchUserCustomGranularMaterials) {
      return window.nutriplantSupabaseProjects.fetchUserCustomGranularMaterials(userId);
    }
    return Promise.resolve(null);
  };

  /** Sincronizar catálogo de cultivos granulares personalizados a la nube (por usuario) */
  window.nutriplantSyncCustomGranularCropsToCloud = function(userId, customGranularCrops) {
    if (window.nutriplantSupabaseProjects && window.nutriplantSupabaseProjects.syncUserCustomGranularCrops) {
      window.nutriplantSupabaseProjects.syncUserCustomGranularCrops(userId, customGranularCrops);
    }
  };

  /** Obtener cultivos granulares personalizados desde la nube (por usuario) */
  window.nutriplantFetchCustomGranularCropsFromCloud = function(userId) {
    if (window.nutriplantSupabaseProjects && window.nutriplantSupabaseProjects.fetchUserCustomGranularCrops) {
      return window.nutriplantSupabaseProjects.fetchUserCustomGranularCrops(userId);
    }
    return Promise.resolve(null);
  };

  /** Sincronizar catálogo de fertilizantes solubles (fertirriego) a la nube (por usuario) */
  window.nutriplantSyncCustomFertiMaterialsToCloud = function(userId, customFertiMaterials) {
    if (window.nutriplantSupabaseProjects && window.nutriplantSupabaseProjects.syncUserCustomFertiMaterials) {
      window.nutriplantSupabaseProjects.syncUserCustomFertiMaterials(userId, customFertiMaterials);
    }
  };

  /** Obtener fertilizantes solubles personalizados desde la nube (por usuario) */
  window.nutriplantFetchCustomFertiMaterialsFromCloud = function(userId) {
    if (window.nutriplantSupabaseProjects && window.nutriplantSupabaseProjects.fetchUserCustomFertiMaterials) {
      return window.nutriplantSupabaseProjects.fetchUserCustomFertiMaterials(userId);
    }
    return Promise.resolve(null);
  };

  /** Sincronizar catálogo de cultivos fertirriego personalizados a la nube (por usuario) */
  window.nutriplantSyncCustomFertiCropsToCloud = function(userId, customFertiCrops) {
    if (window.nutriplantSupabaseProjects && window.nutriplantSupabaseProjects.syncUserCustomFertiCrops) {
      window.nutriplantSupabaseProjects.syncUserCustomFertiCrops(userId, customFertiCrops);
    }
  };

  /** Obtener cultivos fertirriego personalizados desde la nube (por usuario) */
  window.nutriplantFetchCustomFertiCropsFromCloud = function(userId) {
    if (window.nutriplantSupabaseProjects && window.nutriplantSupabaseProjects.fetchUserCustomFertiCrops) {
      return window.nutriplantSupabaseProjects.fetchUserCustomFertiCrops(userId);
    }
    return Promise.resolve(null);
  };

  /** Sincronizar catálogo de fertilizantes hidroponía personalizados a la nube (por usuario) */
  window.nutriplantSyncCustomHydroMaterialsToCloud = function(userId, customHydroMaterials) {
    if (window.nutriplantSupabaseProjects && window.nutriplantSupabaseProjects.syncUserCustomHydroMaterials) {
      window.nutriplantSupabaseProjects.syncUserCustomHydroMaterials(userId, customHydroMaterials);
    }
  };

  /** Obtener fertilizantes hidroponía personalizados desde la nube (por usuario) */
  window.nutriplantFetchCustomHydroMaterialsFromCloud = function(userId) {
    if (window.nutriplantSupabaseProjects && window.nutriplantSupabaseProjects.fetchUserCustomHydroMaterials) {
      return window.nutriplantSupabaseProjects.fetchUserCustomHydroMaterials(userId);
    }
    return Promise.resolve(null);
  };

  /** Obtener reportes del usuario para un proyecto desde la nube */
  window.nutriplantFetchReportsFromCloud = function(userId, projectId) {
    if (window.nutriplantSupabaseProjects && window.nutriplantSupabaseProjects.fetchUserReports) {
      return window.nutriplantSupabaseProjects.fetchUserReports(userId, projectId);
    }
    return Promise.resolve([]);
  };

  /** Sincronizar un reporte a la nube */
  window.nutriplantSyncReportToCloud = function(userId, projectId, reportData) {
    if (window.nutriplantSupabaseProjects && window.nutriplantSupabaseProjects.syncReport) {
      window.nutriplantSupabaseProjects.syncReport(userId, projectId, reportData);
    }
  };

  /** Eliminar un reporte en la nube por id */
  window.nutriplantDeleteReportFromCloud = function(reportId) {
    if (window.nutriplantSupabaseProjects && window.nutriplantSupabaseProjects.deleteReport) {
      return window.nutriplantSupabaseProjects.deleteReport(reportId);
    }
    return Promise.resolve(false);
  };

  // Definir la función de sincronización que usa project-storage.js
  window.nutriplantSyncProjectToCloud = function(projectId, projectData) {
    if (window.nutriplantSupabaseProjects && window.nutriplantSupabaseProjects.syncProject) {
      window.nutriplantSupabaseProjects.syncProject(projectId, projectData);
    }
  };

  // Cuando el usuario recupera la conexión, sincronizar lo guardado en localStorage a la nube
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('online', function() {
      if (!window.nutriplantSupabaseProjects || !window.nutriplantSupabaseProjects.isSupabaseUser()) return;
      setTimeout(function() {
        if (window.nutriplantSupabaseProjects && window.nutriplantSupabaseProjects.syncAllLocalProjectsToCloud) {
          window.nutriplantSupabaseProjects.syncAllLocalProjectsToCloud();
        }
      }, 1500);
    });
  }
})();
