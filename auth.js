// Guard de sesión (simple para demo)
const AUTH_KEY = "np_user";

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
        // 🔒 VALIDAR SUSCRIPCIÓN: Solo usuarios activos o admin pueden acceder al dashboard
        const userProfile = JSON.parse(userExists);
        const isAdmin = !!(userProfile && (userProfile.isAdmin === true || (userProfile.email || '').toLowerCase() === 'admin@nutriplantpro.com'));
        const status = (userProfile && userProfile.subscription_status) || 'pending';
        if (!isAdmin && status !== 'active') {
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
    const status = (userProfile && userProfile.subscription_status) || 'pending';
    const showActivate = typeof URLSearchParams !== 'undefined' && new URLSearchParams(location.search).get('showActivate') === '1';
    if (!isAdmin && status !== 'active') {
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
    const originalText = submitBtn.innerHTML;
    
    // Mostrar estado de loading
    submitBtn.classList.add('loading');
    submitBtn.innerHTML = `
      <span class="button-text">Iniciando sesión...</span>
      <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
      </svg>
    `;
    
    const data = new FormData(form);
    const email = String(data.get("email") || "").trim();
    const pass = String(data.get("password") || "").trim();
    
    // Validación mejorada
    if (!email || !pass) {
      showError("Por favor, ingresa tu correo electrónico y contraseña.");
      resetButton(submitBtn, originalText);
      return;
    }
    
    if (!isValidEmail(email)) {
      showError("Por favor, ingresa un correo electrónico válido.");
      resetButton(submitBtn, originalText);
      return;
    }
    
    // 🔐 ADMIN: intentar Supabase primero (si está configurado) para que el panel admin cargue datos de la nube
    const ADMIN_ACCESS = { 'admin@nutriplantpro.com': 'npja1502' };
    if (ADMIN_ACCESS[email] && ADMIN_ACCESS[email] === pass) {
      const supabaseAuth = window.nutriplantSupabaseAuth;
      if (supabaseAuth && supabaseAuth.isAvailable && supabaseAuth.isAvailable()) {
        try {
          const result = await supabaseAuth.signIn(email, pass);
          if (result.ok && result.user) {
            // Admin existe en Supabase → sesión lista para cargar datos en el panel admin
            localStorage.removeItem('currentProjectId');
            showSuccess("¡Bienvenido Administrador! Ingresando...");
            setTimeout(() => { location.href = "dashboard.html"; }, 1000);
            return;
          }
        } catch (e) { console.warn('Admin Supabase sign-in falló, usando modo local:', e); }
      }
      // Fallback: admin solo en localStorage (cuando no existe en Supabase)
      const adminUserId = 'admin_' + btoa(email).replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
      const adminUserKey = `nutriplant_user_${adminUserId}`;
      let adminUserData = null;
      try {
        const existingData = localStorage.getItem(adminUserKey);
        if (existingData) adminUserData = JSON.parse(existingData);
      } catch (e) { console.error('Error reading admin user data:', e); }
      if (!adminUserData) {
        adminUserData = { email, name: 'Administrador NutriPlant', userId: adminUserId, password: 'npja1502', isAdmin: true, subscription_status: 'active', subscription_amount: 0, created_at: new Date().toISOString() };
        localStorage.setItem(adminUserKey, JSON.stringify(adminUserData));
        localStorage.setItem(`nutriplant_user_email_${email}`, adminUserId);
      } else {
        adminUserData.isAdmin = true;
        adminUserData.subscription_status = 'active';
        localStorage.setItem(adminUserKey, JSON.stringify(adminUserData));
      }
      localStorage.setItem('nutriplant_user_id', adminUserId);
      localStorage.setItem(AUTH_KEY, JSON.stringify({ email, userId: adminUserId, ts: Date.now(), name: 'Administrador', isAdmin: true }));
      localStorage.removeItem('currentProjectId');
      showSuccess("¡Bienvenido Administrador! Ingresando...");
      setTimeout(() => { location.href = "dashboard.html"; }, 1000);
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
          const status = (profile && profile.subscription_status) || 'pending';
          if (!isAdmin && status !== 'active') {
            // No cerrar sesión: dejar userId para que pueda usar "Activar con PayPal"
            if (typeof window.showSubscriptionInactiveWithPayPalOption === 'function') {
              window.showSubscriptionInactiveWithPayPalOption('Tu suscripción está inactiva. Para volver a usar NutriPlant PRO, activa aquí con PayPal:');
            } else {
              showError("❌ Tu suscripción no está activa. Contacta al administrador para activar tu cuenta.");
            }
            resetButton(submitBtn, originalText);
            return;
          }
          localStorage.removeItem('nutriplant-current-project');
          localStorage.removeItem('currentProjectId');
          const name = result.user?.name || email.split('@')[0];
          showSuccess("¡Bienvenido, " + name + "! Ingresando...");
          setTimeout(() => { location.href = "dashboard.html"; }, 1000);
          return;
        }
        if (result.error && result.error !== 'Supabase no configurado') {
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
      showError("❌ El correo electrónico no está registrado. Por favor, crea una cuenta nueva.");
      resetButton(submitBtn, originalText);
      return;
    }
    
    // 🔒 VALIDAR QUE LA CONTRASEÑA ES CORRECTA
    if (!userFound.password || userFound.password !== pass) {
      showError("❌ Contraseña incorrecta. Por favor, verifica tu contraseña.");
      resetButton(submitBtn, originalText);
      return;
    }
    
    // ✅ USUARIO Y CONTRASEÑA VÁLIDOS - Establecer sesión
    if (!userId) {
      userId = userFound.id || userFound.userId || 'user_' + Date.now();
    }
    
    // 🔒 VALIDAR SUSCRIPCIÓN: Solo usuarios activos o admin pueden acceder
    const isAdminUser = !!(userFound.isAdmin === true || (userFound.email || '').toLowerCase() === 'admin@nutriplantpro.com');
    const subStatus = userFound.subscription_status || 'pending';
    if (!isAdminUser && subStatus !== 'active') {
      // Dejar sesión guardada para que "Activar con PayPal" tenga userId
      const userKey = `nutriplant_user_${userId}`;
      localStorage.setItem(userKey, JSON.stringify(userFound));
      localStorage.setItem('nutriplant_user_id', userId);
      localStorage.setItem(AUTH_KEY, JSON.stringify({
        email, userId, ts: Date.now(), name: userFound.name || email.split('@')[0], isAdmin: false
      }));
      if (typeof window.showSubscriptionInactiveWithPayPalOption === 'function') {
        window.showSubscriptionInactiveWithPayPalOption('Tu suscripción está inactiva. Para volver a usar NutriPlant PRO, activa aquí con PayPal:');
      } else {
        showError("❌ Tu suscripción no está activa. Contacta al administrador para activar tu cuenta.");
      }
      resetButton(submitBtn, originalText);
      return;
    }
    
    // Actualizar último acceso (local y nube)
    const lastLoginIso = new Date().toISOString();
    userFound.last_login = lastLoginIso;
    const userKey = `nutriplant_user_${userId}`;
    localStorage.setItem(userKey, JSON.stringify(userFound));
    if (typeof window.getSupabaseClient === 'function') {
      const client = window.getSupabaseClient();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(userId));
      if (client && isUuid) {
        client.from('profiles').update({ last_login: lastLoginIso }).eq('id', userId).then((r) => { if (r.error) console.warn('last_login en nube:', r.error.message); });
      }
    }
    
    // Establecer userId en localStorage
    localStorage.setItem('nutriplant_user_id', userId);
    
    // Guardar sesión
    localStorage.setItem(AUTH_KEY, JSON.stringify({ 
      email, 
      userId: userId,
      ts: Date.now(),
      name: userFound.name || email.split('@')[0],
      isAdmin: userFound.isAdmin || false
    }));
    
    // Limpiar proyecto actual al hacer login
    localStorage.removeItem('nutriplant-current-project');
    localStorage.removeItem('currentProjectId');
    
    // Mostrar mensaje de éxito antes de redirigir
    const userName = userFound.name || email.split('@')[0];
    showSuccess("¡Bienvenido, " + userName + "! Ingresando...");
    
    // Redirigir después de un breve delay
    setTimeout(() => {
      location.href = "dashboard.html";
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
