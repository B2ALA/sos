/**
 * location-service.js
 * ─────────────────────────────────────────────────────────────────────────
 * SINGLE RESPONSIBILITY: obtain the user's current GPS coordinates.
 *
 * Wraps the callback-based navigator.geolocation API in a Promise and
 * normalizes every failure mode into a typed LocationError so the caller
 * (sos-listener.js) can branch on `error.code` instead of parsing strings.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Error codes this module can produce. */
export const LOCATION_ERROR = Object.freeze({
  UNSUPPORTED: "UNSUPPORTED",       // browser has no geolocation API
  PERMISSION_DENIED: "PERMISSION_DENIED",
  POSITION_UNAVAILABLE: "POSITION_UNAVAILABLE",
  TIMEOUT: "TIMEOUT",
  UNKNOWN: "UNKNOWN",
});

export class LocationError extends Error {
  /**
   * @param {string} code one of LOCATION_ERROR
   * @param {string} message human-readable message
   */
  constructor(code, message) {
    super(message);
    this.name = "LocationError";
    this.code = code;
  }
}

/**
 * Requests the current GPS position once.
 *
 * @param {object} [options]
 * @param {number} [options.timeoutMs=10000] time to wait before giving up
 * @param {boolean} [options.highAccuracy=true] request high-accuracy GPS
 * @param {number} [options.retries=1] number of automatic retries on
 *        transient failures (TIMEOUT / POSITION_UNAVAILABLE only — never
 *        retried automatically on PERMISSION_DENIED, since that requires
 *        user action, not a retry).
 * @returns {Promise<{latitude:number, longitude:number, accuracy:number, timestamp:number}>}
 */
export function getCurrentLocation(options = {}) {
  const { timeoutMs = 10000, highAccuracy = true, retries = 1 } = options;

  const attempt = (retriesLeft) =>
    new Promise((resolve, reject) => {
      if (!("geolocation" in navigator)) {
        reject(
          new LocationError(
            LOCATION_ERROR.UNSUPPORTED,
            "Geolocation is not supported by this browser/device."
          )
        );
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          resolve({
            latitude,
            longitude,
            accuracy,
            timestamp: position.timestamp,
          });
        },
        (err) => {
          const mapped = mapGeolocationError(err);
          const isTransient =
            mapped.code === LOCATION_ERROR.TIMEOUT ||
            mapped.code === LOCATION_ERROR.POSITION_UNAVAILABLE;

          if (isTransient && retriesLeft > 0) {
            attempt(retriesLeft - 1).then(resolve).catch(reject);
          } else {
            reject(mapped);
          }
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: timeoutMs,
          maximumAge: 0,
        }
      );
    });

  return attempt(retries);
}

/**
 * Maps the native GeolocationPositionError into our typed LocationError.
 * @param {GeolocationPositionError} err
 * @returns {LocationError}
 */
function mapGeolocationError(err) {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return new LocationError(
        LOCATION_ERROR.PERMISSION_DENIED,
        "Location permission was denied. Please enable location access."
      );
    case err.POSITION_UNAVAILABLE:
      return new LocationError(
        LOCATION_ERROR.POSITION_UNAVAILABLE,
        "Current position could not be determined."
      );
    case err.TIMEOUT:
      return new LocationError(
        LOCATION_ERROR.TIMEOUT,
        "Timed out while waiting for a GPS fix."
      );
    default:
      return new LocationError(LOCATION_ERROR.UNKNOWN, "Unknown location error.");
  }
}
