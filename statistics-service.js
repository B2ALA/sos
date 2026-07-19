/* statistics-service.js
   Responsibilities:
   - Maintain and update SOS statistics in real-time
   - Provide increment/decrement and refresh functions
   - Update DOM elements with IDs matching keys (e.g., #stat-total, #stat-active, #stat-medical)
*/

(function () {
  if (!window.MediHelp) window.MediHelp = {};
  if (window.MediHelp.Statistics) return;

  const state = {
    counts: {
      total: 0,
      active: 0,
      resolved: 0,
      Medical: 0,
      Fire: 0,
      Police: 0,
      Accident: 0,
      'Women Safety': 0,
      'Child Emergency': 0,
      Other: 0
    }
  };

  /**
   * Update DOM element for a stat key if present
   * @param {string} key
   */
  function updateDOM(key) {
    try {
      const el = document.querySelector(`#stat-${key.toLowerCase().replace(/\s+/g, '-')}`);
      if (el) el.textContent = String(state.counts[key] || 0);
    } catch (e) { /* ignore */ }
  }

  /**
   * Increment a stat
   * @param {string} key
   * @param {number} [by]
   */
  function increment(key, by = 1) {
    if (!(key in state.counts)) {
      state.counts[key] = 0;
    }
    state.counts[key] += by;
    updateDOM(key);
  }

  /**
   * Decrement a stat
   * @param {string} key
   * @param {number} [by]
   */
  function decrement(key, by = 1) {
    if (!(key in state.counts)) {
      state.counts[key] = 0;
    }
    state.counts[key] = Math.max(0, state.counts[key] - by);
    updateDOM(key);
  }

  /**
   * Refresh statistics from Supabase by aggregating counts
   */
  async function refresh() {
    if (!window.supabaseClient) {
      console.warn('MediHelp.Statistics: supabase client not available.');
      return;
    }
    try {
      // total
      const totalRes = await window.supabaseClient
        .from('sos_requests')
        .select('id', { count: 'exact', head: true });
      if (!totalRes.error) {
        state.counts.total = totalRes.count || 0;
      }

      // active/resolved
      const { data: activeData, error: activeErr } = await window.supabaseClient
        .from('sos_requests')
        .select('id', { count: 'exact' })
        .eq('status', 'ACTIVE');
      if (!activeErr) state.counts.active = activeData?.length || activeData?.count || 0;

      const { data: resolvedData, error: resolvedErr } = await window.supabaseClient
        .from('sos_requests')
        .select('id', { count: 'exact' })
        .eq('status', 'RESOLVED');
      if (!resolvedErr) state.counts.resolved = resolvedData?.length || resolvedData?.count || 0;

      // by type - simple approach: fetch last 1000 and count locally to avoid multiple queries
      const { data: rows, error: rowsErr } = await window.supabaseClient
        .from('sos_requests')
        .select('emergency_type')
        .limit(1000);
      if (!rowsErr && Array.isArray(rows)) {
        // reset
        Object.keys(state.counts).forEach(k => {
          if (k !== 'total' && k !== 'active' && k !== 'resolved') state.counts[k] = 0;
        });
        rows.forEach(r => {
          const t = r.emergency_type || 'Other';
          if (!(t in state.counts)) state.counts[t] = 0;
          state.counts[t] += 1;
        });
      }

      // update DOM for all keys
      Object.keys(state.counts).forEach(k => updateDOM(k));
    } catch (e) {
      console.error('MediHelp.Statistics refresh error', e);
    }
  }

  // Expose API
  window.MediHelp.Statistics = {
    increment,
    decrement,
    refresh,
    _state: state
  };

  // Auto-refresh on load
  setTimeout(() => {
    refresh().catch(() => {});
  }, 1000);
})();
