/* ============================================================================
   emergency-map.js
   ----------------------------------------------------------------------------
   Live Leaflet map + Supabase Realtime for the SOS / Emergency admin page.

   Table: sos_alerts   Columns: lat, lng, created_at, resolved_at,
   emergency_type, status, responder_id, address, accuracy,
   user_name, user_contact.

   Location display: uses row.address if sos-monitor.js already stored one
   at insert time; otherwise falls back to the shared reverseGeocodeDisplay()
   helper from common.js (display-only — lat/lng in the database are never
   modified). The result is cached locally on the row object so re-renders
   (e.g. after a realtime UPDATE) don't refetch it.
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

  function rawCoords(row) {
    return (row.lat != null && row.lng != null) ? `${Number(row.lat).toFixed(5)}, ${Number(row.lng).toFixed(5)}` : '—';
  }

  // Current best label for a row: stored address, or a resolved-and-cached
  // one from a previous reverseGeocodeDisplay() call, or raw coordinates
  // as an immediate placeholder while resolution is still in flight.
  function locationLabel(row) {
    return row.address || rawCoords(row);
  }

  function popupHtml(row, addressText) {
    const s = styleFor(row.emergency_type);
    return `
      <div class="em-popup-title" style="color:${s.color};">${s.label} Emergency</div>
      <div class="em-popup-addr">${escapeHtml(addressText)}</div>
      <button class="em-popup-btn" onclick="window.__emResolve('${row.id}')">Mark Resolved</button>
    `;
  }

  // Kicks off reverse geocoding for a row that has no stored address yet,
  // then updates its marker's popup and the alert panel once resolved.
  // Never touches the database — purely a display-side fill-in.
  function resolveAddressForRow(row) {
    if (row.address || row.lat == null || row.lng == null) return;
    reverseGeocodeDisplay(row.lat, row.lng).then((label) => {
      const text = label || 'Location unavailable';
      // Cache on the row so subsequent renders (realtime updates, list
      // re-renders) reuse it instead of calling Nominatim again.
      if (label) row.address = label;
      const marker = markers[row.id];
      if (marker) {
        const popup = marker.getPopup();
        if (popup) popup.setContent(popupHtml(row, text));
      }
      renderList();
    });
  }

  function upsertMarker(row) {
    if (row.lat == null || row.lng == null) return; // manual rows added without coordinates can't be mapped
    if (markers[row.id]) {
      markers[row.id].setLatLng([row.lat, row.lng]);
    } else {
      const m = L.marker([row.lat, row.lng], { icon: markerIcon(row.emergency_type) }).addTo(map);
      m.on('click', () => selectAlert(row.id));
      markers[row.id] = m;
    }
    markers[row.id].bindPopup(popupHtml(row, locationLabel(row)));
    resolveAddressForRow(row);
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
        // Preserve a locally-cached address across realtime updates —
        // the incoming row from Supabase won't have it unless the DB
        // column itself was populated, but we don't want to re-geocode
        // something we already resolved client-side a moment ago.
        if (!row.address && alerts[row.id] && alerts[row.id].address) {
          row.address = alerts[row.id].address;
        }
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
