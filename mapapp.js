/* ══════════════════════════════════════════════════════════════
   map-app.js
   Wires together categories.js + overpass.js + Leaflet to build the
   full "Nearby Emergency Services" experience: geolocation, live
   OSM search, filterable/searchable card list, and map<->list sync.
   ══════════════════════════════════════════════════════════════ */

// ── STATE ──
let map = null;
let userLatLng = null;              // {lat, lon} — null until geolocation resolves (or user picks fallback)
let allPlaces = [];                 // last full result set from Overpass, with distance attached
let markerById = {};                // OSM id -> Leaflet marker, so list clicks can find/animate the right marker
let userMarker = null;
let activeCategories = new Set(CATEGORY_ORDER); // all categories on by default
let selectedPlaceId = null;

const SALEM_CENTER = { lat: 11.6643, lon: 78.1460 }; // fallback if geolocation is denied/unavailable

// ── DOM SHORTCUTS ──
const $ = (id) => document.getElementById(id);

// ══════════════════════════════════════════════════════════════
// HAVERSINE DISTANCE — great-circle distance between two lat/lon points
// ══════════════════════════════════════════════════════════════
function haversineDistanceKm(lat1, lon1, lat2, lon2){
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function toRad(deg){ return deg * Math.PI / 180; }
function formatDistance(km){
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

// ══════════════════════════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════════════════════════
function toast(msg){
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('on');
  setTimeout(() => t.classList.remove('on'), 3200);
}

// ══════════════════════════════════════════════════════════════
// MAP SETUP
// ══════════════════════════════════════════════════════════════
function initMap(center){
  map = L.map('leafletMap', { zoomControl: true }).setView([center.lat, center.lon], 14);

  // OpenStreetMap tiles — free, no API key required. Please keep the
  // attribution below (required by the OSM tile usage policy).
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
}

function placeUserMarker(center, label){
  if(userMarker) map.removeLayer(userMarker);
  const icon = L.divIcon({
    className: '',
    html: `<div class="you-marker" title="${label}"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
  userMarker = L.marker([center.lat, center.lon], { icon, zIndexOffset: 1000 })
    .addTo(map)
    .bindPopup(`<div class="popup-title">📍 ${label}</div>`);
}

function categoryDivIcon(category){
  const cat = CATEGORIES[category];
  return L.divIcon({
    className: '',
    html: `<div class="mh-marker" style="background:${cat.color};"><span>${cat.icon}</span></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 22],
    popupAnchor: [0, -20],
  });
}

// ══════════════════════════════════════════════════════════════
// GEOLOCATION FLOW
// ══════════════════════════════════════════════════════════════
function requestUserLocation(){
  setOverlay({ visible: true, title: 'Requesting your location…', sub: 'Allow location access for the most accurate results.' });
  setLocStatus('pending', 'Waiting for location permission…');

  if(!navigator.geolocation){
    handleLocationUnavailable('Geolocation isn\u2019t supported on this device/browser.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userLatLng = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      setLocStatus('ok', `Using your live location (±${Math.round(pos.coords.accuracy)}m)`);
      initMap(userLatLng);
      placeUserMarker(userLatLng, 'You are here');
      runSearch();
    },
    (err) => {
      const reason = err.code === 1 ? 'Location permission denied.' : 'Could not determine your location.';
      handleLocationUnavailable(reason);
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function handleLocationUnavailable(reason){
  setLocStatus('err', reason + ' Showing Salem city center.');
  setOverlay({
    visible: true,
    title: reason,
    sub: 'You can still browse emergency services around Salem city center, or try requesting location again.',
    showRetry: true,
    showSalemFallback: true,
  });
}

function useSalemFallback(){
  userLatLng = { ...SALEM_CENTER };
  setLocStatus('err', 'Showing results around Salem city center (location unavailable).');
  if(!map) initMap(userLatLng);
  else map.setView([userLatLng.lat, userLatLng.lon], 14);
  placeUserMarker(userLatLng, 'Salem city center (approximate)');
  runSearch();
}

function setLocStatus(state, text){
  const dot = $('locDot');
  dot.classList.remove('ok', 'err');
  if(state === 'ok') dot.classList.add('ok');
  if(state === 'err') dot.classList.add('err');
  $('locStatusText').textContent = text;
}

function setOverlay({ visible, title, sub, showRetry = false, showSalemFallback = false }){
  const overlay = $('mapOverlay');
  overlay.classList.toggle('hidden', !visible);
  if(title) $('overlayTitle').textContent = title;
  if(sub) $('overlaySub').textContent = sub;
  $('overlayRetryBtn').style.display = showRetry ? 'inline-block' : 'none';
  $('overlaySalemBtn').style.display = showSalemFallback ? 'inline-block' : 'none';
}

// ══════════════════════════════════════════════════════════════
// SEARCH (Overpass) + RENDER
// ══════════════════════════════════════════════════════════════
async function runSearch(){
  if(!userLatLng) return;
  const radius = parseInt($('radiusSelect').value, 10);

  setOverlay({ visible: true, title: 'Searching nearby…', sub: 'Querying OpenStreetMap for emergency services in your area.' });
  $('refreshBtn').disabled = true;
  $('resultsMeta').textContent = 'Searching…';
  $('resultsList').innerHTML = '';

  try{
    const raw = await searchNearbyPlaces(userLatLng.lat, userLatLng.lon, radius, CATEGORY_ORDER);
    allPlaces = raw.map(p => ({
      ...p,
      distanceKm: haversineDistanceKm(userLatLng.lat, userLatLng.lon, p.lat, p.lon),
    })).sort((a, b) => a.distanceKm - b.distanceKm);

    renderMarkers();
    renderList();
    setOverlay({ visible: false });

    if(allPlaces.length === 0){
      $('resultsMeta').textContent = 'No results in this radius.';
    }
  }catch(err){
    console.error('MediHelp map search failed:', err);
    const isTimeout = err.message === 'OVERPASS_TIMEOUT';
    setOverlay({ visible: false });
    renderErrorState(isTimeout
      ? 'The map service timed out. It can be slow at peak times — try again in a moment.'
      : 'Could not reach the map service. Check your connection and try again.');
  }finally{
    $('refreshBtn').disabled = false;
  }
}

function renderMarkers(){
  // clear previous place markers (keep the user marker)
  Object.values(markerById).forEach(m => map.removeLayer(m));
  markerById = {};

  const visiblePlaces = getVisiblePlaces();
  visiblePlaces.forEach(place => {
    const marker = L.marker([place.lat, place.lon], { icon: categoryDivIcon(place.category) })
      .addTo(map)
      .bindPopup(buildPopupHtml(place));
    marker.on('click', () => selectPlace(place.id, { fromMap: true }));
    markerById[place.id] = marker;
  });
}

function buildPopupHtml(place){
  const cat = CATEGORIES[place.category];
  const navUrl = buildNavigateUrl(place);
  return `
    <div class="popup-title">${cat.icon} ${escapeHtml(place.name)}</div>
    <span class="popup-cat" style="background:${cat.tint};color:${cat.color};">${cat.label}</span>
    <div class="popup-row">📏 ${formatDistance(place.distanceKm)} away</div>
    <div class="popup-row">🧭 ${place.lat.toFixed(5)}, ${place.lon.toFixed(5)}</div>
    <a class="popup-nav-btn" href="${navUrl}" target="_blank" rel="noopener">Navigate →</a>
  `;
}

function buildNavigateUrl(place){
  if(userLatLng){
    // OSM's own routing frontend — free, no key required
    return `https://www.openstreetmap.org/directions?from=${userLatLng.lat},${userLatLng.lon}&to=${place.lat},${place.lon}`;
  }
  return `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lon}#map=17/${place.lat}/${place.lon}`;
}

function getVisiblePlaces(){
  const q = ($('nameSearch').value || '').trim().toLowerCase();
  return allPlaces.filter(p => activeCategories.has(p.category) && (!q || p.name.toLowerCase().includes(q)));
}

function renderList(){
  const list = $('resultsList');
  const visible = getVisiblePlaces();

  $('resultsMeta').textContent = `${visible.length} result${visible.length === 1 ? '' : 's'} found`;

  if(visible.length === 0){
    list.innerHTML = `
      <div class="empty-state">
        <span class="es-ico">🗺️</span>
        <div class="es-title">Nothing matches right now</div>
        <div class="es-sub">Try a different search term, enable more categories, or widen the radius.</div>
      </div>`;
    return;
  }

  list.innerHTML = visible.map(place => {
    const cat = CATEGORIES[place.category];
    const selected = place.id === selectedPlaceId ? ' selected' : '';
    return `
    <div class="place-card${selected}" data-id="${escapeAttr(place.id)}">
      <div class="pc-top">
        <div class="pc-ico" style="background:${cat.tint};">${cat.icon}</div>
        <div style="flex:1;min-width:0;">
          <div class="pc-name">${escapeHtml(place.name)}</div>
          <div class="pc-cat" style="color:${cat.color};">${cat.label}</div>
        </div>
      </div>
      <div class="pc-meta">
        <span class="pc-dist">📏 ${formatDistance(place.distanceKm)}</span>
        <span class="pc-coords">${place.lat.toFixed(4)}, ${place.lon.toFixed(4)}</span>
      </div>
      <div class="pc-actions">
        <button class="pc-btn view-btn" type="button">🗺️ View on Map</button>
        <a class="pc-btn primary" href="${buildNavigateUrl(place)}" target="_blank" rel="noopener">🧭 Navigate</a>
      </div>
    </div>`;
  }).join('');

  // wire up card interactions (event delegation would also work, but the
  // list is small and re-rendered often, so direct binding is simplest)
  list.querySelectorAll('.place-card').forEach(card => {
    const id = card.getAttribute('data-id');
    card.querySelector('.view-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      selectPlace(id, { fromMap: false });
    });
    card.addEventListener('click', () => selectPlace(id, { fromMap: false }));
  });
}

function renderErrorState(message){
  $('resultsMeta').textContent = '';
  $('resultsList').innerHTML = `
    <div class="error-state">
      <span class="es-ico">⚠️</span>
      <div class="es-title">Couldn't load nearby services</div>
      <div class="es-sub">${escapeHtml(message)}</div>
      <button class="retry-inline" id="inlineRetryBtn" type="button">Try again</button>
    </div>`;
  const btn = document.getElementById('inlineRetryBtn');
  if(btn) btn.addEventListener('click', runSearch);
}

// ══════════════════════════════════════════════════════════════
// SELECTION (card <-> marker sync)
// ══════════════════════════════════════════════════════════════
function selectPlace(id, { fromMap }){
  selectedPlaceId = id;
  const place = allPlaces.find(p => p.id === id);
  if(!place) return;

  // re-render list only for the selection highlight (cheap given list size)
  document.querySelectorAll('.place-card').forEach(card => {
    card.classList.toggle('selected', card.getAttribute('data-id') === id);
  });

  map.flyTo([place.lat, place.lon], 17, { duration: 0.6 });

  const marker = markerById[id];
  if(marker){
    marker.openPopup();
    const el = marker.getElement();
    if(el){
      const inner = el.querySelector('.mh-marker');
      if(inner){
        inner.classList.remove('pulse');
        void inner.offsetWidth; // restart animation
        inner.classList.add('pulse');
      }
    }
  }

  if(!fromMap){
    const cardEl = document.querySelector(`.place-card[data-id="${cssEscape(id)}"]`);
    if(cardEl) cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// ══════════════════════════════════════════════════════════════
// FILTERS + SEARCH BOX
// ══════════════════════════════════════════════════════════════
function buildFilterChips(){
  const row = $('filterRow');
  row.innerHTML = CATEGORY_ORDER.map(key => {
    const cat = CATEGORIES[key];
    return `
    <label class="filter-chip active" data-cat="${key}" style="color:${cat.color};">
      <input type="checkbox" checked>
      <span class="dot" style="background:${cat.color};"></span>${cat.label}
    </label>`;
  }).join('');

  row.querySelectorAll('.filter-chip').forEach(chip => {
    const key = chip.getAttribute('data-cat');
    const checkbox = chip.querySelector('input');
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      checkbox.checked = !checkbox.checked;
      chip.classList.toggle('active', checkbox.checked);
      if(checkbox.checked) activeCategories.add(key);
      else activeCategories.delete(key);
      renderMarkers();
      renderList();
    });
  });
}

function wireSearchAndControls(){
  $('nameSearch').addEventListener('input', () => { renderMarkers(); renderList(); });
  $('refreshBtn').addEventListener('click', runSearch);
  $('radiusSelect').addEventListener('change', runSearch);
  $('overlayRetryBtn').addEventListener('click', requestUserLocation);
  $('overlaySalemBtn').addEventListener('click', useSalemFallback);
}

// ══════════════════════════════════════════════════════════════
// SMALL UTILITIES
// ══════════════════════════════════════════════════════════════
function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(str){ return escapeHtml(str); }
function cssEscape(str){ return String(str).replace(/(["\\])/g, '\\$1'); }

// ══════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════
window.addEventListener('load', () => {
  buildFilterChips();
  wireSearchAndControls();
  requestUserLocation();
});
