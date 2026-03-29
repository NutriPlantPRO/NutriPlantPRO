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

  function isSoftDeletedData(projectData) {
    if (!projectData || typeof projectData !== 'object') return false;
    return projectData._is_deleted === true || projectData.is_deleted === true || !!projectData.deleted_at;
  }

  function markProjectAsDeleted(projectData, meta) {
    const source = (projectData && typeof projectData === 'object') ? projectData : {};
    const nowIso = new Date().toISOString();
    const retentionDays = (meta && Number.isFinite(meta.retentionDays)) ? meta.retentionDays : 60;
    const deleteDate = new Date(nowIso);
    deleteDate.setDate(deleteDate.getDate() + retentionDays);
    return {
      ...source,
      _is_deleted: true,
      deleted_at: nowIso,
      deleted_by: (meta && meta.deletedBy) ? meta.deletedBy : 'user',
      restore_until: deleteDate.toISOString(),
      updated_at: nowIso,
      updatedAt: nowIso
    };
  }

  function clearSoftDeleteFlags(projectData) {
    if (!projectData || typeof projectData !== 'object') return projectData;
    const restored = { ...projectData };
    delete restored._is_deleted;
    delete restored.is_deleted;
    delete restored.deleted_at;
    delete restored.deleted_by;
    delete restored.restore_until;
    const nowIso = new Date().toISOString();
    restored.updated_at = nowIso;
    restored.updatedAt = nowIso;
    return restored;
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
        if (isSoftDeletedData(data)) continue; // Papelera local no debe resubirse.

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

  /** Coalesce rapid saves into one upsert (reduces Disk IO on Supabase). */
  var CLOUD_SYNC_DEBOUNCE_MS = 4500;
  var cloudSyncTimers = Object.create(null);
  var cloudSyncPending = Object.create(null);
  var lastFetchProjectsError = null;
  var lastFetchReportsError = null;
  var USER_CHAT_SYNC_DEBOUNCE_MS = 6000;
  var userChatSyncTimers = Object.create(null);
  var userChatSyncPending = Object.create(null);
  var HIDDEN_FLUSH_DELAY_MS = 3000;
  var hiddenFlushTimer = null;

  function clearHiddenFlushTimer() {
    if (hiddenFlushTimer) {
      clearTimeout(hiddenFlushTimer);
      hiddenFlushTimer = null;
    }
  }

  function isCloudBootstrapBlocked() {
    try {
      return !!window._np_cloud_bootstrap_in_progress;
    } catch (e) {
      return false;
    }
  }

  function scheduleHiddenFlush() {
    clearHiddenFlushTimer();
    hiddenFlushTimer = setTimeout(function() {
      hiddenFlushTimer = null;
      if (!document.hidden || !window.nutriplantSupabaseProjects) return;
      if (window.nutriplantSupabaseProjects.flushPendingProjectCloudSync) {
        window.nutriplantSupabaseProjects.flushPendingProjectCloudSync();
      }
      if (window.nutriplantSupabaseProjects.flushPendingUserChatNoProjectSync) {
        window.nutriplantSupabaseProjects.flushPendingUserChatNoProjectSync();
      }
    }, HIDDEN_FLUSH_DELAY_MS);
  }

  async function syncProjectNow(projectId, projectData) {
    if (!isSupabaseUser()) return false;
    if (isCloudBootstrapBlocked()) {
      // Pull-first: en arranque multi-equipo no subir hasta terminar hidratación desde nube.
      scheduleProjectCloudSync(projectId, projectData);
      return false;
    }
    try {
      var projectHydrationInProgress = !!(window._np_project_open_cloud_refresh_in_progress && window._np_project_open_cloud_refresh_in_progress[projectId]);
      if (projectHydrationInProgress) {
        // Evitar sobrescribir nube con estado parcial/local mientras fetchProject termina.
        scheduleProjectCloudSync(projectId, projectData);
        return false;
      }
    } catch (e) {}
    const client = getClient();
    if (!client) return false;

    const userId = localStorage.getItem('nutriplant_user_id');
    if (!userId) return false;

    try {
      function hasRichGranularReq(req) {
        if (!req || typeof req !== 'object') return false;
        const hasAdj = !!(req.adjustment && Object.keys(req.adjustment).length > 0);
        const hasEff = !!(req.efficiency && Object.keys(req.efficiency).length > 0);
        const hasExt = !!(req.extractionOverrides && Object.keys(req.extractionOverrides).length > 0);
        return hasAdj || hasEff || hasExt;
      }

      // Blindaje antes de subir: no mandar una version granular "pobre"
      // si local ya tiene requirements/program completos.
      let payloadData = projectData && typeof projectData === 'object' ? { ...projectData } : {};
      try {
        const localKey = 'nutriplant_project_' + projectId;
        const localRaw = localStorage.getItem(localKey);
        const localObj = localRaw ? JSON.parse(localRaw) : null;
        const localGranular = localObj && localObj.granular && typeof localObj.granular === 'object' ? localObj.granular : null;
        const incomingGranular = payloadData.granular && typeof payloadData.granular === 'object' ? payloadData.granular : null;

        if (localGranular) {
          if (!payloadData.granular || typeof payloadData.granular !== 'object') {
            payloadData.granular = { ...localGranular };
          } else {
            const localReq = localGranular.requirements;
            const incomingReq = incomingGranular ? incomingGranular.requirements : null;
            if (hasRichGranularReq(localReq) && !hasRichGranularReq(incomingReq)) {
              payloadData.granular.requirements = localReq;
            }

            const localProgram = localGranular.program;
            const incomingProgram = incomingGranular ? incomingGranular.program : null;
            const localHasProgram = !!(localProgram && Array.isArray(localProgram.applications) && localProgram.applications.length > 0);
            const incomingHasProgram = !!(incomingProgram && Array.isArray(incomingProgram.applications) && incomingProgram.applications.length > 0);
            if (localHasProgram && !incomingHasProgram) {
              payloadData.granular.program = localProgram;
            }

            if (!payloadData.granular.lastUI && localGranular.lastUI) {
              payloadData.granular.lastUI = localGranular.lastUI;
            }
          }
        }
      } catch (e) {}

      // Blindaje anti-stale: si la nube reporta algo más nuevo que el payload local, no sobrescribir.
      try {
        const meta = window.nutriplantSupabaseProjects && typeof window.nutriplantSupabaseProjects.getCloudProjectMeta === 'function'
          ? window.nutriplantSupabaseProjects.getCloudProjectMeta(projectId)
          : null;
        const cloudTs = meta && meta.updatedAt ? new Date(meta.updatedAt).getTime() : 0;
        const localStamp = payloadData.updated_at || payloadData.updatedAt || payloadData.lastSaved || payloadData.created_at || payloadData.createdAt || null;
        const localTs = localStamp ? new Date(localStamp).getTime() : 0;
        if (cloudTs && (!localTs || cloudTs > localTs + 1500)) {
          console.warn('⏭️ Sync a nube omitido: nube tiene versión más reciente para', projectId);
          return false;
        }
      } catch (e) {}

      const row = {
        id: projectId,
        user_id: userId,
        name: payloadData.name || payloadData.title || 'Sin nombre',
        title: payloadData.title || payloadData.name || '',
        data: payloadData,
        updated_at: new Date().toISOString()
      };

      const { error } = await client.from('projects').upsert(row, {
        onConflict: 'id',
        ignoreDuplicates: false
      });

      if (error) {
        console.warn('⚠️ Supabase sync error:', error.message);
        return false;
      } else {
        console.log('☁️ Proyecto sincronizado a la nube:', projectId);
        return true;
      }
    } catch (e) {
      console.warn('⚠️ Supabase sync:', e);
      return false;
    }
    return false;
  }

  /** Evita que un upsert debounced (payload viejo) se ejecute después y pise datos recién guardados (p. ej. vpdAnalysis.rangeTables). */
  function cancelScheduledProjectCloudSync(projectId) {
    if (!projectId) return;
    if (cloudSyncTimers[projectId]) {
      clearTimeout(cloudSyncTimers[projectId]);
      delete cloudSyncTimers[projectId];
    }
    delete cloudSyncPending[projectId];
  }

  function scheduleProjectCloudSync(projectId, projectData) {
    if (!isSupabaseUser()) return;
    cloudSyncPending[projectId] = projectData;
    if (cloudSyncTimers[projectId]) clearTimeout(cloudSyncTimers[projectId]);
    cloudSyncTimers[projectId] = setTimeout(function() {
      if (isCloudBootstrapBlocked()) {
        // Reintentar después del bootstrap sin perder el último payload.
        cloudSyncTimers[projectId] = setTimeout(function() {
          delete cloudSyncTimers[projectId];
          var latestAfterBootstrap = cloudSyncPending[projectId];
          delete cloudSyncPending[projectId];
          if (latestAfterBootstrap) syncProjectNow(projectId, latestAfterBootstrap);
        }, 2000);
        return;
      }
      delete cloudSyncTimers[projectId];
      var latest = cloudSyncPending[projectId];
      delete cloudSyncPending[projectId];
      if (latest) syncProjectNow(projectId, latest);
    }, CLOUD_SYNC_DEBOUNCE_MS);
  }

  function flushPendingProjectCloudSync() {
    if (isCloudBootstrapBlocked()) return;
    var ids = Object.keys(cloudSyncPending);
    for (var i = 0; i < ids.length; i++) {
      var pid = ids[i];
      if (cloudSyncTimers[pid]) {
        clearTimeout(cloudSyncTimers[pid]);
        delete cloudSyncTimers[pid];
      }
      var data = cloudSyncPending[pid];
      delete cloudSyncPending[pid];
      if (data) syncProjectNow(pid, data);
    }
  }

  async function syncUserChatNoProjectNow(userId, messages) {
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
  }

  function scheduleUserChatNoProjectSync(userId, messages) {
    if (!userId || !UUID_REGEX.test(String(userId))) return;
    userChatSyncPending[userId] = Array.isArray(messages) ? messages : [];
    if (userChatSyncTimers[userId]) clearTimeout(userChatSyncTimers[userId]);
    userChatSyncTimers[userId] = setTimeout(function() {
      delete userChatSyncTimers[userId];
      var latest = userChatSyncPending[userId];
      delete userChatSyncPending[userId];
      syncUserChatNoProjectNow(userId, latest);
    }, USER_CHAT_SYNC_DEBOUNCE_MS);
  }

  function flushPendingUserChatNoProjectSync() {
    var ids = Object.keys(userChatSyncPending);
    for (var i = 0; i < ids.length; i++) {
      var uid = ids[i];
      if (userChatSyncTimers[uid]) {
        clearTimeout(userChatSyncTimers[uid]);
        delete userChatSyncTimers[uid];
      }
      var latest = userChatSyncPending[uid];
      delete userChatSyncPending[uid];
      syncUserChatNoProjectNow(uid, latest);
    }
  }

  window.nutriplantSupabaseProjects = {
    isSupabaseUser: isSupabaseUser,

    /** Upsert inmediato (reconexión, migraciones). No usar desde guardado frecuente. */
    syncProjectNow: syncProjectNow,

    /** Sincronizar proyecto a Supabase (upsert con debounce; agrupa muchos guardados seguidos). */
    syncProject: function(projectId, projectData) {
      scheduleProjectCloudSync(projectId, projectData);
    },

    cancelScheduledProjectCloudSync: cancelScheduledProjectCloudSync,

    /** Fuerza envío de cambios pendientes (p. ej. al ocultar la pestaña). */
    flushPendingProjectCloudSync: flushPendingProjectCloudSync,
    flushPendingUserChatNoProjectSync: flushPendingUserChatNoProjectSync,

    /** Obtener lista de proyectos desde Supabase */
    fetchProjects: async function(options) {
      if (!isSupabaseUser()) {
        lastFetchProjectsError = 'NO_SUPABASE_USER';
        return [];
      }
      const client = getClient();
      if (!client) {
        lastFetchProjectsError = 'NO_CLIENT';
        return [];
      }
      const opts = options || {};
      const includeDeleted = !!opts.includeDeleted;

      try {
        // Esperar brevemente a que la sesión se hidrate tras recargar.
        // Si no hay sesión válida, NO consultar para evitar falsos "sin proyectos" por RLS.
        let hasSession = false;
        for (let attempt = 0; attempt < 4; attempt++) {
          try {
            const sessionRes = await client.auth.getSession();
            hasSession = !!(sessionRes && sessionRes.data && sessionRes.data.session);
          } catch (sessionErr) {
            hasSession = false;
          }
          if (hasSession) break;
          if (attempt < 3) {
            await new Promise(function(r) { setTimeout(r, 350); });
          }
        }
        if (!hasSession) {
          lastFetchProjectsError = 'NO_SESSION';
          console.warn('⚠️ Supabase fetch projects: sesión no lista');
          return [];
        }

        const { data, error } = await client.from('projects').select('id, user_id, name, title, data, updated_at').order('updated_at', { ascending: false });
        if (error) {
          const msg = (error && error.message) ? String(error.message) : '';
          lastFetchProjectsError = msg || 'QUERY_ERROR';
          console.warn('⚠️ Supabase fetch projects:', error.message);
          return [];
        }
        lastFetchProjectsError = null;
        return (data || []).map(p => ({
          id: p.id,
          user_id: p.user_id,
          name: p.name || p.title || 'Sin nombre',
          updated_at: p.updated_at,
          data: p.data,
          is_deleted: isSoftDeletedData(p.data),
          deleted_at: (p.data && p.data.deleted_at) || null,
          restore_until: (p.data && p.data.restore_until) || null,
          hasLocation: !!(p.data && p.data.location && p.data.location.polygon),
          hasSoilAnalysis: !!(p.data && p.data.soilAnalysis && Object.keys(p.data.soilAnalysis).length > 0),
          hasFertirriego: !!(p.data && p.data.fertirriego && Object.keys(p.data.fertirriego).length > 0),
          hasGranular: !!(p.data && p.data.granular && Object.keys(p.data.granular).length > 0)
        })).filter(p => includeDeleted ? true : !p.is_deleted);
      } catch (e) {
        lastFetchProjectsError = (e && e.message) ? e.message : 'FETCH_ERROR';
        console.warn('⚠️ Supabase fetch projects:', e);
        return [];
      }
    },
    getLastFetchProjectsError: function() {
      return lastFetchProjectsError;
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

    /** Obtener un proyecto desde Supabase. Incluye updated_at de la fila para que "Actualizar con la nube" deje local en sync y no bloquee Guardar. */
    fetchProject: async function(projectId, options) {
      if (!isSupabaseUser()) return null;
      const client = getClient();
      if (!client) return null;
      const opts = options || {};
      const includeDeleted = !!opts.includeDeleted;

      try {
        const { data, error } = await client.from('projects').select('*').eq('id', projectId).single();
        if (error || !data) return null;
        const payload = data.data || data;
        if (!includeDeleted && isSoftDeletedData(payload)) return null;
        const rowUpdatedAt = data.updated_at != null ? data.updated_at : (data.updatedAt != null ? data.updatedAt : null);
        if (payload && typeof payload === 'object' && rowUpdatedAt) {
          return { ...payload, id: payload.id || data.id, updated_at: rowUpdatedAt, updatedAt: rowUpdatedAt };
        }
        return payload;
      } catch (e) {
        return null;
      }
    },

    /** Borrado lógico de proyecto en la nube (recuperable por admin). */
    deleteProject: async function(projectId) {
      if (!isSupabaseUser()) return false;
      const client = getClient();
      if (!client) return false;
      try {
        const existing = await this.fetchProject(projectId, { includeDeleted: true });
        if (!existing) {
          console.warn('⚠️ deleteProject: proyecto no encontrado en nube:', projectId);
          return false;
        }
        const softDeletedData = markProjectAsDeleted(existing, { deletedBy: 'user', retentionDays: 60 });
        const row = {
          id: projectId,
          user_id: localStorage.getItem('nutriplant_user_id'),
          name: softDeletedData.name || softDeletedData.title || 'Sin nombre',
          title: softDeletedData.title || softDeletedData.name || '',
          data: softDeletedData,
          updated_at: softDeletedData.updated_at || new Date().toISOString()
        };
        const { error } = await client.from('projects').upsert(row, { onConflict: 'id', ignoreDuplicates: false });
        if (error) {
          console.warn('⚠️ Supabase soft delete project:', error.message);
          return false;
        }
        return true;
      } catch (e) {
        console.warn('⚠️ Supabase soft delete project:', e);
        return false;
      }
    },

    /** Restaurar proyecto borrado lógicamente en la nube. */
    restoreProject: async function(projectId) {
      if (!isSupabaseUser()) return false;
      const client = getClient();
      if (!client) return false;
      try {
        const existing = await this.fetchProject(projectId, { includeDeleted: true });
        if (!existing) return false;
        const restoredData = clearSoftDeleteFlags(existing);
        const row = {
          id: projectId,
          user_id: localStorage.getItem('nutriplant_user_id'),
          name: restoredData.name || restoredData.title || 'Sin nombre',
          title: restoredData.title || restoredData.name || '',
          data: restoredData,
          updated_at: restoredData.updated_at || new Date().toISOString()
        };
        const { error } = await client.from('projects').upsert(row, { onConflict: 'id', ignoreDuplicates: false });
        if (error) {
          console.warn('⚠️ Supabase restore project:', error.message);
          return false;
        }
        return true;
      } catch (e) {
        console.warn('⚠️ Supabase restore project:', e);
        return false;
      }
    },

    /** Borrado físico definitivo (uso administrativo). */
    hardDeleteProject: async function(projectId) {
      if (!isSupabaseUser()) return false;
      const client = getClient();
      if (!client) return false;
      try {
        await client.from('reports').delete().eq('project_id', projectId);
        const { error } = await client.from('projects').delete().eq('id', projectId);
        if (error) {
          console.warn('⚠️ Supabase hard delete project:', error.message);
          return false;
        }
        return true;
      } catch (e) {
        console.warn('⚠️ Supabase hard delete project:', e);
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
      const onlyMissingInCloud = !!opts.onlyMissingInCloud;
      const localProjects = collectLocalProjectsForIdentity();
      const cloudList = await this.fetchProjects({ includeDeleted: true });
      const cloudFetchError = (typeof this.getLastFetchProjectsError === 'function') ? this.getLastFetchProjectsError() : null;
      if (cloudFetchError) {
        return {
          scanned: localProjects.length,
          synced: 0,
          skippedOlder: 0,
          skippedDeletedCloud: 0,
          skippedExistingCloud: 0,
          error: cloudFetchError
        };
      }
      const cloudUpdatedMap = new Map((cloudList || []).map(p => [p.id, normalizeDate(p.updated_at)]));
      const cloudDeletedIds = new Set((cloudList || []).filter(p => p && p.is_deleted).map(p => p.id));
      var scanned = localProjects.length;
      var synced = 0;
      var skippedOlder = 0;
      var skippedDeletedCloud = 0;
      var skippedExistingCloud = 0;

      for (var i = 0; i < localProjects.length; i++) {
        var item = localProjects[i];
        var id = item.projectId;
        var data = item.data;
        var localUpdatedTs = item.localUpdatedTs || 0;
        if (cloudDeletedIds.has(id)) {
          // Blindaje multi-equipo: si en nube está eliminado, no revivir por sync automático.
          skippedDeletedCloud++;
          continue;
        }
        var cloudUpdatedTs = cloudUpdatedMap.get(id) || 0;
        if (onlyMissingInCloud && cloudUpdatedTs > 0) {
          // Inicio de sesión multi-equipo: si ya existe en nube, no subir local automáticamente.
          skippedExistingCloud++;
          continue;
        }
        if (cloudUpdatedTs > 0 && localUpdatedTs > 0 && localUpdatedTs <= cloudUpdatedTs) {
          skippedOlder++;
          continue;
        }
        try {
          var ok = await syncProjectNow(id, data);
          if (ok) synced++;
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
      return {
        scanned: scanned,
        synced: synced,
        skippedOlder: skippedOlder,
        skippedDeletedCloud: skippedDeletedCloud,
        skippedExistingCloud: skippedExistingCloud
      };
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
    syncUserChatNoProjectNow: syncUserChatNoProjectNow,
    syncUserChatNoProject: function(userId, messages) {
      scheduleUserChatNoProjectSync(userId, messages);
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

    /** Obtener bloque de notas del usuario desde Supabase (profiles.user_notes). Requiere columna user_notes (text) en profiles. */
    fetchUserNotes: async function(userId) {
      if (!userId || !UUID_REGEX.test(String(userId))) return null;
      const client = getClient();
      if (!client) return null;
      try {
        const { data, error } = await client.from('profiles').select('user_notes').eq('id', userId).single();
        if (error) {
          if (error.code !== 'PGRST116') console.warn('⚠️ Supabase fetch user_notes:', error.message);
          return null;
        }
        return (data && data.user_notes != null) ? String(data.user_notes) : null;
      } catch (e) {
        return null;
      }
    },

    /** Sincronizar bloque de notas del usuario a Supabase (profiles.user_notes). Requiere columna user_notes (text) en profiles. */
    syncUserNotes: async function(userId, htmlContent) {
      if (!userId || !UUID_REGEX.test(String(userId))) return;
      const client = getClient();
      if (!client) return;
      try {
        const { error } = await client.from('profiles').update({
          user_notes: typeof htmlContent === 'string' ? htmlContent : ''
        }).eq('id', userId);
        if (error) {
          console.warn('⚠️ Supabase sync user_notes:', error.message);
          return;
        }
        console.log('☁️ Bloque de notas sincronizado a la nube');
      } catch (e) {
        console.warn('⚠️ syncUserNotes:', e);
      }
    },

    /** Obtener reportes del usuario para un proyecto desde Supabase (tabla reports) */
    fetchUserReports: async function(userId, projectId) {
      if (!userId || !UUID_REGEX.test(String(userId)) || !projectId) {
        lastFetchReportsError = 'INVALID_SCOPE';
        return [];
      }
      const client = getClient();
      if (!client) {
        lastFetchReportsError = 'NO_CLIENT';
        return [];
      }
      try {
        // Igual que en proyectos: esperar brevemente a que la sesión se hidrate
        // para evitar "vacío falso" por RLS al entrar desde otro equipo.
        let hasSession = false;
        for (let attempt = 0; attempt < 4; attempt++) {
          try {
            const sessionRes = await client.auth.getSession();
            hasSession = !!(sessionRes && sessionRes.data && sessionRes.data.session);
          } catch (sessionErr) {
            hasSession = false;
          }
          if (hasSession) break;
          if (attempt < 3) {
            await new Promise(function(r) { setTimeout(r, 350); });
          }
        }
        if (!hasSession) {
          lastFetchReportsError = 'NO_SESSION';
          console.warn('⚠️ Supabase fetch reports: sesión no lista');
          return [];
        }

        const { data, error } = await client.from('reports').select('id, data, created_at').eq('user_id', userId).eq('project_id', projectId).order('created_at', { ascending: false });
        if (error) {
          const msg = (error && error.message) ? String(error.message) : '';
          lastFetchReportsError = msg || 'QUERY_ERROR';
          console.warn('⚠️ Supabase fetch reports:', error.message);
          return [];
        }
        lastFetchReportsError = null;
        return (data || []).map(function(r) {
          const report = r.data && typeof r.data === 'object' ? r.data : {};
          if (r.id && !report.id) report.id = r.id;
          if (r.created_at && !report.timestamp) report.timestamp = r.created_at;
          return report;
        });
      } catch (e) {
        lastFetchReportsError = (e && e.message) ? e.message : 'FETCH_ERROR';
        console.warn('⚠️ Supabase fetch reports:', e);
        return [];
      }
    },
    getLastFetchReportsError: function() {
      return lastFetchReportsError;
    },

    /** Sincronizar un reporte a Supabase (insert/upsert por id). Devuelve true solo si el upsert terminó bien. */
    syncReport: async function(userId, projectId, reportData) {
      if (!userId || !UUID_REGEX.test(String(userId)) || !projectId || !reportData || typeof reportData !== 'object') return false;
      const reportId = reportData.id || 'report_' + Date.now();
      const client = getClient();
      if (!client) {
        console.warn('⚠️ Sync reporte: no hay cliente Supabase (revisa supabase-config.js)');
        return false;
      }
      try {
        const { data: sessionData } = await client.auth.getSession();
        if (!sessionData || !sessionData.session) {
          console.warn('⚠️ Sync reporte: no hay sesión de Supabase. Cierra sesión y vuelve a iniciar sesión desde la pantalla de Login para que los reportes se guarden en la nube.');
          return false;
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
          return false;
        }
        console.log('☁️ Reporte sincronizado a la nube:', reportId);
        return true;
      } catch (e) {
        console.warn('⚠️ syncReport:', e);
        return false;
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

  /** Sincronizar bloque de notas del usuario a la nube (profiles.user_notes). Requiere columna user_notes en profiles. */
  window.nutriplantSyncUserNotesToCloud = function(userId, htmlContent) {
    if (window.nutriplantSupabaseProjects && window.nutriplantSupabaseProjects.syncUserNotes) {
      return window.nutriplantSupabaseProjects.syncUserNotes(userId, htmlContent);
    }
    return Promise.resolve();
  };

  /** Obtener bloque de notas del usuario desde la nube (profiles.user_notes). Requiere columna user_notes en profiles. */
  window.nutriplantLoadUserNotesFromCloud = function(userId) {
    if (window.nutriplantSupabaseProjects && window.nutriplantSupabaseProjects.fetchUserNotes) {
      return window.nutriplantSupabaseProjects.fetchUserNotes(userId);
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

  window.nutriplantGetLastFetchReportsError = function() {
    if (window.nutriplantSupabaseProjects && window.nutriplantSupabaseProjects.getLastFetchReportsError) {
      return window.nutriplantSupabaseProjects.getLastFetchReportsError();
    }
    return null;
  };

  /** Sincronizar un reporte a la nube */
  window.nutriplantSyncReportToCloud = function(userId, projectId, reportData) {
    if (window.nutriplantSupabaseProjects && window.nutriplantSupabaseProjects.syncReport) {
      return window.nutriplantSupabaseProjects.syncReport(userId, projectId, reportData);
    }
    return Promise.resolve(false);
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
        if (window.nutriplantSupabaseProjects && window.nutriplantSupabaseProjects.flushPendingUserChatNoProjectSync) {
          window.nutriplantSupabaseProjects.flushPendingUserChatNoProjectSync();
        }
      }, 1500);
    });
    // Antes de cambiar de pestaña o minimizar: enviar debounce pendiente para no perder la última versión en nube
    document.addEventListener('visibilitychange', function() {
      if (!window.nutriplantSupabaseProjects) return;
      if (document.hidden) {
        // Alt-tab corto no debe forzar flush inmediato.
        scheduleHiddenFlush();
      } else {
        // Si vuelve rápido al dashboard, cancelar el flush diferido.
        clearHiddenFlushTimer();
      }
    });
    window.addEventListener('pagehide', function() {
      if (window.nutriplantSupabaseProjects) {
        clearHiddenFlushTimer();
        if (window.nutriplantSupabaseProjects.flushPendingProjectCloudSync) {
          window.nutriplantSupabaseProjects.flushPendingProjectCloudSync();
        }
        if (window.nutriplantSupabaseProjects.flushPendingUserChatNoProjectSync) {
          window.nutriplantSupabaseProjects.flushPendingUserChatNoProjectSync();
        }
      }
    });
  }
})();
