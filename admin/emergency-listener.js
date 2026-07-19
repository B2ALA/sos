/* admin/emergency-listener.js
   Responsibilities:
   - Subscribe to Supabase Realtime for public.sos_requests INSERT/UPDATE/DELETE
   - On events: add/update/remove markers via AdminMap, play siren, show toast, update statistics, insert/update table rows
   - Prevent duplicate subscriptions
*/

(function () {
  if (!window.MediHelp) window.MediHelp = {};
  if (window.MediHelp.EmergencyListener) return;

  let subscription = null;
  let subscribed = false;

  /**
   * Safe helper to play siren and show toast
   * @param {Object} row
   */
  function handleInsert(row) {
    if (window.MediHelp.AdminMap) {
      window.MediHelp.AdminMap.upsertMarker(row);
    }
    if (window.MediHelp.NotificationService) {
      window.MediHelp.NotificationService.toast(`New SOS: ${row.emergency_type} — ${row.name}`, { type: 'danger' });
      window.MediHelp.NotificationService.playSiren();
    }
    if (window.MediHelp.Statistics) {
      window.MediHelp.Statistics.increment('total');
      window.MediHelp.Statistics.increment(row.emergency_type || 'Other');
      window.MediHelp.Statistics.increment('active');
    }
    // Insert table row if table exists
    try {
      const table = document.querySelector('#sos-table tbody');
      if (table) {
        const tr = document.createElement('tr');
        tr.setAttribute('data-sos-id', row.id);
        tr.innerHTML = `
          <td>${escapeHtml(row.id)}</td>
          <td>${escapeHtml(row.name)}</td>
          <td>${escapeHtml(row.phone)}</td>
          <td>${escapeHtml(row.emergency_type)}</td>
          <td>${escapeHtml(row.address)}</td>
          <td>${escapeHtml(new Date(row.created_at).toLocaleString())}</td>
          <td>${escapeHtml(row.status)}</td>
        `;
        table.prepend(tr);
      }
    } catch (e) {
      // ignore DOM errors
    }
  }

  /**
   * Safe helper to update marker and table row
   * @param {Object} row
   */
  function handleUpdate(row) {
    if (window.MediHelp.AdminMap) {
      window.MediHelp.AdminMap.upsertMarker(row);
    }
    if (window.MediHelp.NotificationService) {
      window.MediHelp.NotificationService.toast(`SOS updated: ${row.emergency_type} — ${row.name}`, { type: 'info' });
    }
    if (window.MediHelp.Statistics) {
      // For simplicity, refresh stats from server or adjust counts in a more advanced implementation
      window.MediHelp.Statistics.refresh().catch(() => {});
    }
    // Update table row
    try {
      const tr = document.querySelector(`[data-sos-id="${row.id}"]`);
      if (tr) {
        tr.innerHTML = `
          <td>${escapeHtml(row.id)}</td>
          <td>${escapeHtml(row.name)}</td>
          <td>${escapeHtml(row.phone)}</td>
          <td>${escapeHtml(row.emergency_type)}</td>
          <td>${escapeHtml(row.address)}</td>
          <td>${escapeHtml(new Date(row.created_at).toLocaleString())}</td>
          <td>${escapeHtml(row.status)}</td>
        `;
      }
    } catch (e) {
      // ignore
    }
  }

  /**
   * Safe helper to remove marker and table row
   * @param {Object} row
   */
  function handleDelete(row) {
    if (window.MediHelp.AdminMap) {
      window.MediHelp.AdminMap.removeMarker(row.id);
    }
    if (window.MediHelp.NotificationService) {
      window.MediHelp.NotificationService.toast(`SOS removed: ${row.id}`, { type: 'info' });
    }
    if (window.MediHelp.Statistics) {
      window.MediHelp.Statistics.refresh().catch(() => {});
    }
    try {
      const tr = document.querySelector(`[data-sos-id="${row.id}"]`);
      if (tr && tr.parentNode) tr.parentNode.removeChild(tr);
    } catch (e) {
      // ignore
    }
  }

  /**
   * Escape HTML helper
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
   * Start listening to Supabase realtime events
   */
  async function start() {
    if (subscribed) return;
    if (!window.supabaseClient || !window.supabaseClient.channel && !window.supabaseClient.from) {
      console.warn('MediHelp.EmergencyListener: supabase client not available or incompatible.');
      return;
    }

    try {
      // Use new Realtime API if available
      if (typeof window.supabaseClient.channel === 'function') {
        // Prevent duplicate channel names
        subscription = window.supabaseClient
          .channel('public:sos_requests')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'sos_requests' }, (payload) => {
            const ev = payload.eventType || payload.type || payload.event;
            const record = payload.new || payload.record || payload;
            if (ev === 'INSERT' || ev === 'INSERT') handleInsert(record);
            else if (ev === 'UPDATE') handleUpdate(record);
            else if (ev === 'DELETE') handleDelete(payload.old || payload.record || {});
          })
          .subscribe();
      } else if (typeof window.supabaseClient.from === 'function') {
        // older API
        subscription = window.supabaseClient
          .from('sos_requests')
          .on('INSERT', payload => handleInsert(payload.new))
          .on('UPDATE', payload => handleUpdate(payload.new))
          .on('DELETE', payload => handleDelete(payload.old))
          .subscribe();
      }
      subscribed = true;
    } catch (e) {
      console.error('MediHelp.EmergencyListener start error', e);
    }
  }

  /**
   * Stop listening and cleanup
   */
  async function stop() {
    try {
      if (!subscribed) return;
      if (subscription && typeof subscription.unsubscribe === 'function') {
        await subscription.unsubscribe();
      } else if (window.supabaseClient && typeof window.supabaseClient.removeSubscription === 'function') {
        window.supabaseClient.removeSubscription(subscription);
      }
    } catch (e) {
      // ignore
    } finally {
      subscription = null;
      subscribed = false;
    }
  }

  window.MediHelp.EmergencyListener = {
    start,
    stop,
    _internal: { get subscription() { return subscription; } }
  };

  // Auto-start when admin page loads
  setTimeout(() => {
    // Only start if we detect admin dashboard elements
    if (document.querySelector('#admin-dashboard') || document.querySelector('#sos-table') || document.location.pathname.includes('admin') || document.location.pathname.includes('dashboard')) {
      start().catch(() => {});
    }
  }, 500);
})();
