/* button/reverse-geocode.js
   Responsibilities:
   - Reverse geocode coordinates using OpenStreetMap Nominatim
   - Cache recent lookups to reduce rate-limiting
   - Provide a single function reverseGeocode(lat, lon) -> { address, raw }
*/

(function () {
  if (!window.MediHelp) window.MediHelp = {};
  if (window.MediHelp.ReverseGeocode) return;

  const CACHE_KEY = 'MediHelp:reverseGeocodeCache';
  const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

  /**
   * Safely read cache from localStorage
   * @returns {Object<string, {ts:number, data:any}>}
   */
  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return {};
      return JSON.parse(raw) || {};
    } catch (e) {
      return {};
    }
  }

  /**
   * Safely write cache to localStorage
   * @param {Object} cache
   */
  function writeCache(cache) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      // ignore quota errors
    }
  }

  /**
   * Build a cache key for coordinates with limited precision to reduce duplicates
   * @param {number} lat
   * @param {number} lon
   * @returns {string}
   */
  function keyFor(lat, lon) {
    // round to 5 decimal places (~1m)
    return `${lat.toFixed(5)},${lon.toFixed(5)}`;
  }

  /**
   * Reverse geocode using Nominatim
   * @param {number} lat
   * @param {number} lon
   * @param {Object} [opts]
   * @param {number} [opts.timeout] - ms
   * @returns {Promise<{address:string, raw:any, source:string}>}
   */
  async function reverseGeocode(lat, lon, opts = {}) {
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      throw new Error('Invalid coordinates for reverse geocoding.');
    }

    const cache = readCache();
    const k = keyFor(lat, lon);
    const now = Date.now();

    if (cache[k] && (now - cache[k].ts) < CACHE_TTL) {
      return { address: cache[k].data.display_name || '', raw: cache[k].data, source: 'cache' };
    }

    const timeout = opts.timeout || 10000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    // Nominatim usage policy: include a valid user-agent or referer. We set a simple header.
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&addressdetails=1`;

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MediHelp/1.0 (contact@yourdomain.example)'
        },
        signal: controller.signal
      });
      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`Reverse geocode failed with status ${res.status}`);
      }
      const data = await res.json();
      cache[k] = { ts: now, data };
      writeCache(cache);
      return { address: data.display_name || '', raw: data, source: 'nominatim' };
    } catch (err) {
      clearTimeout(timer);
      // If network error and cache exists, return cache
      if (cache[k]) {
        return { address: cache[k].data.display_name || '', raw: cache[k].data, source: 'cache' };
      }
      throw err;
    }
  }

  window.MediHelp.ReverseGeocode = {
    reverseGeocode
  };
})();
