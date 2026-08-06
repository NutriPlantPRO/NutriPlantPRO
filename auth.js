// Guard de sesión (simple para demo)
const AUTH_KEY = "np_user";

function authT(key, fallback, params) {
  try {
    if (window.NpI18n && typeof window.NpI18n.t === "function") {
      var v = window.NpI18n.t(key, params);
      if (v && v !== key) return v;
    }
  } catch (e) {}
  if (fallback && params) {
    return String(fallback).replace(/\{([A-Za-z0-9_]+)\}/g, function (m, n) {
      return params[n] !== undefined ? String(params[n]) : m;
    });
  }
  return fallback != null ? fallback : key;
}
const LOGIN_GUARD_KEY = 'np_login_guard_v1';
const LOGIN_THROTTLE_MS = 3000;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_FAILS = 6;
const LOGIN_LOCK_MS = 10 * 60 * 1000;

function npRelieveLoginStoragePressure() {
  try {
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

function npSafeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e && e.name === 'QuotaExceededError') {
      npRelieveLoginStoragePressure();
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (retryErr) {
        return false;
      }
    }
    return false;
  }
}

async function npApplyLocalAuthPreferences(profile) {
  if (!profile || typeof profile !== 'object') return profile;
  let prefsApi = window.NpPrefs || null;
  if (!prefsApi && typeof window.npEnsurePrefs === 'function') {
    try { prefsApi = await window.npEnsurePrefs(); } catch (e) {}
  }
  let resolved = {
    language: profile.language === 'en' ? 'en' : 'es',
    unit_system: profile.unit_system === 'us_customary' ? 'us_customary' : 'metric',
    locale: profile.locale === null || typeof profile.locale === 'string' ? profile.locale : null
  };
  if (prefsApi && typeof prefsApi.resolve === 'function') {
    resolved = prefsApi.resolve(profile);
  }
  profile.language = resolved.language;
  profile.unit_system = resolved.unit_system;
  profile.locale = resolved.locale;
  return profile;
}

function readLoginGuardState() {
  try {
    const raw = localStorage.getItem(LOGIN_GUARD_KEY);
    if (!raw) return { fails: [], lockedUntil: 0, lastAttemptAt: 0 };
    const parsed = JSON.parse(raw);
    return {
      fails: Array.isArray(parsed.fails) ? parsed.fails.filter(Number.isFinite) : [],
      lockedUntil: Number.isFinite(parsed.lockedUntil) ? parsed.lockedUntil : 0,
      lastAttemptAt: Number.isFinite(parsed.lastAttemptAt) ? parsed.lastAttemptAt : 0
    };
  } catch (e) {
    return { fails: [], lockedUntil: 0, lastAttemptAt: 0 };
  }
}

function writeLoginGuardState(state) {
  try { localStorage.setItem(LOGIN_GUARD_KEY, JSON.stringify(state)); } catch (e) {}
}

function registerLoginFailure() {
  const now = Date.now();
  const state = readLoginGuardState();
  const fails = (state.fails || []).filter((ts) => (now - ts) <= LOGIN_WINDOW_MS);
  fails.push(now);
  const next = {
    fails,
    lastAttemptAt: state.lastAttemptAt || 0,
    lockedUntil: fails.length >= LOGIN_MAX_FAILS ? (now + LOGIN_LOCK_MS) : (state.lockedUntil || 0)
  };
  writeLoginGuardState(next);
  return next;
}

function clearLoginFailures() {
  writeLoginGuardState({ fails: [], lockedUntil: 0, lastAttemptAt: Date.now() });
}

function checkLoginGuardBeforeAttempt() {
  const now = Date.now();
  const state = readLoginGuardState();
  const remLock = Math.max(0, (state.lockedUntil || 0) - now);
  if (remLock > 0) {
    return { blocked: true, reason: authT("auth.err_too_many_attempts", "Demasiados intentos fallidos. Espera {seconds}s e intenta de nuevo.", { seconds: Math.ceil(remLock / 1000) }) };
  }
  const remThrottle = Math.max(0, LOGIN_THROTTLE_MS - (now - (state.lastAttemptAt || 0)));
  if (remThrottle > 0) {
    return { blocked: true, reason: authT("auth.err_throttle", "Espera {seconds}s antes de intentar nuevamente.", { seconds: Math.ceil(remThrottle / 1000) }) };
  }
  writeLoginGuardState({
    fails: (state.fails || []).filter((ts) => (now - ts) <= LOGIN_WINDOW_MS),
    lockedUntil: state.lockedUntil || 0,
    lastAttemptAt: now
  });
  return { blocked: false };
}

