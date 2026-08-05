/* ============================================================================
   emergency-map.js
   ----------------------------------------------------------------------------
   Live Leaflet map + Supabase Realtime for the SOS / Emergency admin page.

   This is the fixed, integrated version of the old standalone
   sos-live-map.html script. Differences from that file:
     - Uses the supabaseClient already created by supabase-config.js (loaded
       by emergency.html before this file) — no more broken
       <script src="supabase.js"> reference, no duplicate SDK loading.
     - Calls the shared requireAdmin() from auth.js instead of a bare
       getSession() check, so it behaves like every other admin page
       (redirects to login.html if not authenticated).
     - Adds responder assignment (responder_id -> ambulances.id), which the
       CRUD table in emergency.js already supports but the old map did not.
     - Does NOT touch the existing CrudManager-based table lower on the page
       (that stays exactly as emergency.js already defines it).

   Table: sos_alerts   Columns: lat, lng, created_at, resolved_at,
   emergency_type, status, responder_id, address, accuracy,
   user_name, user_contact.
   ============================================================================ */

(function () {
  'use strict';

  const TYPE_STYLE = {
    medical:  { color: '#D92D20', label: 'Medical'  },
    accident: { color: '#F79009', label: 'Accident' },
    fire:     { color: '#EF6C00', label: 'Fire'     },
    other:    { color: '#1570EF', label: 'Other'    },
    sos_mode: { color: '#6941C6', label: 'SOS Mode' },
  };
  function styleFor(type) { return TYPE_STYLE[type] || TYPE_STYLE.other; }

  let map = null;
  const markers = {};      // id -> Leaflet marker
  let alerts = {};         // id -> row data
  let ambulanceOptionsHtml = '';
  const ambulanceLabelById = {};
  let mapChannel = null;

  function markerIcon(type) {
    const s = styleFor(type);
    return L.divIcon({
      className: '',
      html: `<div class="em-pulse-marker" style="background:${s.color};color:${s.color};"></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });
  }

  function timeAgo(iso) {
    const diff = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (diff < 60) return diff + 's ago';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    return Math.floor(diff / 3600) + 'h ago';
  }

  function locationLabel(row) {
    return row.address || ((row.lat != null && row.lng != null) ? `${row.lat.toFixed(5)}, ${row.lng.toFixed(5)}` : '—');
  }

  function upsertMarker(row) {
    if (row.lat == null || row.lng == null) return; // manual rows added without coordinates can't be mapped
    const s = styleFor(row.emergency_type);
    if (markers[row.id]) {
      markers[row.id].setLatLng([row.lat, row.lng]);
    } else {
      const m = L.marker([row.lat, row.lng], { icon: markerIcon(row.emergency_type) }).addTo(map);
      m.on('click', () => selectAlert(row.id));
      markers[row.id] = m;
    }
    markers[row.id].bindPopup(`
      <div class="em-popup-title" style="color:${s.color};">${s.label} Emergency</div>
      <div class="em-popup-addr">${escapeHtml(locationLabel(row))}</div>
      <button class="em-popup-btn" onclick="window.__emResolve('${row.id}')">Mark Resolved</button>
    `);
  }

  function removeMarker(id) {
    if (markers[id]) { map.removeLayer(markers[id]); delete markers[id]; }
  }

  function selectAlert(id) {
    document.querySelectorAll('.em-alert-card').forEach(el => el.classList.remove('selected'));
    const card = document.getElementById('em-card-' + id);
    if (card) { card.classList.add('selected'); card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    const row = alerts[id];
    if (row && markers[id] && row.lat != null && row.lng != null) {
      map.setView([row.lat, row.lng], 15, { animate: true });
      markers[id].openPopup();
    }
  }

  async function resolveAlert(id) {
    const { error } = await supabaseClient
      .from('sos_alerts')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      console.error('[MediHelp Admin] Failed to resolve alert —', error.message, error);
      if (typeof toast === 'function') toast(`Could not resolve alert: ${error.message}`, 'error');
      return;
    }
    if (typeof toast === 'function') toast('Alert marked resolved.', 'success');
  }
  window.__emResolve = resolveAlert; // used by the inline popup button above

  async function assignResponder(id, ambulanceId) {
    const { error } = await supabaseClient
      .from('sos_alerts')
      .update({ responder_id: ambulanceId || null })
      .eq('id', id);
    if (error) {
      console.error('[MediHelp Admin] Failed to assign responder —', error.message, error);
      if (typeof toast === 'function') toast(`Could not assign responder: ${error.message}`, 'error');
    } else if (typeof toast === 'function') {
      toast('Responder updated.', 'success');
    }
  }
  window.__emAssignResponder = assignResponder;

  function renderList() {
    const list = document.getElementById('em-alert-list');
    if (!list) return;
    const rows = Object.values(alerts)
      .filter(r => r.status === 'active')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const countEl = document.getElementById('em-live-count');
    if (countEl) countEl.textContent = rows.length;

    if (!rows.length) {
      list.innerHTML = '<div class="em-empty-state">✅ No active SOS alerts right now.</div>';
      return;
    }

    list.innerHTML = rows.map(row => {
      const s = styleFor(row.emergency_type);
      return `
        <div class="em-alert-card" id="em-card-${row.id}" onclick="window.__emSelect && window.__emSelect('${row.id}')">
          <div class="em-ac-top">
            <span class="em-ac-type" style="background:${s.color};">${escapeHtml(s.label)}</span>
            <span class="em-ac-time">${timeAgo(row.created_at)}</span>
          </div>
          <div class="em-ac-addr">📍 ${escapeHtml(locationLabel(row))}</div>
          <div class="em-ac-meta">
            ${row.user_name ? `<span class="em-ac-badge">👤 ${escapeHtml(row.user_name)}</span>` : ''}
            ${row.user_contact ? `<span class="em-ac-badge">📞 ${escapeHtml(row.user_contact)}</span>` : ''}
            ${row.accuracy ? `<span class="em-ac-badge">±${Math.round(row.accuracy)}m</span>` : ''}
          </div>
          <label class="em-ac-responder">
            <span>Responder</span>
            <select onclick="event.stopPropagation()" onchange="event.stopPropagation();window.__emAssignResponder('${row.id}', this.value)">
              <option value="">Unassigned</option>
              ${ambulanceOptionsHtml.replace(
                `value="${row.responder_id}"`,
                `value="${row.responder_id}" selected`
              )}
            </select>
          </label>
          <div class="em-ac-actions">
            <button class="em-ac-btn em-ac-resolve" onclick="event.stopPropagation();window.__emResolve('${row.id}')">✅ Mark Resolved</button>
          </div>
        </div>`;
    }).join('');
  }
  window.__emSelect = selectAlert;

  setInterval(renderList, 30000); // keep "time ago" labels fresh without refetching

  async function loadActive() {
    const { data, error } = await supabaseClient
      .from('sos_alerts')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[MediHelp Admin] Failed to load sos_alerts —', error.message, error);
      const list = document.getElementById('em-alert-list');
      if (list) list.innerHTML = `<div class="em-empty-state">⚠️ Could not load alerts.<br><small>${escapeHtml(error.message)}</small></div>`;
      return;
    }

    alerts = {};
    data.forEach(row => { alerts[row.id] = row; upsertMarker(row); });
    renderList();

    const withCoords = Object.values(markers);
    if (withCoords.length) {
      const group = L.featureGroup(withCoords);
      map.fitBounds(group.getBounds().pad(0.3));
    }
  }

  function subscribeRealtime() {
    mapChannel = supabaseClient
      .channel('sos_alerts_admin_map')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sos_alerts' }, payload => {
        const row = payload.new;
        alerts[row.id] = row;
        if (row.status === 'active') {
          upsertMarker(row);
          if (row.lat != null && row.lng != null) map.panTo([row.lat, row.lng], { animate: true });
        }
        renderList();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sos_alerts' }, payload => {
        const row = payload.new;
        alerts[row.id] = row;
        if (row.status === 'active') {
          upsertMarker(row);
        } else {
          removeMarker(row.id);
        }
        renderList();
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[MediHelp Admin] Realtime subscription failed — check that Realtime replication is enabled for sos_alerts.');
        }
      });
  }

  window.addEventListener('beforeunload', () => {
    if (mapChannel) supabaseClient.removeChannel(mapChannel);
  });

  async function initMap() {
    map = L.map('em-map').setView([11.6643, 78.1460], 13); // Salem, Tamil Nadu
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    const { data: ambulances } = await supabaseClient.from('ambulances').select('id, vehicle_no').order('vehicle_no');
    (ambulances || []).forEach(a => { ambulanceLabelById[a.id] = a.vehicle_no || a.id; });
    ambulanceOptionsHtml = (ambulances || [])
      .map(a => `<option value="${a.id}">${escapeHtml(a.vehicle_no || a.id)}</option>`)
      .join('');

    await loadActive();
    subscribeRealtime();
  }

  // Boot: waits for requireAdmin() (called by emergency.js) to have resolved
  // a session before touching sos_alerts, same rule that fixed the original
  // standalone map page — otherwise RLS silently filters everything out.
  document.addEventListener('mh-admin-ready', initMap, { once: true });
})();
