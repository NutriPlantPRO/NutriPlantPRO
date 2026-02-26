/**
 * NutriPlant PRO - Configuración de aplicación (URLs para producción)
 *
 * Para pasar a producción: cambia solo apiBaseUrl a '' (vacío) para usar
 * el mismo dominio, o pon tu URL completa ej. 'https://anutriplant.com'
 * sin barra final.
 */
(function() {
  'use strict';

  window.NUTRIPLANT_APP = {
    // Producción: '' (mismo origen). Desarrollo con file://: 'http://localhost:8000'
    apiBaseUrl: '',
    // Google Analytics 4: pega aquí tu Measurement ID (ej. G-XXXXXXXXXX). Vacío = no se envía analytics.
    googleAnalyticsMeasurementId: 'G-1R237KJ2PF'
  };

  /** Devuelve la base URL del backend (sin / al final). Usado por chat, dashboard y admin. */
  window.getNutriPlantApiBase = function() {
    var base = (window.NUTRIPLANT_APP && window.NUTRIPLANT_APP.apiBaseUrl);
    if (base) return base.replace(/\/$/, '');
    if (typeof window !== 'undefined' && window.location && window.location.origin)
      return window.location.origin;
    return 'http://localhost:8000';
  };
})();
