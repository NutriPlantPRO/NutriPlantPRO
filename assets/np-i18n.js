/**
 * NutriPlant — traducciones ligeras para páginas estáticas.
 */
(function (root, factory) {
  'use strict';
  var api = factory(root || {});
  if (root) root.NpI18n = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis, function (w) {
  'use strict';

  var catalogs = {
    es: {
      common: { save: 'Guardar', cancel: 'Cancelar', loading: 'Cargando…' },
      auth: {
        document_title: 'NutriPlant PRO — Iniciar sesión',
        login_title: 'Iniciar sesión',
        tagline: 'Diseña, ajusta y nutre con criterio técnico',
        preferences: 'Preferencias',
        manual: 'Manual Técnico',
        manual_aria: 'Manual técnico público',
        contact_us: 'Contáctanos:',
        email: 'Correo electrónico',
        email_placeholder: 'tu@correo.com',
        password: 'Contraseña',
        login_action: 'Entrar',
        forgot_password: '¿Olvidaste tu contraseña?',
        recovery_title: 'Define tu nueva contraseña',
        new_password: 'Nueva contraseña',
        recovery_action: 'Guardar y entrar',
        recovery_intro: 'Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.',
        send_link: 'Enviar enlace',
        resend_title: 'Reenviar correo de confirmación',
        resend_intro: 'Si te registraste y no te llegó el correo para confirmar tu cuenta, ingresa tu correo y te lo reenviamos. Revisa también spam o correo no deseado.',
        resend_action: 'Reenviar correo',
        no_account: '¿No tienes cuenta?',
        register_link: 'Crear cuenta',
        register_title: 'Crear cuenta',
        register_closed_title: 'Registro temporalmente cerrado',
        register_closed_body: 'Estamos preparando todo. Mientras tanto, puedes usar todas las calculadoras gratis en esta misma página — no necesitas cuenta.',
        close: 'Cerrar',
        close_dialog: 'Cerrar ventana',
        step_information: 'Información',
        step_profession: 'Profesión',
        step_password: 'Contraseña',
        step_subscription: 'Suscripción',
        step1_title: '📋 Paso 1: Información Personal',
        step2_title: '💼 Paso 2: Profesión y Cultivos',
        step3_title: '🔐 Paso 3: Contraseña',
        step4_title: '💳 Paso 4: Suscripción',
        name: 'Nombre completo',
        first_and_last_name: 'Nombre y apellido',
        first_name: 'Nombre',
        last_name: 'Apellido',
        phone: 'Teléfono',
        custom_code: 'Código',
        phone_number: 'Número de teléfono',
        location: 'Ubicación',
        country: 'País',
        state: 'Estado/Provincia',
        city: 'Ciudad',
        postal_code: 'Código Postal (ZIP)',
        profession: 'Profesión',
        select_profession: 'Selecciona una profesión',
        profession_agronomist: 'Agrónomo',
        profession_agricultural_engineer: 'Ingeniero Agrónomo',
        profession_agricultural_technician: 'Técnico Agrícola',
        profession_grower: 'Productor',
        profession_consultant: 'Asesor',
        profession_researcher: 'Investigador',
        profession_student: 'Estudiante',
        other: 'Otro',
        crops_interest: 'Cultivos de Interés',
        select_crop_help: 'Selecciona al menos un cultivo',
        crop_avocado: '🥑 Aguacate',
        crop_tomato: '🍅 Tomate',
        crop_pepper: '🌶️ Pimiento',
        crop_cucumber: '🥒 Pepino',
        crop_strawberry: '🍓 Fresa',
        crop_lettuce: '🥬 Lechuga',
        crop_citrus: '🍊 Cítricos',
        crop_grape: '🍇 Uva',
        crop_corn: '🌽 Maíz',
        crop_other: '🌾 Otro',
        confirm_password: 'Confirmar contraseña',
        password_help: 'Mínimo 6 caracteres',
        password_mismatch: 'Las contraseñas no coinciden',
        next: 'Siguiente →',
        previous: '← Anterior',
        subscription_full_access: '✨ Acceso Completo a NutriPlant PRO',
        subscription_intro: 'Activa tu suscripción para acceder a todas las funcionalidades de NutriPlant PRO:',
        feature_soil: '📊 Análisis completo de suelos y enmiendas',
        feature_nutrition: '🌱 Programas de nutrición granular y fertirriego',
        feature_water: '💧 Análisis de agua y extractos',
        feature_ai: '🤖 Asistente de IA especializado en agronomía',
        feature_projects: '📋 Gestión ilimitada de proyectos',
        feature_chat: '💬 Chat con experto agronómico',
        every_five_months: 'cada 5 meses',
        secure_payment: 'Pago seguro con',
        trial_cancel: '10 días de prueba gratis. Puedes cancelar en cualquier momento desde tu cuenta de PayPal → Suscripciones.',
        activate_paypal: 'Activar suscripción ahora con PayPal',
        paypal_required: 'La suscripción con PayPal es obligatoria para crear cuenta.',
        paypal_redirect: 'Serás redirigido a PayPal para completar el pago seguro',
        subscription_summary: 'Resumen: $49 USD cada 5 meses · 10 días de prueba gratis · Cancela cuando quieras desde PayPal → Suscripciones.',
        login_subscription: 'Suscripción: $49 USD cada 5 meses. Cancela cuando quieras desde PayPal.',
        login_trial: 'Activa la suscripción para comenzar tu prueba gratuita de 10 días. Puedes cancelar antes de que termine el periodo y no se realizará ningún cargo.',
        welcome_title: '¡Bienvenido a NutriPlant PRO!',
        welcome_active: 'Tu cuenta y suscripción están activas. Inicia sesión con tu correo y contraseña.',
        welcome_subscription: 'Tu suscripción es de $49 USD cada 5 meses. Puedes cancelarla cuando quieras desde PayPal.',
        welcome_redirect: 'Redirigiendo al panel en unos segundos… Si no eres redirigido, usa el formulario de abajo.',
        required_step1: 'Por favor, completa todos los campos obligatorios del Paso 1.',
        invalid_email: 'Por favor, ingresa un correo electrónico válido.',
        profession_required: 'Por favor, selecciona una profesión.',
        crop_required: 'Por favor, selecciona al menos un cultivo de interés.',
        password_length_error: 'La contraseña debe tener al menos 6 caracteres.',
        resend_unavailable: 'Reenvío de correo no disponible. Contáctanos: admin@nutriplantpro.com',
        resend_success: 'Listo. Revisa tu correo (y la carpeta de spam) y haz clic en el enlace para confirmar tu cuenta.',
        resend_rate_limit: 'Se enviaron demasiados correos en poco tiempo. Espera unos 15-30 minutos y vuelve a intentar, o revisa tu bandeja (y spam) por si ya llegó un correo anterior.',
        resend_failed: 'No se pudo reenviar el correo. Si ya confirmaste tu cuenta, inicia sesión con tu contraseña.',
        recovery_unavailable: 'Recuperación por correo no disponible. Contáctanos: admin@nutriplantpro.com',
        recovery_success: 'Listo. Revisa tu correo y usa el enlace para crear una nueva contraseña. Si no lo ves, revisa la carpeta de correo no deseado o spam.',
        send_failed: 'Error al enviar el enlace.',
        configuration_error: 'Error de configuración. Contáctanos: admin@nutriplantpro.com',
        password_updated: 'Contraseña actualizada. Redirigiendo...',
        password_update_failed: 'No se pudo actualizar la contraseña.',
        confirm_email: '¡Revisa tu correo para confirmar tu cuenta!',
        check_spam_suffix: ' Si no lo ves, revisa correo no deseado o spam.',
        account_created_redirect: '¡Cuenta creada exitosamente! Redirigiendo a PayPal para activar tu suscripción...',
        paypal_launch_failed_admin: '⚠️ Tu cuenta se creó, pero PayPal no se abrió o completó. Vuelve a intentar la activación desde el login. Si no puedes entrar, contacta al administrador.',
        paypal_launch_failed: '⚠️ Tu cuenta se creó, pero PayPal no se abrió o completó. Vuelve a intentar la activación desde el login.',
        account_pending: '✅ Cuenta creada en estado pendiente. No tendrás acceso hasta activar PayPal o ser activado por el administrador.',
        already_registered: 'Este correo ya está registrado. Inicia sesión con tu contraseña y, si quieres volver a suscribirte, pulsa “Activar con PayPal”.',
        signup_failed: 'Error al registrar. Intenta de nuevo.',
        subscription_activated: '✅ ¡Suscripción activada exitosamente!',
        activation_later: 'Tu cuenta fue creada y puedes activar la suscripción después.',
        session_not_found: 'Sesión no encontrada. Vuelve a iniciar sesión y pulsa de nuevo “Activar con PayPal”.',
        email_required: 'Indica tu correo en el formulario.',
        subscription_redirect: '¡Suscripción activada! Redirigiendo...',
        paypal_modal_title: '💳 Activar suscripción',
        paypal_modal_intro: 'Prueba gratis 10 días. Luego $49 USD cada 5 meses. Puedes cancelar en cualquier momento desde PayPal.',
        paypal_plan_error: 'PayPal rechazó el plan de suscripción. Revisa que CLIENT_ID y PLAN_ID sean del mismo modo (sandbox o live).',
        paypal_popup_error: 'El navegador bloqueó la ventana de PayPal. Permite ventanas emergentes e intenta de nuevo.',
        paypal_cancelled: 'Pago cancelado por el usuario.',
        paypal_failed: 'No se completó PayPal en este momento.',
        register_action: 'Registrarme',
        have_account: '¿Ya tienes cuenta?'
      },
      profile: {
        title: 'Mi perfil',
        personal_info: 'Información personal',
        language: 'Idioma',
        unit_system: 'Sistema de unidades',
        locale: 'Formato regional',
        saved: 'Preferencias guardadas'
      },
      selector: {
        spanish: 'Español',
        english: 'Inglés',
        metric: 'Métrico',
        us_customary: 'Estadounidense'
      }
    },
    en: {
      common: { save: 'Save', cancel: 'Cancel', loading: 'Loading…' },
      auth: {
        document_title: 'NutriPlant PRO — Sign in',
        login_title: 'Sign in',
        tagline: 'Design, adjust, and nourish with technical precision',
        preferences: 'Preferences',
        manual: 'Technical Manual',
        manual_aria: 'Public technical manual',
        contact_us: 'Contact us:',
        email: 'Email address',
        email_placeholder: 'you@example.com',
        password: 'Password',
        login_action: 'Sign in',
        forgot_password: 'Forgot your password?',
        recovery_title: 'Set your new password',
        new_password: 'New password',
        recovery_action: 'Save and sign in',
        recovery_intro: 'Enter your email and we will send you a link to reset your password.',
        send_link: 'Send link',
        resend_title: 'Resend confirmation email',
        resend_intro: 'If you registered but did not receive the account confirmation email, enter your email and we will resend it. Also check your spam or junk folder.',
        resend_action: 'Resend email',
        no_account: 'Don’t have an account?',
        register_link: 'Create account',
        register_title: 'Create account',
        register_closed_title: 'Registration temporarily closed',
        register_closed_body: 'We are getting everything ready. In the meantime, you can use all free calculators on this page — no account required.',
        close: 'Close',
        close_dialog: 'Close dialog',
        step_information: 'Information',
        step_profession: 'Profession',
        step_password: 'Password',
        step_subscription: 'Subscription',
        step1_title: '📋 Step 1: Personal Information',
        step2_title: '💼 Step 2: Profession and Crops',
        step3_title: '🔐 Step 3: Password',
        step4_title: '💳 Step 4: Subscription',
        name: 'Full name',
        first_and_last_name: 'First and last name',
        first_name: 'First name',
        last_name: 'Last name',
        phone: 'Phone',
        custom_code: 'Code',
        phone_number: 'Phone number',
        location: 'Location',
        country: 'Country',
        state: 'State/Province',
        city: 'City',
        postal_code: 'Postal Code (ZIP)',
        profession: 'Profession',
        select_profession: 'Select a profession',
        profession_agronomist: 'Agronomist',
        profession_agricultural_engineer: 'Agricultural Engineer',
        profession_agricultural_technician: 'Agricultural Technician',
        profession_grower: 'Grower',
        profession_consultant: 'Consultant',
        profession_researcher: 'Researcher',
        profession_student: 'Student',
        other: 'Other',
        crops_interest: 'Crops of Interest',
        select_crop_help: 'Select at least one crop',
        crop_avocado: '🥑 Avocado',
        crop_tomato: '🍅 Tomato',
        crop_pepper: '🌶️ Pepper',
        crop_cucumber: '🥒 Cucumber',
        crop_strawberry: '🍓 Strawberry',
        crop_lettuce: '🥬 Lettuce',
        crop_citrus: '🍊 Citrus',
        crop_grape: '🍇 Grapes',
        crop_corn: '🌽 Corn',
        crop_other: '🌾 Other',
        confirm_password: 'Confirm password',
        password_help: 'At least 6 characters',
        password_mismatch: 'Passwords do not match',
        next: 'Next →',
        previous: '← Previous',
        subscription_full_access: '✨ Full Access to NutriPlant PRO',
        subscription_intro: 'Activate your subscription to access all NutriPlant PRO features:',
        feature_soil: '📊 Complete soil and amendment analysis',
        feature_nutrition: '🌱 Granular nutrition and fertigation programs',
        feature_water: '💧 Water and extract analysis',
        feature_ai: '🤖 AI assistant specialized in agronomy',
        feature_projects: '📋 Unlimited project management',
        feature_chat: '💬 Chat with an agronomy expert',
        every_five_months: 'every 5 months',
        secure_payment: 'Secure payment with',
        trial_cancel: '10-day free trial. Cancel anytime from your PayPal account → Subscriptions.',
        activate_paypal: 'Activate subscription now with PayPal',
        paypal_required: 'A PayPal subscription is required to create an account.',
        paypal_redirect: 'You will be redirected to PayPal to complete secure payment',
        subscription_summary: 'Summary: $49 USD every 5 months · 10-day free trial · Cancel anytime from PayPal → Subscriptions.',
        login_subscription: 'Subscription: $49 USD every 5 months. Cancel anytime from PayPal.',
        login_trial: 'Activate the subscription to start your 10-day free trial. Cancel before the trial ends and you will not be charged.',
        welcome_title: 'Welcome to NutriPlant PRO!',
        welcome_active: 'Your account and subscription are active. Sign in with your email and password.',
        welcome_subscription: 'Your subscription is $49 USD every 5 months. Cancel anytime from PayPal.',
        welcome_redirect: 'Redirecting to the dashboard in a few seconds… If you are not redirected, use the form below.',
        required_step1: 'Please complete all required fields in Step 1.',
        invalid_email: 'Please enter a valid email address.',
        profession_required: 'Please select a profession.',
        crop_required: 'Please select at least one crop of interest.',
        password_length_error: 'Password must be at least 6 characters.',
        resend_unavailable: 'Email resend is unavailable. Contact us: admin@nutriplantpro.com',
        resend_success: 'Done. Check your email (and spam folder) and click the link to confirm your account.',
        resend_rate_limit: 'Too many emails were sent in a short time. Wait about 15–30 minutes and try again, or check your inbox and spam folder for an earlier message.',
        resend_failed: 'The email could not be resent. If you already confirmed your account, sign in with your password.',
        recovery_unavailable: 'Email recovery is unavailable. Contact us: admin@nutriplantpro.com',
        recovery_success: 'Done. Check your email and use the link to create a new password. If you do not see it, check your spam or junk folder.',
        send_failed: 'The reset link could not be sent.',
        configuration_error: 'Configuration error. Contact us: admin@nutriplantpro.com',
        password_updated: 'Password updated. Redirecting...',
        password_update_failed: 'The password could not be updated.',
        confirm_email: 'Check your email to confirm your account!',
        check_spam_suffix: ' If you do not see it, check your spam or junk folder.',
        account_created_redirect: 'Account created successfully! Redirecting to PayPal to activate your subscription...',
        paypal_launch_failed_admin: '⚠️ Your account was created, but PayPal did not open or complete. Try activating again from the sign-in page. If you cannot sign in, contact the administrator.',
        paypal_launch_failed: '⚠️ Your account was created, but PayPal did not open or complete. Try activating again from the sign-in page.',
        account_pending: '✅ Account created with pending status. You will not have access until PayPal is activated or an administrator activates your account.',
        already_registered: 'This email is already registered. Sign in with your password and, if you want to resubscribe, select “Activate with PayPal”.',
        signup_failed: 'Registration failed. Please try again.',
        subscription_activated: '✅ Subscription activated successfully!',
        activation_later: 'Your account was created and you can activate the subscription later.',
        session_not_found: 'Session not found. Sign in again and select “Activate with PayPal”.',
        email_required: 'Enter your email in the form.',
        subscription_redirect: 'Subscription activated! Redirecting...',
        paypal_modal_title: '💳 Activate subscription',
        paypal_modal_intro: '10-day free trial. Then $49 USD every 5 months. Cancel anytime from PayPal.',
        paypal_plan_error: 'PayPal rejected the subscription plan. Verify that CLIENT_ID and PLAN_ID use the same mode (sandbox or live).',
        paypal_popup_error: 'The browser blocked the PayPal window. Allow pop-ups and try again.',
        paypal_cancelled: 'Payment cancelled by the user.',
        paypal_failed: 'PayPal could not be completed at this time.',
        register_action: 'Create my account',
        have_account: 'Already have an account?'
      },
      profile: {
        title: 'My profile',
        personal_info: 'Personal information',
        language: 'Language',
        unit_system: 'Unit system',
        locale: 'Regional format',
        saved: 'Preferences saved'
      },
      selector: {
        spanish: 'Spanish',
        english: 'English',
        metric: 'Metric',
        us_customary: 'US customary'
      }
    }
  };

  function validLanguage(language) {
    return language === 'es' || language === 'en';
  }

  function initialLanguage() {
    var bootstrap = w.NP_PREFS_BOOTSTRAP;
    if (bootstrap && validLanguage(bootstrap.language)) return bootstrap.language;
    if (w.NpPrefs && typeof w.NpPrefs.get === 'function') {
      var prefs = w.NpPrefs.get();
      if (prefs && validLanguage(prefs.language)) return prefs.language;
    }
    var htmlLang = w.document && w.document.documentElement.lang;
    return validLanguage(String(htmlLang || '').slice(0, 2).toLowerCase())
      ? String(htmlLang).slice(0, 2).toLowerCase()
      : 'es';
  }

  var language = initialLanguage();

  function lookup(catalog, key) {
    var value = catalog;
    String(key).split('.').some(function (part) {
      if (!value || typeof value !== 'object' ||
          !Object.prototype.hasOwnProperty.call(value, part)) {
        value = undefined;
        return true;
      }
      value = value[part];
      return false;
    });
    return typeof value === 'string' ? value : undefined;
  }

  function t(key, params) {
    var text = lookup(catalogs[language], key);
    if (text === undefined) text = lookup(catalogs.es, key);
    if (text === undefined) return String(key);
    return text.replace(/\{([A-Za-z0-9_]+)\}/g, function (match, name) {
      return params && params[name] !== undefined ? String(params[name]) : match;
    });
  }

  function readParams(element) {
    var raw = element.getAttribute('data-i18n-params');
    if (!raw) return undefined;
    try {
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : undefined;
    } catch (e) {
      return undefined;
    }
  }

  function collect(root, attribute) {
    var nodes = [];
    if (root && root.nodeType === 1 && root.hasAttribute(attribute)) nodes.push(root);
    if (root && typeof root.querySelectorAll === 'function') {
      Array.prototype.push.apply(nodes, root.querySelectorAll('[' + attribute + ']'));
    }
    return nodes;
  }

  function apply(root) {
    root = root || w.document;
    if (!root) return root;
    collect(root, 'data-i18n').forEach(function (element) {
      element.textContent = t(element.getAttribute('data-i18n'), readParams(element));
    });
    collect(root, 'data-i18n-placeholder').forEach(function (element) {
      element.setAttribute(
        'placeholder',
        t(element.getAttribute('data-i18n-placeholder'), readParams(element))
      );
    });
    collect(root, 'data-i18n-aria-label').forEach(function (element) {
      element.setAttribute(
        'aria-label',
        t(element.getAttribute('data-i18n-aria-label'), readParams(element))
      );
    });
    collect(root, 'data-i18n-title').forEach(function (element) {
      element.setAttribute(
        'title',
        t(element.getAttribute('data-i18n-title'), readParams(element))
      );
    });
    return root;
  }

  function setLanguage(nextLanguage, options) {
    if (!validLanguage(nextLanguage)) throw new TypeError('Idioma no soportado: ' + nextLanguage);
    language = nextLanguage;
    if (w.document) {
      w.document.documentElement.lang = language;
      w.document.documentElement.setAttribute('data-np-language', language);
      if (!options || options.apply !== false) apply(w.document);
    }
    if (w.NpPrefs && (!options || options.persist !== false)) {
      w.NpPrefs.set({ language: language }, { explicit: true });
    }
    return language;
  }

  function validCatalogNode(node) {
    if (typeof node === 'string') return true;
    if (!node || typeof node !== 'object' || Array.isArray(node)) return false;
    return Object.keys(node).every(function (key) { return validCatalogNode(node[key]); });
  }

  function loadCatalog(nextLanguage, url) {
    if (!validLanguage(nextLanguage)) return Promise.reject(new TypeError('Idioma no soportado'));
    if (typeof w.fetch !== 'function') return Promise.reject(new Error('fetch no disponible'));
    return w.fetch(url).then(function (response) {
      if (!response.ok) throw new Error('No se pudo cargar el catálogo: ' + response.status);
      return response.json();
    }).then(function (catalog) {
      if (!validCatalogNode(catalog)) throw new TypeError('Catálogo de traducciones inválido');
      catalogs[nextLanguage] = catalog;
      return catalog;
    });
  }

  return {
    t: t,
    apply: apply,
    setLanguage: setLanguage,
    loadCatalog: loadCatalog,
    getLanguage: function () { return language; }
  };
});