/** true = puede entrar al panel. Admin siempre; active siempre; cancelled por PayPal = hasta next_payment_date; cancelled por admin = no. */
function hasSubscriptionAccess(profile) {
  if (!profile) return false;
  if (profile.isAdmin === true || (profile.email || '').toLowerCase() === 'admin@nutriplantpro.com') return true;
  const status = (profile.subscription_status || 'pending');
  if (status === 'active') return true;
  if (status !== 'cancelled') return false;
  if (profile.cancelled_by_admin === true) return false;
  const next = profile.next_payment_date;
  if (!next) return false;
  const endOfPeriod = new Date(next);
  endOfPeriod.setHours(23, 59, 59, 999);
  return new Date() <= endOfPeriod;
}

/**
 * Tras login en login.html: destino si la URL trae ?next= (lista cerrada, sin open redirect).
 */
function npGetSafeLoginNextUrl() {
  var allowed = {
    'dashboard.html': true,
    'planpro/': true,
    'planpro/index.html': true,
    'admin/index.html': true,
    'admin/airci.html': true,
    'airCI': true,
    'airci': true
  };
  try {
    var p = new URLSearchParams(window.location.search);
    var next = (p.get('next') || '').trim();
    if (next.charAt(0) === '/') next = next.slice(1);
    if (allowed[next]) {
      if (next === 'airCI' || next === 'airci') return 'admin/airci.html';
      return next;
    }
  } catch (e) {}
  return 'dashboard.html';
}
window.npGetSafeLoginNextUrl = npGetSafeLoginNextUrl;

/** Solo tu correo dueño: tras contraseña válida, elegir NutriPlant PRO / Admin / Plan PRO / AirCI. */
var NP_OWNER_ADMIN_EMAIL = 'admin@nutriplantpro.com';
var NP_ADMIN_PANEL_URL = 'admin/index.html?k=np_admin_key_8f4a2b9c1e7d';
var NP_PLANPRO_PANEL_URL = 'planpro/?k=np_planpro_key_4a7f2e9b1c6d';
var NP_AIRCI_PANEL_URL = 'admin/airci.html';

function npIsOwnerAdminEmail(email) {
  return String(email || '').trim().toLowerCase() === NP_OWNER_ADMIN_EMAIL;
}

function npMarkOwnerAdminSession() {
  try {
    localStorage.setItem('admin_logged_in', 'true');
    localStorage.setItem('admin_username', NP_OWNER_ADMIN_EMAIL);
    localStorage.setItem('admin_session_timestamp', Date.now().toString());
  } catch (e) {}
}

function npShowAdminDestinationChooser() {
  var modal = document.getElementById('adminDestinationModal');
  if (!modal) {
    location.href = 'dashboard.html';
    return;
  }
  modal.classList.add('is-open');
  modal.style.display = 'flex';
}

function npHideAdminDestinationChooser() {
  var modal = document.getElementById('adminDestinationModal');
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.style.display = 'none';
}

function npGoAdminDestination(dest) {
  dest = String(dest || '').trim().toLowerCase();
  if (dest === 'dashboard' || dest === 'pro' || dest === 'nutriplant') {
    location.href = 'dashboard.html';
    return;
  }
  if (dest === 'admin') {
    npMarkOwnerAdminSession();
    location.href = NP_ADMIN_PANEL_URL;
    return;
  }
  if (dest === 'planpro' || dest === 'plan_pro' || dest === 'plan-pro') {
    location.href = NP_PLANPRO_PANEL_URL;
    return;
  }
  if (dest === 'airci' || dest === 'air_ci' || dest === 'air-ci') {
    npMarkOwnerAdminSession();
    location.href = NP_AIRCI_PANEL_URL;
    return;
  }
}

