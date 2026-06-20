/* Geolocalización para herramientas gratuitas (VPD, lámina riego, etc.) */
(function (w) {
  function isEmbedded() {
    try {
      return w.self !== w.top;
    } catch (e) {
      return true;
    }
  }

  function geoErrorMessage(err, t) {
    t = t || function (es) { return es; };
    var embed = isEmbedded();
    var code = err && err.code != null ? err.code : -1;
    if (code === 1) {
      if (embed) {
        return t(
          'Ubicación bloqueada en la ventana embebida. Clic en el candado de la barra → Ubicación → Permitir. Si sigue fallando, abre la herramienta en página completa (⋮ o enlace abajo).',
          'Location blocked in the embedded window. Use the address bar lock → Location → Allow. If it still fails, open the tool in full page.'
        );
      }
      return t(
        'Permiso de ubicación denegado. Activa Ubicación para nutriplantpro.com en el candado del navegador. En macOS: Ajustes → Privacidad → Servicios de ubicación → Chrome.',
        'Location permission denied. Allow location for nutriplantpro.com in the browser lock icon. On macOS: System Settings → Privacy → Location Services → Chrome.'
      );
    }
    if (code === 2) {
      return t(
        'Ubicación no disponible en este equipo (común en PC sin GPS). Marca un punto en el mapa.',
        'Location unavailable on this device (common on desktops without GPS). Pick a point on the map.'
      );
    }
    if (code === 3) {
      return t(
        'Tiempo de espera agotado. Intenta de nuevo o marca un punto en el mapa.',
        'Timed out. Try again or pick a point on the map.'
      );
    }
    return t(
      'No se pudo leer GPS. Elige un punto en el mapa.',
      'Could not read GPS. Pick a point on the map.'
    );
  }

  function requestLocation(options) {
    options = options || {};
    return new Promise(function (resolve, reject) {
      if (!navigator.geolocation) {
        reject({
          code: 0,
          message: options.t
            ? options.t('Tu navegador no permite ubicación.', 'Your browser does not support geolocation.')
            : 'Tu navegador no permite ubicación.'
        });
        return;
      }

      function runAttempt(highAccuracy, timeoutMs, isRetry) {
        navigator.geolocation.getCurrentPosition(
          function (pos) {
            resolve(pos);
          },
          function (err) {
            if (err && err.code === 1) {
              reject({ code: 1, message: geoErrorMessage(err, options.t) });
              return;
            }
            if (!isRetry && options.retry !== false) {
              runAttempt(true, options.retryTimeout || 20000, true);
              return;
            }
            reject({ code: err && err.code, message: geoErrorMessage(err, options.t) });
          },
          {
            enableHighAccuracy: highAccuracy,
            timeout: timeoutMs,
            maximumAge: options.maximumAge != null ? options.maximumAge : 180000
          }
        );
      }

      runAttempt(false, options.timeout || 15000, false);
    });
  }

  w.NpFreeGeo = {
    isEmbedded: isEmbedded,
    geoErrorMessage: geoErrorMessage,
    requestLocation: requestLocation
  };
})(window);
