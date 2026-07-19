/**
 * reverse-geocode.js
 * ─────────────────────────────────────────────────────────────────────────
 * SINGLE RESPONSIBILITY: convert (latitude, longitude) → human-readable
 * address using the Nominatim (OpenStreetMap) reverse geocoding API.
 *
 * No API key required for Nominatim, but it is rate-limited and asks
 * that requests be reasonably infrequent — fine for "one lookup per SOS
 * click", not fine for polling.
 * ─────────────────────────────────────────────────────────────────────────
 */

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/reverse";

export const GEOCODE_ERROR = Object.freeze({
  NETWORK: "NETWORK",
  BAD_RESPONSE: "BAD_RESPONSE",
  TIMEOUT: "TIMEOUT",
});

export class GeocodeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "GeocodeError";
    this.code = code;
  }
}

/**
 * @typedef {object} ReverseGeocodeResult
 * @property {string} formattedAddress  full human-readable address string
 * @property {string} houseNumber
 * @property {string} street
 * @property {string} area
 * @property {string} city
 * @property {string} district
 * @property {string} state
 * @property {string} country
 * @property {string} postalCode
 * @property {number} latitude
 * @property {number} longitude
 */

/**
 * Reverse geocodes coordinates into a structured, formatted address.
 *
 * @param {number} latitude
 * @param {number} longitude
 * @param {object} [options]
 * @param {number} [options.timeoutMs=8000]
 * @param {number} [options.retries=1]
 * @returns {Promise<ReverseGeocodeResult>}
 */
export async function reverseGeocode(latitude, longitude, options = {}) {
  const { timeoutMs = 8000, retries = 1 } = options;

  const url = `${NOMINATIM_ENDPOINT}?format=jsonv2&lat=${encodeURIComponent(
    latitude
  )}&lon=${encodeURIComponent(longitude)}&addressdetails=1`;

  let lastError = null;

  for (let attemptNum = 0; attemptNum <= retries; attemptNum++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          // Nominatim usage policy asks for an identifiable client.
          "Accept-Language": "en",
        },
      });
      clearTimeout(timer);

      if (!response.ok) {
        throw new GeocodeError(
          GEOCODE_ERROR.BAD_RESPONSE,
          `Reverse geocode request failed with status ${response.status}`
        );
      }

      const data = await response.json();
      return normalizeNominatimResponse(data, latitude, longitude);
    } catch (err) {
      clearTimeout(timer);
      if (err.name === "AbortError") {
        lastError = new GeocodeError(GEOCODE_ERROR.TIMEOUT, "Reverse geocode timed out.");
      } else if (err instanceof GeocodeError) {
        lastError = err;
      } else {
        lastError = new GeocodeError(GEOCODE_ERROR.NETWORK, "Network error during reverse geocode.");
      }
      // loop again if retries remain
    }
  }

  throw lastError;
}

/**
 * Normalizes a raw Nominatim response into our stable shape, so the rest
 * of the app never depends on Nominatim's exact field names.
 * @param {any} data
 * @param {number} latitude
 * @param {number} longitude
 * @returns {ReverseGeocodeResult}
 */
function normalizeNominatimResponse(data, latitude, longitude) {
  const addr = data.address || {};
  return {
    formattedAddress: data.display_name || "Address unavailable",
    houseNumber: addr.house_number || "",
    street: addr.road || addr.pedestrian || addr.street || "",
    area: addr.suburb || addr.neighbourhood || addr.quarter || "",
    city: addr.city || addr.town || addr.village || "",
    district: addr.state_district || addr.county || "",
    state: addr.state || "",
    country: addr.country || "",
    postalCode: addr.postcode || "",
    latitude,
    longitude,
  };
}