/** Si es admin@… muestra el chooser y no redirige solo; si hay ?next= válido, respeta next. */
function npAfterOwnerAdminAuthenticated(email, submitBtn, originalText) {
  if (!npIsOwnerAdminEmail(email)) return false;
  clearLoginFailures();
  showSuccess(authT('auth.welcome_admin', '¡Bienvenido Administrador! Elige a dónde entrar…'));
  if (submitBtn && originalText) resetButton(submitBtn, originalText);
  try {
    var p = new URLSearchParams(window.location.search);
    var next = (p.get('next') || '').trim();
    if (next) {
      setTimeout(function () {
        location.href = npGetSafeLoginNextUrl();
      }, 600);
      return true;
    }
  } catch (e) {}
  npShowAdminDestinationChooser();
  return true;
}

(function wireAdminDestinationChooser() {
  function onReady() {
    var modal = document.getElementById('adminDestinationModal');
    if (!modal || modal.dataset.wired === '1') return;
    modal.dataset.wired = '1';
    modal.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('[data-admin-dest]') : null;
      if (!btn) return;
      npGoAdminDestination(btn.getAttribute('data-admin-dest'));
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }
})();

window.npShowAdminDestinationChooser = npShowAdminDestinationChooser;
window.npGoAdminDestination = npGoAdminDestination;
window.npIsOwnerAdminEmail = npIsOwnerAdminEmail;

// Si estamos en dashboard y no hay sesión, redirige a login:
if (location.pathname.endsWith("dashboard.html") && !localStorage.getItem(AUTH_KEY)) {
  location.href = "login.html";
}

// 🔒 VALIDAR QUE EL USUARIO EXISTE AL CARGAR EL DASHBOARD
if (location.pathname.endsWith("dashboard.html")) {
  const authData = localStorage.getItem(AUTH_KEY);
  const userId = localStorage.getItem('nutriplant_user_id');
  
  if (authData && userId) {
    try {
      const session = JSON.parse(authData);
      const userKey = `nutriplant_user_${userId}`;
      const userExists = localStorage.getItem(userKey);
      
      if (!userExists) {
        console.error('❌ Usuario no encontrado - limpiando sesión y redirigiendo');
        localStorage.removeItem(AUTH_KEY);
        localStorage.removeItem('nutriplant_user_id');
        alert('❌ Tu sesión ha expirado o el usuario no existe. Por favor, inicia sesión nuevamente.');
        location.href = "login.html";
      } else {
        // 🔒 VALIDAR SUSCRIPCIÓN: activos, admin, o cancelados por PayPal hasta fin de ciclo
        const userProfile = JSON.parse(userExists);
        if (!hasSubscriptionAccess(userProfile)) {
          alert('❌ Tu suscripción no está activa. Activa con PayPal para entrar al panel.');
          location.href = "login.html?showActivate=1";
        }
      }
    } catch (e) {
      console.error('Error validando sesión:', e);
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem('nutriplant_user_id');
      location.href = "login.html";
    }
  }
}

// En login NO auto-redirigimos a dashboard.
// Si hay sesión pendiente (no activa), la mantenemos cuando viene showActivate=1 para mostrar "Activar con PayPal".
if (location.pathname.endsWith("login.html") && localStorage.getItem(AUTH_KEY)) {
  try {
    const sessionRaw = localStorage.getItem(AUTH_KEY);
    const session = sessionRaw ? JSON.parse(sessionRaw) : null;
    const userId = session && session.userId ? session.userId : localStorage.getItem('nutriplant_user_id');
    const userKey = userId ? `nutriplant_user_${userId}` : null;
    const userRaw = userKey ? localStorage.getItem(userKey) : null;
    const userProfile = userRaw ? JSON.parse(userRaw) : null;
    const isAdmin = !!(session && session.isAdmin) || !!(userProfile && (userProfile.isAdmin === true || (userProfile.email || '').toLowerCase() === 'admin@nutriplantpro.com'));
    const showActivate = typeof URLSearchParams !== 'undefined' && new URLSearchParams(location.search).get('showActivate') === '1';
    if (!hasSubscriptionAccess(userProfile || {})) {
      if (!showActivate) {
        localStorage.removeItem(AUTH_KEY);
        localStorage.removeItem('nutriplant_user_id');
      }
    }
  } catch (e) {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem('nutriplant_user_id');
  }
}

