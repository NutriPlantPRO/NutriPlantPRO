/**
 * NutriPlant PRO - Configuración de Supabase
 * 
 * INSTRUCCIONES:
 * 1. Entra a Supabase → tu proyecto → Settings → API
 * 2. Copia "Project URL" y "anon public" key
 * 3. Pega la anon key abajo donde dice TU_ANON_KEY_AQUI
 */
(function() {
  'use strict';

  window.NUTRIPLANT_SUPABASE = {
    url: 'https://grbxhxydgaxhpoedbltd.supabase.co',
    anonKey: 'sb_publishable_vxOgeLkSYVh8x31aAKV8BA_p_xQw6P4',
    enabled: true                  // false = usar solo localStorage (modo sin nube)
  };

  window.getSupabaseClient = function() {
    if (!window.NUTRIPLANT_SUPABASE.enabled || 
        !window.NUTRIPLANT_SUPABASE.anonKey || 
        window.NUTRIPLANT_SUPABASE.anonKey === 'TU_ANON_KEY_AQUI') {
      return null;
    }
    if (!window._supabaseClient && typeof window.supabase !== 'undefined') {
      window._supabaseClient = window.supabase.createClient(
        window.NUTRIPLANT_SUPABASE.url,
        window.NUTRIPLANT_SUPABASE.anonKey
      );
    }
    return window._supabaseClient || null;
  };
})();
