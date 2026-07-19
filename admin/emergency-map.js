/* admin/emergency-map.js
   Responsibilities:
   - Initialize Leaflet map and OpenStreetMap tiles
   - Expose window.map
   - Load existing SOS markers from Supabase
   - Support optional clustering if MarkerCluster plugin is present
   - Provide helper to add/update/remove markers
*/

(function () {
  if (!window.MediHelp) window.MediHelp = {};
  if (window.MediHelp.AdminMap) return;

  /**
   * Map state
   */
  const state = {
    map: null,
    markers: new Map(), // id -> marker
    markerLayer: null,
    clusterEnabled: false
  };

  /**
   * Emergency type -> marker options
   */
  const ICONS = {
    Medical: { color: 'green', symbol: '+' },
    Accident: { color: 'orange', symbol: '!' },
    Fire: { color: 'red', symbol: '🔥' },
    Police: { color: 'blue', symbol: '⚑' },
    'Women Safety': { color: 'pink', symbol: '♀' },
    'Child Emergency': { color: 'purple', symbol: '★' },
    Other: { color: 'gray', symbol: '•' }
  };

  /**
   * Create a simple colored divIcon for marker
   * @param {string} type
   * @returns {L.DivIcon}
   */
  function createIcon(type) {
    const meta = ICONS[type] || ICONS.Other;
    const html = `<div class="mh-marker" style="background:${meta.color};color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px">${meta.symbol}</div>`;
    return L.divIcon({
      html,
      className: 'mh-marker-wrapper',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -28]
    });
  }

  /**
   * Escape HTML for popup content
   * @param {string} s
   * @returns {string}
   */
  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"'`=\/]/g, function (c) {
      return ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
      })[c];
    });
  }

  /**
   * Build popup HTML for a sos row
   * @param {Object} row
   * @returns {string}
   */
  function buildPopup(row) {
    const time = new Date(row.created_at).toLocaleString();
    const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(row.latitude + ',' + row.longitude)}`;
    return `
      <div class="mh-popup">
        <div><strong>${escapeHtml(row.name)}</strong> (${escapeHtml(row.phone)})</div>
        <div><em>${escapeHtml(row.emergency_type)}</em></div>
        <div>${escapeHtml(row.address)}</div>
        <div>Time: ${escapeHtml(time)}</div>
        <div>Lat: ${escapeHtml(String(row.latitude))} Lon: ${escapeHtml(String(row.longitude))}</div>
        <div style="margin-top:8px">
          <a href="${navUrl}" target="_blank" rel="noopener">Navigate</a>
          <button data-id="${escapeHtml(row.id)}" class="mh-resolve-btn" style="margin-left:8px">Resolve</button>
        </div>
      </div>
    `;
  }

  /**
   * Add or update a marker for a sos row
   * @param {Object} row
   */
  function upsertMarker(row) {
    if (!row || !row.id) return;
    const existing = state.markers.get(row.id);
    const lat = parseFloat(row.latitude);
    const lon = parseFloat(row.longitude);
    if (isNaN(lat) || isNaN(lon)) return;

    if (existing) {
      existing.setLatLng([lat, lon]);
      existing.setPopupContent(buildPopup(row));
      // update icon if type changed
      existing.setIcon(createIcon(row.emergency_type));
      return;
    }

    const marker = L.marker([lat, lon], { icon: createIcon(row.emergency_type) });
    marker.bindPopup(buildPopup(row), { minWidth: 220 });
    marker.on('click', () => {
      // highlight table row if present
      const rowEl = document.querySelector(`[data-sos-id="${row.id}"]`);
      if (rowEl) {
        document.querySelectorAll('.sos-row--highlight').forEach(el => el.classList.remove('sos-row--highlight'));
        rowEl.classList.add('sos-row--highlight');
        rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    // add to layer
    if (state.clusterEnabled && state.markerLayer && typeof state.markerLayer.addLayer === 'function') {
      state.markerLayer.addLayer(marker);
    } else if (state.markerLayer && typeof state.markerLayer.addLayer === 'function') {
      state.markerLayer.addLayer(marker);
    } else {
      marker.addTo(state.map);
    }

    state.markers.set(row.id, marker);
  }

  /**
   * Remove marker by id
   * @param {string|number} id
   */
  function removeMarker(id) {
    const marker = state.markers.get(id);
    if (!marker) return;
    if (state.clusterEnabled && state.markerLayer && typeof state.markerLayer.removeLayer === 'function') {
      state.markerLayer.removeLayer(marker);
    } else {
      state.map.removeLayer(marker);
    }
    state.markers.delete(id);
  }

  /**
   * Initialize the map inside a container with id 'map' or 'emergency-map'
   * @param {Object} [opts]
   * @param {string} [opts.containerId]
   * @param {number[]} [opts.center]
   * @param {number} [opts.zoom]
   */
  function init(opts = {}) {
    const containerId = opts.containerId || 'emergency-map' || 'map';
    const el = document.getElementById(containerId) || document.getElementById('map') || document.querySelector('.map');
    if (!el) {
      console.warn('MediHelp.AdminMap: map container not found.');
      return;
    }

    // Avoid double init
    if (state.map) return state.map;

    const center = opts.center || [20.5937, 78.9629]; // India center fallback
    const zoom = opts.zoom || 5;

    state.map = L.map(el).setView(center, zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(state.map);

    // Setup marker layer: use cluster if available
    if (window.L && window.L.markerClusterGroup) {
      state.clusterEnabled = true;
      state.markerLayer = window.L.markerClusterGroup();
      state.map.addLayer(state.markerLayer);
    } else {
      state.markerLayer = L.layerGroup().addTo(state.map);
    }

    // Expose map globally
    window.map = state.map;
    return state.map;
  }

  /**
   * Load existing SOS rows from Supabase and add markers
   * @param {Object} [queryOpts] - optional filters
   */
  async function loadExisting(queryOpts = {}) {
    if (!window.supabaseClient) {
      console.warn('MediHelp.AdminMap: supabase client not available.');
      return;
    }
    try {
      const { data, error } = await window.supabaseClient
        .from('sos_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Failed to load SOS rows', error);
        return;
      }
      if (!Array.isArray(data)) return;
      data.forEach(row => upsertMarker(row));
      if (data.length) {
        const last = data[0];
        if (last.latitude && last.longitude) {
          state.map.setView([last.latitude, last.longitude], 12);
        }
      }
    } catch (e) {
      console.error('MediHelp.AdminMap loadExisting error', e);
    }
  }

  window.MediHelp.AdminMap = {
    init,
    loadExisting,
    upsertMarker,
    removeMarker,
    _state: state
  };
})();