// Manejo del formulario de login (demo: valida que no estén vacíos)
const form = document.getElementById("loginForm");
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const submitBtn = form.querySelector('.auth-button');
    if (submitBtn && submitBtn.disabled) return;
    const originalText = submitBtn.innerHTML;
    const loginGuard = checkLoginGuardBeforeAttempt();
    if (loginGuard.blocked) {
      showError('⏳ ' + loginGuard.reason);
      return;
    }
    
    // Mostrar estado de loading
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    submitBtn.innerHTML = `
      <span class="button-text">${authT('auth.signing_in', 'Iniciando sesión...')}</span>
      <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
      </svg>
    `;
    
    const data = new FormData(form);
    const email = String(data.get("email") || "").trim();
    const pass = String(data.get("password") || "").trim();
    
    // Validación mejorada
    if (!email || !pass) {
      showError(authT("auth.err_email_pass", "Por favor, ingresa tu correo electrónico y contraseña."));
      resetButton(submitBtn, originalText);
      return;
    }
    
    if (!isValidEmail(email)) {
      showError(authT("auth.err_email_invalid", "Por favor, ingresa un correo electrónico válido."));
      resetButton(submitBtn, originalText);
      return;
    }
    
    // 🔐 ADMIN: intentar Supabase primero (si está configurado) para que el panel admin cargue datos de la nube
    const ADMIN_ACCESS = { 'admin@nutriplantpro.com': 'npja1502' };
    const emailNorm = email.toLowerCase();
    if (ADMIN_ACCESS[emailNorm] && ADMIN_ACCESS[emailNorm] === pass) {
      const supabaseAuth = window.nutriplantSupabaseAuth;
      if (supabaseAuth && supabaseAuth.isAvailable && supabaseAuth.isAvailable()) {
        try {
          const result = await supabaseAuth.signIn(emailNorm, pass);
          if (result.ok && result.user) {
            // Admin existe en Supabase → sesión lista; dueño elige destino
            localStorage.removeItem('currentProjectId');
            if (npAfterOwnerAdminAuthenticated(emailNorm, submitBtn, originalText)) return;
            showSuccess(authT("auth.welcome_admin", "¡Bienvenido Administrador! Ingresando..."));
            setTimeout(() => { location.href = npGetSafeLoginNextUrl(); }, 1000);
            return;
          }
        } catch (e) { console.warn('Admin Supabase sign-in falló, usando modo local:', e); }
      }
      // Fallback: admin solo en localStorage (cuando no existe en Supabase)
      const adminUserId = 'admin_' + btoa(emailNorm).replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
      const adminUserKey = `nutriplant_user_${adminUserId}`;
      let adminUserData = null;
      try {
        const existingData = localStorage.getItem(adminUserKey);
        if (existingData) adminUserData = JSON.parse(existingData);
      } catch (e) { console.error('Error reading admin user data:', e); }
      if (!adminUserData) {
        adminUserData = { email: emailNorm, name: 'Administrador NutriPlant', userId: adminUserId, password: 'npja1502', isAdmin: true, subscription_status: 'active', subscription_amount: 0, created_at: new Date().toISOString() };
        await npApplyLocalAuthPreferences(adminUserData);
        if (!npSafeSetItem(adminUserKey, JSON.stringify(adminUserData)) || !npSafeSetItem(`nutriplant_user_email_${emailNorm}`, adminUserId)) {
          showError(authT("auth.err_storage_full", "❌ El almacenamiento del navegador está lleno. Libera espacio del sitio e intenta de nuevo."));
          resetButton(submitBtn, originalText);
          return;
        }
      } else {
        adminUserData.isAdmin = true;
        adminUserData.subscription_status = 'active';
        await npApplyLocalAuthPreferences(adminUserData);
        if (!npSafeSetItem(adminUserKey, JSON.stringify(adminUserData))) {
          showError(authT("auth.err_storage_full", "❌ El almacenamiento del navegador está lleno. Libera espacio del sitio e intenta de nuevo."));
          resetButton(submitBtn, originalText);
          return;
        }
      }
      if (!npSafeSetItem('nutriplant_user_id', adminUserId) ||
          !npSafeSetItem(AUTH_KEY, JSON.stringify({ email: emailNorm, userId: adminUserId, ts: Date.now(), name: 'Administrador', isAdmin: true }))) {
        showError(authT("auth.err_storage_full", "❌ El almacenamiento del navegador está lleno. Libera espacio del sitio e intenta de nuevo."));
        resetButton(submitBtn, originalText);
        return;
      }
      localStorage.removeItem('currentProjectId');
      if (npAfterOwnerAdminAuthenticated(emailNorm, submitBtn, originalText)) return;
      showSuccess(authT("auth.welcome_admin", "¡Bienvenido Administrador! Ingresando..."));
      setTimeout(() => { location.href = npGetSafeLoginNextUrl(); }, 1000);
      return;
    }
    
    // 🌐 INTENTAR LOGIN CON SUPABASE (nube) para usuarios registrados
    const supabaseAuth = window.nutriplantSupabaseAuth;
    if (supabaseAuth && supabaseAuth.isAvailable && supabaseAuth.isAvailable()) {
      try {
        const result = await supabaseAuth.signIn(email, pass);
        if (result.ok) {
          const userId = localStorage.getItem('nutriplant_user_id');
          const userKey = userId ? `nutriplant_user_${userId}` : null;
          const userRaw = userKey ? localStorage.getItem(userKey) : null;
          let profile = null;
          try { if (userRaw) profile = JSON.parse(userRaw); } catch (e) {}
          const isAdmin = !!(profile && (profile.isAdmin === true || (profile.email || '').toLowerCase() === 'admin@nutriplantpro.com'));
          if (!hasSubscriptionAccess(profile || {})) {
            // No cerrar sesión: dejar userId para que pueda usar "Activar con PayPal"
            if (typeof window.showSubscriptionInactiveWithPayPalOption === 'function') {
              window.showSubscriptionInactiveWithPayPalOption('Tu suscripción está inactiva. Para volver a usar NutriPlant PRO, activa aquí con PayPal:');
            } else {
              showError(authT("auth.err_sub_inactive", "❌ Tu suscripción no está activa. Contacta al administrador para activar tu cuenta."));
            }
            resetButton(submitBtn, originalText);
            return;
          }
          localStorage.removeItem('nutriplant-current-project');
          localStorage.removeItem('currentProjectId');
          if (npAfterOwnerAdminAuthenticated(email.toLowerCase(), submitBtn, originalText)) return;
          const name = result.user?.name || email.split('@')[0];
          clearLoginFailures();
          showSuccess(authT("auth.welcome_user", "¡Bienvenido, {name}! Ingresando...", { name: name }));
          setTimeout(() => { location.href = npGetSafeLoginNextUrl(); }, 1000);
          return;
        }
        if (result.error && result.error !== 'Supabase no configurado') {
          registerLoginFailure();
          showError(result.error);
          resetButton(submitBtn, originalText);
          return;
        }
      } catch (e) {
        console.warn('Supabase login falló, intentando localStorage:', e);
      }
    }
    
    // 🔐 VALIDAR USUARIOS EN LOCALSTORAGE (usuarios antiguos, no en Supabase)
    let userFound = null;
    let userId = null;
    
    // Buscar usuario por email en localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('nutriplant_user_')) {
        try {
          const userData = localStorage.getItem(key);
          if (userData && (userData.startsWith('{') || userData.startsWith('['))) {
            const user = JSON.parse(userData);
            // Verificar si el email coincide
            if (user.email && user.email.toLowerCase() === email.toLowerCase()) {
              userFound = user;
              userId = user.id || user.userId || key.replace('nutriplant_user_', '');
              break;
            }
          }
        } catch (e) {
          // Continuar buscando si hay error de parseo
          continue;
        }
      }
    }
    
    // Si no se encontró el usuario, buscar por clave de email
    if (!userFound) {
      const emailKey = `nutriplant_user_email_${email.toLowerCase()}`;
      const userIdFromEmail = localStorage.getItem(emailKey);
      if (userIdFromEmail) {
        const userKey = `nutriplant_user_${userIdFromEmail}`;
        try {
          const userData = localStorage.getItem(userKey);
          if (userData) {
            userFound = JSON.parse(userData);
            userId = userIdFromEmail;
          }
        } catch (e) {
          console.error('Error cargando usuario desde email key:', e);
        }
      }
    }
    
    // 🔒 VALIDAR QUE EL USUARIO EXISTE
    if (!userFound) {
      registerLoginFailure();
      showError(authT("auth.err_email_unregistered", "❌ El correo electrónico no está registrado. Por favor, crea una cuenta nueva."));
      resetButton(submitBtn, originalText);
      return;
    }
    
    // 🔒 VALIDAR QUE LA CONTRASEÑA ES CORRECTA
    if (!userFound.password || userFound.password !== pass) {
      registerLoginFailure();
      showError(authT("auth.err_bad_password", "❌ Contraseña incorrecta. Por favor, verifica tu contraseña."));
      resetButton(submitBtn, originalText);
      return;
    }

    // Resolver selección explícita contra el perfil local y persistir el resultado.
    await npApplyLocalAuthPreferences(userFound);
    
    // ✅ USUARIO Y CONTRASEÑA VÁLIDOS - Establecer sesión
    if (!userId) {
      userId = userFound.id || userFound.userId || 'user_' + Date.now();
    }
    
    // 🔒 VALIDAR SUSCRIPCIÓN: activos, admin, o cancelados por PayPal hasta fin de ciclo
    if (!hasSubscriptionAccess(userFound)) {
      // Dejar sesión guardada para que "Activar con PayPal" tenga userId
      const userKey = `nutriplant_user_${userId}`;
      const okProfile = npSafeSetItem(userKey, JSON.stringify(userFound));
      const okUserId = npSafeSetItem('nutriplant_user_id', userId);
      const okAuth = npSafeSetItem(AUTH_KEY, JSON.stringify({
        email, userId, ts: Date.now(), name: userFound.name || email.split('@')[0], isAdmin: false
      }));
      if (!okProfile || !okUserId || !okAuth) {
        showError(authT("auth.err_storage_full", "❌ El almacenamiento del navegador está lleno. Libera espacio del sitio e intenta de nuevo."));
        resetButton(submitBtn, originalText);
        return;
      }
      if (typeof window.showSubscriptionInactiveWithPayPalOption === 'function') {
        window.showSubscriptionInactiveWithPayPalOption('Tu suscripción está inactiva. Para volver a usar NutriPlant PRO, activa aquí con PayPal:');
      } else {
        showError(authT("auth.err_sub_inactive", "❌ Tu suscripción no está activa. Contacta al administrador para activar tu cuenta."));
      }
      resetButton(submitBtn, originalText);
      return;
    }
    
    // Actualizar último acceso (local y nube)
    const lastLoginIso = new Date().toISOString();
    userFound.last_login = lastLoginIso;
    const userKey = `nutriplant_user_${userId}`;
    if (!npSafeSetItem(userKey, JSON.stringify(userFound))) {
      showError(authT("auth.err_storage_full", "❌ El almacenamiento del navegador está lleno. Libera espacio del sitio e intenta de nuevo."));
      resetButton(submitBtn, originalText);
      return;
    }
    if (typeof window.getSupabaseClient === 'function') {
      const client = window.getSupabaseClient();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(userId));
      if (client && isUuid) {
        client.from('profiles').update({ last_login: lastLoginIso }).eq('id', userId).then((r) => { if (r.error) console.warn('last_login en nube:', r.error.message); });
      }
    }
    
    // Establecer userId en localStorage
    if (!npSafeSetItem('nutriplant_user_id', userId)) {
      showError(authT("auth.err_storage_full", "❌ El almacenamiento del navegador está lleno. Libera espacio del sitio e intenta de nuevo."));
      resetButton(submitBtn, originalText);
      return;
    }
    
    // Guardar sesión
    if (!npSafeSetItem(AUTH_KEY, JSON.stringify({ 
      email, 
      userId: userId,
      ts: Date.now(),
      name: userFound.name || email.split('@')[0],
      isAdmin: userFound.isAdmin || false
    }))) {
      showError(authT("auth.err_storage_full", "❌ El almacenamiento del navegador está lleno. Libera espacio del sitio e intenta de nuevo."));
      resetButton(submitBtn, originalText);
      return;
    }
    
    // Limpiar proyecto actual al hacer login
    localStorage.removeItem('nutriplant-current-project');
    localStorage.removeItem('currentProjectId');
    
    if (npAfterOwnerAdminAuthenticated(email.toLowerCase(), submitBtn, originalText)) return;

    // Mostrar mensaje de éxito antes de redirigir
    const userName = userFound.name || email.split('@')[0];
    clearLoginFailures();
    showSuccess(authT("auth.welcome_user", "¡Bienvenido, {name}! Ingresando...", { name: userName }));
    
    // Redirigir después de un breve delay
    setTimeout(() => {
      location.href = npGetSafeLoginNextUrl();
    }, 1000);
  });
  
  // Agregar efectos visuales a los inputs
  const inputs = form.querySelectorAll('.form-input');
  inputs.forEach(input => {
    input.addEventListener('focus', () => {
      input.parentElement.classList.add('focused');
    });
    
    input.addEventListener('blur', () => {
      input.parentElement.classList.remove('focused');
      validateInput(input);
    });
    
    input.addEventListener('input', () => {
      if (input.classList.contains('error')) {
        input.classList.remove('error');
      }
    });
  });
}

