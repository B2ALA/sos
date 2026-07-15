/* ══════════════════════════════════════════════════════════════
   overpass.js
   Talks to the free, keyless Overpass API (OpenStreetMap's query
   engine) and turns the raw JSON response into a flat list of
   { id, name, category, lat, lon } objects the rest of the app can use.
   ══════════════════════════════════════════════════════════════ */

// Overpass has several public mirrors. If the primary is slow/down we
// fall back to the next one rather than failing the whole search.
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const OVERPASS_TIMEOUT_MS = 20000; // client-side abort — separate from the [timeout:] hint sent to the server

/**
 * Build the Overpass QL query string for every active category around a point.
 * We ask for node/way/relation for each tag filter and request "out center"
 * so ways/relations (buildings, compounds) come back with a single lat/lon
 * we can plot and measure distance from.
 */
function buildOverpassQuery(lat, lon, radiusMeters, activeCategoryKeys){
  const around = `(around:${radiusMeters},${lat},${lon})`;
  const clauses = [];

  activeCategoryKeys.forEach(catKey => {
    const cat = CATEGORIES[catKey];
    if(!cat) return;
    cat.osmFilters.forEach(filter => {
      clauses.push(`node${filter}${around};`);
      clauses.push(`way${filter}${around};`);
      clauses.push(`relation${filter}${around};`);
    });
  });

  return `[out:json][timeout:25];(${clauses.join('')});out center tags;`;
}

/**
 * Fetch from Overpass, trying each mirror in turn until one responds.
 * Throws a descriptive Error if every mirror fails or the request times out.
 */
async function fetchOverpass(query){
  let lastError = null;

  for(const endpoint of OVERPASS_ENDPOINTS){
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);
    try{
      const res = await fetch(endpoint, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(query),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if(!res.ok) throw new Error(`Overpass responded with HTTP ${res.status}`);
      const json = await res.json();
      return json;
    }catch(err){
      clearTimeout(timer);
      lastError = err;
      // try the next mirror
    }
  }

  if(lastError && lastError.name === 'AbortError'){
    throw new Error('OVERPASS_TIMEOUT');
  }
  throw new Error('OVERPASS_NETWORK_ERROR');
}

/**
 * Given a raw Overpass element (node/way/relation), figure out which of
 * our categories it matches (a place can technically match more than one
 * filter — we just take the first match) and return a normalized place.
 */
function classifyElement(el){
  const tags = el.tags || {};
  for(const catKey of CATEGORY_ORDER){
    const cat = CATEGORIES[catKey];
    const matches = cat.osmFilters.some(filter => {
      // filter looks like ["amenity"="hospital"] — parse key/value back out
      const m = filter.match(/\["([^"]+)"="([^"]+)"\]/);
      if(!m) return false;
      const [, key, value] = m;
      return tags[key] === value;
    });
    if(matches) return catKey;
  }
  return null;
}

/**
 * Normalize the full Overpass response into a flat array of places:
 * { id, name, category, lat, lon, tagsRaw }
 */
function normalizeOverpassResponse(json){
  const elements = (json && json.elements) || [];
  const places = [];

  elements.forEach(el => {
    const category = classifyElement(el);
    if(!category) return;

    // Nodes have lat/lon directly; ways/relations need the "center" Overpass gives us
    const lat = el.lat !== undefined ? el.lat : (el.center ? el.center.lat : null);
    const lon = el.lon !== undefined ? el.lon : (el.center ? el.center.lon : null);
    if(lat === null || lon === null) return;

    const name = (el.tags && (el.tags.name || el.tags['name:en'])) || CATEGORIES[category].label + ' (unnamed)';

    places.push({
      id: `${el.type}/${el.id}`,
      name,
      category,
      lat,
      lon,
      tagsRaw: el.tags || {},
    });
  });

  // De-duplicate: OSM sometimes returns the same physical place as both a
  // node and a way (e.g. a hospital node inside its own building outline).
  const seen = new Set();
  return places.filter(p => {
    const key = `${p.category}:${p.name}:${p.lat.toFixed(4)}:${p.lon.toFixed(4)}`;
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Public entry point used by map-app.js: given a center point, radius and
 * list of active category keys, returns a promise resolving to normalized places.
 */
async function searchNearbyPlaces(lat, lon, radiusMeters, activeCategoryKeys){
  const query = buildOverpassQuery(lat, lon, radiusMeters, activeCategoryKeys);
  const json = await fetchOverpass(query);
  return normalizeOverpassResponse(json);
}
