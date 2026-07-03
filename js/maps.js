/* maps.js — Leaflet map integration (OpenStreetMap)
   - createMap(containerId) returns the map instance
   - addMarkersToMap(items, type) adds markers and popups
   - clearLayerMarkers() removes markers
   - Uses global `state` for userLocation
*/

let _map, _markerLayer;

function createMap(containerId = 'map') {
  const map = L.map(containerId, { zoomControl: true });
  // default center Salem
  map.setView([11.6643, 78.1460], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  _map = map;
  _markerLayer = L.layerGroup().addTo(map);
  // user marker placeholder
  return map;
}

function addMarkersToMap(items = [], type = 'place') {
  if (!_map || !_markerLayer) return;
  _markerLayer.clearLayers();
  // add user marker
  if (window.state && window.state.userLocation) {
    const u = window.state.userLocation;
    const um = L.circleMarker([u.lat, u.lng], { radius: 8, color: '#0E7C66', fillColor: '#12A187', fillOpacity: 0.9 }).addTo(_markerLayer);
    um.bindPopup(`<strong>You</strong><br>Live location`).openPopup();
  }
  // add place markers (simulate coordinates by offsetting center)
  items.forEach((p, i) => {
    // generate pseudo coordinates if not provided
    let lat = 11.6643 + (Math.random()-0.5)*0.04;
    let lng = 78.1460 + (Math.random()-0.5)*0.04;
    if (p.coords) { lat = p.coords.lat; lng = p.coords.lng; }
    const m = L.marker([lat, lng]).addTo(_markerLayer);
    const popup = `<div style="font-weight:800">${p.name}</div><div style="color:#666">${p.addr || p.address || ''}</div>
      <div style="margin-top:6px;display:flex;gap:8px">
        <a href="tel:${p.phone || p.contact || ''}" style="text-decoration:none;padding:6px 8px;border-radius:8px;background:#fff;border:1px solid #eee">📞 Call</a>
        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name+' '+(p.addr||''))}" target="_blank" style="text-decoration:none;padding:6px 8px;border-radius:8px;background:#fff;border:1px solid #eee">🗺️ Navigate</a>
      </div>`;
    m.bindPopup(popup);
  });
}

function clearLayerMarkers() {
  if (_markerLayer) _markerLayer.clearLayers();
}
