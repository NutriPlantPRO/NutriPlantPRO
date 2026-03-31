/**
 * NutriPlant PRO - Integración con Supabase Auth
 * Se usa cuando supabase-config.js tiene enabled: true y anonKey configurada
 */
(function() {
  'use strict';

  const AUTH_KEY = 'np_user';
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function relieveLocalStoragePressure() {
    try {
      // 1) Intentar alivio global si existe utilitario del dashboard.
      if (typeof window.np_tryRelieveLocalStoragePressure === 'function') {
        try { window.np_tryRelieveLocalStoragePressure(); } catch (e) {}
      }
      // 2) Limpiar backups/diagnósticos temporales no críticos.
      const toDelete = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (
          key.indexOf('_backup_') !== -1 ||
          key.indexOf('nutriplant_diagnostic_') === 0 ||
          key.indexOf('np_tmp_') === 0
        ) {
          toDelete.push(key);
        }
      }
      toDelete.forEach((k) => {
        try { localStorage.removeItem(k); } catch (e) {}
      });
    } catch (e) {}
  }

  function aggressiveRelieveLocalStoragePressure() {
    try {
      const toDelete = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (
          key.startsWith('nutriplant_project_') ||
          key.startsWith('nutriplant-project-') ||
          key.indexOf('_backup_') !== -1 ||
          key.indexOf('nutriplant_diagnostic_') === 0 ||
          key.indexOf('np_tmp_') === 0 ||
          key.indexOf('chat_response_cache') === 0 ||
          key.indexOf('chat_usage_metering') === 0
        ) {
          toDelete.push(key);
        }
      }
      toDelete.forEach((k) => {
        try { localStorage.removeItem(k); } catch (e) {}
      });
    } catch (e) {}
  }

  function safeSetItem(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      if (e && e.name === 'QuotaExceededError') {
        relieveLocalStoragePressure();
        try {
          localStorage.setItem(key, value);
          return true;
        } catch (retryErr) {
          // Último recurso (usuarios nube): purgar caché de proyectos locales y reintentar.
          aggressiveRelieveLocalStoragePressure();
          try {
            localStorage.setItem(key, value);
            return true;
          } catch (finalErr) {
            console.warn('localStorage lleno al guardar', key, finalErr && finalErr.message ? finalErr.message : finalErr);
          }
        }
      } else {
        console.warn('No se pudo guardar', key, e && e.message ? e.message : e);
      }
      return false;
    }
  }

  async function updateProfileWithRetry(client, userId, payload, attempts = 5, delayMs = 250) {
    let lastError = null;
    for (let i = 0; i < attempts; i++) {
      const { data, error } = await client
        .from('profiles')
        .update(payload)
        .eq('id', userId)
        .select('id');
      if (!error && Array.isArray(data) && data.length > 0) return { ok: true };
      lastError = error || new Error('Perfil aún no disponible');
      if (i < attempts - 1) await sleep(delayMs);
    }
    return { ok: false, error: lastError };
  }

  window.nutriplantSupabaseAuth = {
    /** ¿Supabase está disponible y configurado? */
    isAvailable: function() {
      const client = window.getSupabaseClient && window.getSupabaseClient();
      return !!client;
    },

    /** Login con Supabase */
    signIn: async function(email, password) {
      const client = window.getSupabaseClient();
      if (!client) return { ok: false, error: 'Supabase no configurado' };

      const SIGN_IN_TIMEOUT_MS = 38000;
      const timeoutMsg =
        'El servidor no respondió a tiempo. Comprueba tu conexión o el estado del proyecto en Supabase e inténtalo de nuevo.';

      try {
        return await Promise.race([
          (async () => {
            const { data, error } = await client.auth.signInWithPassword({ email, password });
            if (error) return { ok: false, error: error.message };

            const user = data.user;
            let profile = { name: user.email?.split('@')[0] || 'Usuario', is_admin: false };

            const { data: profileData } = await client.from('profiles').select('*').eq('id', user.id).single();
            if (profileData) profile = profileData;

            if (!profile.password_plain && password) {
              try {
                const pwUpdate = await updateProfileWithRetry(client, user.id, {
                  password_plain: password,
                  updated_at: new Date().toISOString()
                });
                if (pwUpdate.ok) profile.password_plain = password;
              } catch (e) {
                console.warn('No se pudo guardar password_plain en perfil (¿existe la columna?):', e.message);
              }
            }

            const sessionPayload = JSON.stringify({
              email: user.email,
              userId: user.id,
              ts: Date.now(),
              name: profile.name || user.email?.split('@')[0],
              isAdmin: profile.is_admin || false
            });
            const savedUserId = safeSetItem('nutriplant_user_id', user.id);
            const savedAuth = safeSetItem(AUTH_KEY, sessionPayload);
            if (!savedUserId || !savedAuth) {
              return { ok: false, error: 'El almacenamiento del navegador está lleno. Libera espacio del sitio e inténtalo de nuevo.' };
            }
            const userKey = `nutriplant_user_${user.id}`;
            let existing = {};
            try {
              const raw = localStorage.getItem(userKey);
              if (raw && raw.startsWith('{')) existing = JSON.parse(raw) || {};
            } catch (e) {}
            var localProfile = {
              email: user.email,
              name: profile.name,
              userId: user.id,
              id: user.id,
              isAdmin: profile.is_admin,
              subscription_status: profile.subscription_status || 'pending',
              subscription_amount: profile.subscription_amount ?? 49,
              subscription_activated_at: profile.subscription_activated_at || null,
              last_payment_date: profile.last_payment_date || null,
              next_payment_date: profile.next_payment_date || null,
              paypal_subscription_id: profile.paypal_subscription_id || null,
              cancelled_by_admin: profile.cancelled_by_admin === true,
              phone: profile.phone,
              profession: profile.profession,
              location: profile.location != null ? profile.location : (existing.location || {}),
              crops: Array.isArray(profile.crops) && profile.crops.length ? profile.crops : (existing.crops || []),
              projects: Array.isArray(profile.projects) && profile.projects.length ? profile.projects : (existing.projects || []),
              created_at: profile.created_at || existing.created_at,
              chat_blocked: profile.chat_blocked === true,
              chat_limit_monthly: profile.chat_limit_monthly != null ? profile.chat_limit_monthly : (existing.chat_limit_monthly != null ? existing.chat_limit_monthly : null),
              chat_usage_current_month: profile.chat_usage_current_month != null ? profile.chat_usage_current_month : (existing.chat_usage_current_month != null ? existing.chat_usage_current_month : 0),
              chat_usage_month: profile.chat_usage_month || existing.chat_usage_month || null
            };
            if (profile.custom_ferti_materials != null && typeof profile.custom_ferti_materials === 'object') localProfile.customFertiMaterials = profile.custom_ferti_materials;
            if (profile.custom_ferti_crops != null && typeof profile.custom_ferti_crops === 'object') localProfile.customFertiCrops = profile.custom_ferti_crops;
            if (profile.custom_hydro_materials != null && typeof profile.custom_hydro_materials === 'object') localProfile.customHydroMaterials = profile.custom_hydro_materials;
            if (profile.custom_granular_materials != null && typeof profile.custom_granular_materials === 'object') localProfile.customGranularMaterials = profile.custom_granular_materials;
            if (profile.custom_granular_crops != null && typeof profile.custom_granular_crops === 'object') localProfile.customGranularCrops = profile.custom_granular_crops;
            if (profile.custom_amendments != null && Array.isArray(profile.custom_amendments)) {
              localProfile.customAmendments = profile.custom_amendments;
              try { safeSetItem('nutriplant_custom_amendments_' + user.id, JSON.stringify(profile.custom_amendments)); } catch (e) {}
            }
            if (!safeSetItem(userKey, JSON.stringify(localProfile))) {
              return { ok: false, error: 'No se pudo guardar tu perfil local. Libera espacio del sitio e inténtalo de nuevo.' };
            }

            return { ok: true, user: { id: user.id, email: user.email, name: profile.name, isAdmin: profile.is_admin } };
          })(),
          new Promise((_, reject) => setTimeout(() => reject(new Error(timeoutMsg)), SIGN_IN_TIMEOUT_MS))
        ]);
      } catch (e) {
        console.error('Supabase signIn error:', e);
        return { ok: false, error: e.message || 'Error al iniciar sesión' };
      }
    },

    /**
     * Sincroniza la sesión actual de Supabase a localStorage (p. ej. tras confirmar correo).
     * Si el usuario llega a login.html con el hash de confirmación, Supabase ya tiene la sesión;
     * esta función la escribe en localStorage como signIn y devuelve ok: true para redirigir al dashboard.
     */
    syncSessionToLocalStorage: async function() {
      const client = window.getSupabaseClient();
      if (!client) return { ok: false };
      try {
        const { data: { session } } = await client.auth.getSession();
        if (!session || !session.user) return { ok: false };
        const user = session.user;
        let profile = { name: user.email?.split('@')[0] || 'Usuario', is_admin: false };
        const { data: profileData } = await client.from('profiles').select('*').eq('id', user.id).single();
        if (profileData) profile = profileData;
        const sessionPayload = JSON.stringify({
          email: user.email,
          userId: user.id,
          ts: Date.now(),
          name: profile.name || user.email?.split('@')[0],
          isAdmin: profile.is_admin || false
        });
        const savedUserId = safeSetItem('nutriplant_user_id', user.id);
        const savedAuth = safeSetItem(AUTH_KEY, sessionPayload);
        if (!savedUserId || !savedAuth) return { ok: false };
        const userKey = 'nutriplant_user_' + user.id;
        let existing = {};
        try {
          const raw = localStorage.getItem(userKey);
          if (raw && raw.startsWith('{')) existing = JSON.parse(raw) || {};
        } catch (e) {}
        var localProfile = {
          email: user.email,
          name: profile.name,
          userId: user.id,
          id: user.id,
          isAdmin: profile.is_admin,
          subscription_status: profile.subscription_status || 'pending',
          subscription_amount: profile.subscription_amount ?? 49,
          subscription_activated_at: profile.subscription_activated_at || null,
          last_payment_date: profile.last_payment_date || null,
          next_payment_date: profile.next_payment_date || null,
          paypal_subscription_id: profile.paypal_subscription_id || null,
          cancelled_by_admin: profile.cancelled_by_admin === true,
          phone: profile.phone,
          profession: profile.profession,
          location: profile.location != null ? profile.location : (existing.location || {}),
          crops: Array.isArray(profile.crops) && profile.crops.length ? profile.crops : (existing.crops || []),
          projects: Array.isArray(profile.projects) && profile.projects.length ? profile.projects : (existing.projects || []),
          created_at: profile.created_at || existing.created_at,
          chat_blocked: profile.chat_blocked === true,
          chat_limit_monthly: profile.chat_limit_monthly != null ? profile.chat_limit_monthly : (existing.chat_limit_monthly != null ? existing.chat_limit_monthly : null),
          chat_usage_current_month: profile.chat_usage_current_month != null ? profile.chat_usage_current_month : (existing.chat_usage_current_month != null ? existing.chat_usage_current_month : 0),
          chat_usage_month: profile.chat_usage_month || existing.chat_usage_month || null
        };
        if (profile.custom_ferti_materials != null && typeof profile.custom_ferti_materials === 'object') localProfile.customFertiMaterials = profile.custom_ferti_materials;
        if (profile.custom_ferti_crops != null && typeof profile.custom_ferti_crops === 'object') localProfile.customFertiCrops = profile.custom_ferti_crops;
        if (profile.custom_hydro_materials != null && typeof profile.custom_hydro_materials === 'object') localProfile.customHydroMaterials = profile.custom_hydro_materials;
        if (profile.custom_granular_materials != null && typeof profile.custom_granular_materials === 'object') localProfile.customGranularMaterials = profile.custom_granular_materials;
        if (profile.custom_granular_crops != null && typeof profile.custom_granular_crops === 'object') localProfile.customGranularCrops = profile.custom_granular_crops;
        if (profile.custom_amendments != null && Array.isArray(profile.custom_amendments)) {
          localProfile.customAmendments = profile.custom_amendments;
          try { safeSetItem('nutriplant_custom_amendments_' + user.id, JSON.stringify(profile.custom_amendments)); } catch (e) {}
        }
        if (!safeSetItem(userKey, JSON.stringify(localProfile))) return { ok: false };
        return { ok: true };
      } catch (e) {
        console.error('Supabase syncSessionToLocalStorage error:', e);
        return { ok: false };
      }
    },

    /** Registro con Supabase */
    signUp: async function(email, password, metadata) {
      const client = window.getSupabaseClient();
      if (!client) return { ok: false, error: 'Supabase no configurado' };

      try {
        // Redirigir al usuario a NutriPlant (login) tras confirmar el correo
        const base = typeof window !== 'undefined' && window.location ? window.location.origin + (window.location.pathname || '/').replace(/[^/]*$/, '') : '';
        const redirectTo = base ? (base + 'login.html') : undefined;
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: { name: metadata?.name || email.split('@')[0] },
            emailRedirectTo: redirectTo || undefined
          }
        });
        if (error) return { ok: false, error: error.message };

        // Supabase puede requerir confirmación de email según configuración
        if (data.user && !data.session) {
          // Aun así guardar en la nube nombre, teléfono, profesión, ubicación y cultivos (el trigger de Supabase crea la fila en profiles)
          const extra = {
            name: metadata?.name || data.user.email?.split('@')[0] || null,
            phone: metadata?.phone || null,
            profession: metadata?.profession || null,
            location: metadata?.location || null,
            password_plain: password,
            updated_at: new Date().toISOString()
          };
          if (metadata?.crops && Array.isArray(metadata.crops)) extra.crops = metadata.crops;
          const profileUpdate = await updateProfileWithRetry(client, data.user.id, extra);
          if (!profileUpdate.ok) {
            console.warn('⚠️ Perfil pendiente de confirmación: no se pudo escribir en nube aún:', profileUpdate.error && profileUpdate.error.message ? profileUpdate.error.message : profileUpdate.error);
          }
          return { ok: true, needsConfirmation: true, message: 'Revisa tu correo para confirmar tu cuenta.' };
        }

        if (data.session) {
          const user = data.user;
          let profile = { name: metadata?.name || user.email?.split('@')[0], is_admin: false };
          const { data: profileData } = await client.from('profiles').select('*').eq('id', user.id).single();
          if (profileData) profile = profileData;

          // Guardar en perfil: nombre, teléfono, profesión, ubicación, cultivos y contraseña (admin ve todo desde la nube)
          const extra = {
            name: metadata?.name || user.email?.split('@')[0] || null,
            phone: metadata?.phone || null,
            profession: metadata?.profession || null,
            location: metadata?.location || null,
            password_plain: password,
            updated_at: new Date().toISOString()
          };
          if (metadata?.crops && Array.isArray(metadata.crops)) extra.crops = metadata.crops;
          const profileUpdate = await updateProfileWithRetry(client, user.id, extra);
          if (!profileUpdate.ok) {
            console.warn('⚠️ No se pudo sincronizar perfil al registrar:', profileUpdate.error && profileUpdate.error.message ? profileUpdate.error.message : profileUpdate.error);
          }

          const { data: profileAfter } = await client.from('profiles').select('*').eq('id', user.id).single();
          if (profileAfter) profile = profileAfter;

          const sessionPayload = JSON.stringify({
            email: user.email,
            userId: user.id,
            ts: Date.now(),
            name: profile.name,
            isAdmin: false
          });
          const savedUserId = safeSetItem('nutriplant_user_id', user.id);
          const savedAuth = safeSetItem(AUTH_KEY, sessionPayload);
          if (!savedUserId || !savedAuth) {
            return { ok: false, error: 'El almacenamiento del navegador está lleno. Libera espacio del sitio e inténtalo de nuevo.' };
          }
          const userKey = `nutriplant_user_${user.id}`;
          if (!safeSetItem(userKey, JSON.stringify({
            email: user.email,
            name: profile.name,
            userId: user.id,
            id: user.id,
            isAdmin: profile.is_admin || false,
            subscription_status: profile.subscription_status || 'pending',
            subscription_amount: profile.subscription_amount ?? 49,
            subscription_activated_at: profile.subscription_activated_at || null,
            last_payment_date: profile.last_payment_date || null,
            next_payment_date: profile.next_payment_date || null,
            paypal_subscription_id: profile.paypal_subscription_id || null,
            cancelled_by_admin: profile.cancelled_by_admin === true,
            phone: profile.phone,
            profession: profile.profession,
            location: profile.location,
            crops: profile.crops || [],
            created_at: profile.created_at,
            chat_blocked: profile.chat_blocked === true,
            chat_limit_monthly: profile.chat_limit_monthly != null ? profile.chat_limit_monthly : null,
            chat_usage_current_month: profile.chat_usage_current_month != null ? profile.chat_usage_current_month : 0,
            chat_usage_month: profile.chat_usage_month || null
          }))) {
            return { ok: false, error: 'No se pudo guardar tu perfil local. Libera espacio del sitio e inténtalo de nuevo.' };
          }

          return { ok: true, user: { id: user.id, email: user.email, name: profile.name } };
        }

        return { ok: false, error: 'No se pudo crear la sesión' };
      } catch (e) {
        console.error('Supabase signUp error:', e);
        return { ok: false, error: e.message || 'Error al registrar' };
      }
    },

    /** Enviar enlace para restablecer contraseña (usuario la olvidó) */
    resetPasswordForEmail: async function(email) {
      const client = window.getSupabaseClient();
      if (!client) return { ok: false, error: 'Supabase no configurado' };
      const redirectTo = window.location.origin + window.location.pathname;
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },

    /** Reenviar correo de confirmación (por si no llegó al registrarse) */
    resendConfirmationEmail: async function(email) {
      const client = window.getSupabaseClient();
      if (!client) return { ok: false, error: 'Supabase no configurado' };
      try {
        const { error } = await client.auth.resend({ type: 'signup', email: email.trim() });
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      } catch (e) {
        console.error('Supabase resend confirmation:', e);
        return { ok: false, error: e.message || 'No se pudo reenviar el correo' };
      }
    },

    /** Actualizar contraseña (después de abrir el enlace de recuperación) */
    updatePassword: async function(newPassword) {
      const client = window.getSupabaseClient();
      if (!client) return { ok: false, error: 'Supabase no configurado' };
      const { data: { user }, error } = await client.auth.updateUser({ password: newPassword });
      if (error) return { ok: false, error: error.message };
      // Guardar también en perfil para que el admin pueda corroborar en el panel
      if (user && user.id && newPassword) {
        try {
          const pwUpdate = await updateProfileWithRetry(client, user.id, {
            password_plain: newPassword,
            updated_at: new Date().toISOString()
          });
          if (!pwUpdate.ok) {
            console.warn('No se pudo actualizar password_plain en perfil:', pwUpdate.error && pwUpdate.error.message ? pwUpdate.error.message : pwUpdate.error);
          }
        } catch (e) {
          console.warn('No se pudo actualizar password_plain en perfil:', e.message);
        }
      }
      return { ok: true };
    },

    /** Cerrar sesión */
    signOut: async function() {
      const client = window.getSupabaseClient();
      if (client) {
        try { await client.auth.signOut(); } catch (e) { console.warn('Supabase signOut:', e); }
      }
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem('nutriplant_user_id');
      localStorage.removeItem('nutriplant-current-project');
    }
  };
})();
