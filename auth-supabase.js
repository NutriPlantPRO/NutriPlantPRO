/**
 * NutriPlant PRO - Integración con Supabase Auth
 * Se usa cuando supabase-config.js tiene enabled: true y anonKey configurada
 */
(function() {
  'use strict';

  const AUTH_KEY = 'np_user';
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

      try {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) return { ok: false, error: error.message };

        const user = data.user;
        let profile = { name: user.email?.split('@')[0] || 'Usuario', is_admin: false };

        // Obtener perfil de la tabla profiles
        const { data: profileData } = await client.from('profiles').select('*').eq('id', user.id).single();
        if (profileData) profile = profileData;

        // Si el perfil no tiene contraseña guardada (ej. se registraron con confirmación de email),
        // guardarla ahora para que el admin la vea en el panel
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

        // Establecer sesión en formato NutriPlant (localStorage para compatibilidad)
        localStorage.setItem('nutriplant_user_id', user.id);
        localStorage.setItem(AUTH_KEY, JSON.stringify({
          email: user.email,
          userId: user.id,
          ts: Date.now(),
          name: profile.name || user.email?.split('@')[0],
          isAdmin: profile.is_admin || false
        }));
        // Guardar perfil en localStorage (incl. ubicación y catálogos desde la nube para otro dispositivo)
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
          phone: profile.phone,
          profession: profile.profession,
          location: profile.location != null ? profile.location : (existing.location || {}),
          crops: Array.isArray(profile.crops) && profile.crops.length ? profile.crops : (existing.crops || []),
          projects: Array.isArray(profile.projects) && profile.projects.length ? profile.projects : (existing.projects || []),
          created_at: profile.created_at || existing.created_at
        };
        // Catálogos desde Supabase (snake_case) → perfil local (camelCase) para que el usuario los vea en otro dispositivo
        if (profile.custom_ferti_materials != null && typeof profile.custom_ferti_materials === 'object') localProfile.customFertiMaterials = profile.custom_ferti_materials;
        if (profile.custom_ferti_crops != null && typeof profile.custom_ferti_crops === 'object') localProfile.customFertiCrops = profile.custom_ferti_crops;
        if (profile.custom_hydro_materials != null && typeof profile.custom_hydro_materials === 'object') localProfile.customHydroMaterials = profile.custom_hydro_materials;
        if (profile.custom_granular_materials != null && typeof profile.custom_granular_materials === 'object') localProfile.customGranularMaterials = profile.custom_granular_materials;
        if (profile.custom_granular_crops != null && typeof profile.custom_granular_crops === 'object') localProfile.customGranularCrops = profile.custom_granular_crops;
        if (profile.custom_amendments != null && Array.isArray(profile.custom_amendments)) {
          localProfile.customAmendments = profile.custom_amendments;
          try { localStorage.setItem('nutriplant_custom_amendments_' + user.id, JSON.stringify(profile.custom_amendments)); } catch (e) {}
        }
        localStorage.setItem(userKey, JSON.stringify(localProfile));

        return { ok: true, user: { id: user.id, email: user.email, name: profile.name, isAdmin: profile.is_admin } };
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
        localStorage.setItem('nutriplant_user_id', user.id);
        localStorage.setItem(AUTH_KEY, JSON.stringify({
          email: user.email,
          userId: user.id,
          ts: Date.now(),
          name: profile.name || user.email?.split('@')[0],
          isAdmin: profile.is_admin || false
        }));
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
          phone: profile.phone,
          profession: profile.profession,
          location: profile.location != null ? profile.location : (existing.location || {}),
          crops: Array.isArray(profile.crops) && profile.crops.length ? profile.crops : (existing.crops || []),
          projects: Array.isArray(profile.projects) && profile.projects.length ? profile.projects : (existing.projects || []),
          created_at: profile.created_at || existing.created_at
        };
        if (profile.custom_ferti_materials != null && typeof profile.custom_ferti_materials === 'object') localProfile.customFertiMaterials = profile.custom_ferti_materials;
        if (profile.custom_ferti_crops != null && typeof profile.custom_ferti_crops === 'object') localProfile.customFertiCrops = profile.custom_ferti_crops;
        if (profile.custom_hydro_materials != null && typeof profile.custom_hydro_materials === 'object') localProfile.customHydroMaterials = profile.custom_hydro_materials;
        if (profile.custom_granular_materials != null && typeof profile.custom_granular_materials === 'object') localProfile.customGranularMaterials = profile.custom_granular_materials;
        if (profile.custom_granular_crops != null && typeof profile.custom_granular_crops === 'object') localProfile.customGranularCrops = profile.custom_granular_crops;
        if (profile.custom_amendments != null && Array.isArray(profile.custom_amendments)) {
          localProfile.customAmendments = profile.custom_amendments;
          try { localStorage.setItem('nutriplant_custom_amendments_' + user.id, JSON.stringify(profile.custom_amendments)); } catch (e) {}
        }
        localStorage.setItem(userKey, JSON.stringify(localProfile));
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
          // Aun así guardar en la nube teléfono, profesión, ubicación y cultivos (el trigger de Supabase crea la fila en profiles)
          const extra = {
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

          // Guardar en perfil: teléfono, profesión, ubicación, cultivos y contraseña visible para admin
          const extra = {
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

          localStorage.setItem('nutriplant_user_id', user.id);
          localStorage.setItem(AUTH_KEY, JSON.stringify({
            email: user.email,
            userId: user.id,
            ts: Date.now(),
            name: profile.name,
            isAdmin: false
          }));
          const userKey = `nutriplant_user_${user.id}`;
          localStorage.setItem(userKey, JSON.stringify({
            email: user.email,
            name: profile.name,
            userId: user.id,
            id: user.id,
            isAdmin: profile.is_admin || false,
            subscription_status: profile.subscription_status || 'pending',
            subscription_amount: profile.subscription_amount ?? 49,
            phone: profile.phone,
            profession: profile.profession,
            location: profile.location,
            crops: profile.crops || [],
            created_at: profile.created_at
          }));

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
    }
  };
})();
