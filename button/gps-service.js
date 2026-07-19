/* button/gps-service.js
   Responsibilities:
   - Provide a single, well-documented GPS service that returns a Promise resolving to { latitude, longitude }
   - Handle permission errors, timeouts, and offline scenarios
   - Expose a small public API on window.MediHelp.GPS
*/

(function () {
  if (!window.MediHelp) window.MediHelp = {};
  if (window.MediHelp.GPS) return;

  /**
   * Default GPS options
   * @type {{enableHighAccuracy: boolean, timeout: number, maximumAge: number}}
   */
  const DEFAULT_OPTIONS = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 5000
  };

  /**
   * Promise wrapper for navigator.geolocation.getCurrentPosition with timeout and clear error messages.
   * @param {Object} [opts] - Options to pass to geolocation API.
   * @returns {Promise<{latitude:number, longitude:number}>}
   */
  async function getCurrentPosition(opts = {}) {
    const options = Object.assign({}, DEFAULT_OPTIONS, opts);

    if (!('geolocation' in navigator)) {
      throw new Error('Geolocation not supported by this browser.');
    }

    return new Promise((resolve, reject) => {
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        reject(new Error('Geolocation timeout.'));
      }, options.timeout + 1000);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (timedOut) return;
          clearTimeout(timer);
          const { latitude, longitude } = pos.coords;
          resolve({ latitude, longitude });
        },
        (err) => {
          if (timedOut) return;
          clearTimeout(timer);
          switch (err.code) {
            case err.PERMISSION_DENIED:
              reject(new Error('Geolocation permission denied.'));
              break;
            case err.POSITION_UNAVAILABLE:
              reject(new Error('Position unavailable.'));
              break;
            case err.TIMEOUT:
              reject(new Error('Geolocation request timed out.'));
              break;
            default:
              reject(new Error('Geolocation error.'));
          }
        },
        options
      );
    });
  }

  /**
   * Try to get position with graceful fallback to cached last-known position in localStorage.
   * @param {Object} [opts]
   * @returns {Promise<{latitude:number, longitude:number, source:string}>}
   */
  async function getPositionWithFallback(opts = {}) {
    try {
      const pos = await getCurrentPosition(opts);
      try {
        localStorage.setItem('MediHelp:lastPosition', JSON.stringify({
          latitude: pos.latitude,
          longitude: pos.longitude,
          ts: Date.now()
        }));
      } catch (e) {
        // ignore storage errors
      }
      return { ...pos, source: 'live' };
    } catch (err) {
      // fallback to cached
      try {
        const raw = localStorage.getItem('MediHelp:lastPosition');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.latitude && parsed.longitude) {
            return {
              latitude: parsed.latitude,
              longitude: parsed.longitude,
              source: 'cache'
            };
          }
        }
      } catch (e) {
        // ignore parse errors
      }
      throw err;
    }
  }

  // Public API
  window.MediHelp.GPS = {
    getCurrentPosition: getCurrentPosition,
    getPositionWithFallback: getPositionWithFallback
  };
})();