// Función para validar email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Función para validar input individual
function validateInput(input) {
  const value = input.value.trim();
  
  if (input.type === 'email' && value && !isValidEmail(value)) {
    input.classList.add('error');
    return false;
  }
  
  if (input.required && !value) {
    input.classList.add('error');
    return false;
  }
  
  input.classList.remove('error');
  return true;
}

// Función para mostrar errores
function showError(message) {
  // Crear o actualizar mensaje de error
  let errorDiv = document.querySelector('.auth-error');
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.className = 'auth-error';
    errorDiv.style.cssText = `
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 14px;
      text-align: center;
      animation: slideInDown 0.3s ease-out;
    `;
    
    const form = document.getElementById("loginForm");
    form.insertBefore(errorDiv, form.firstChild);
  }
  
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  
  // Auto-ocultar después de 5 segundos
  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 5000);
}

// Función para mostrar mensajes de éxito
function showSuccess(message) {
  // Crear o actualizar mensaje de éxito
  let successDiv = document.querySelector('.auth-success');
  if (!successDiv) {
    successDiv = document.createElement('div');
    successDiv.className = 'auth-success';
    successDiv.style.cssText = `
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #16a34a;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 14px;
      text-align: center;
      animation: slideInDown 0.3s ease-out;
    `;
    
    const form = document.getElementById("loginForm");
    form.insertBefore(successDiv, form.firstChild);
  }
  
  successDiv.textContent = message;
  successDiv.style.display = 'block';
}

// Función para resetear el botón
function resetButton(button, originalHTML) {
  if (button) button.disabled = false;
  button.classList.remove('loading');
  button.innerHTML = originalHTML;
}

// Logout
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    const supabaseAuth = window.nutriplantSupabaseAuth;
    if (supabaseAuth && supabaseAuth.signOut) await supabaseAuth.signOut();
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem('nutriplant_user_id');
    localStorage.removeItem('nutriplant-current-project');
    location.href = "login.html";
  });
}

// Agregar estilos CSS para las animaciones
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .form-group.focused .form-label {
    color: var(--brand-primary);
  }
  
  .auth-error, .auth-success {
    margin-bottom: 20px;
  }
`;
document.head.appendChild(style);
