/* ============================================================================
 * MediHelp Admin — Emergency Page module
 * ----------------------------------------------------------------------------
 * Drop-in module for the EXISTING admin Emergency page. It renders into a
 * single container you already have (or create) in that page:
 *
 *   <div id="mhEmergencyRoot"></div>
 *
 * then:
 *   <link rel="stylesheet" href="emergency-map.css">
 *   <script src="https://unpkg.com/[email protected]/dist/leaflet.js"></script>
 *   <link rel="stylesheet" href="https://unpkg.com/[email protected]/dist/leaflet.css">
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   <script src="supabase-client.js"></script>
 *   <script src="emergency-map.js"></script>
 *   <script>MediHelpEmergency.init('mhEmergencyRoot');</script>
 *
 * Nothing else on the existing admin page is touched.
 * ==========================================================================*/
(function () {
  "use strict";

  const TABLE = "sos_requests";
  const HISTORY_PAGE_SIZE = 25;

  const TYPE_STYLES = {
    "Medical":         { icon: "➕",   color: "#0E7C66" },
    "Fire":            { icon: "🔥",   color: "#D92D20" },
    "Police":          { icon: "🚔",   color: "#1570EF" },
    "Accident":        { icon: "🚗",   color: "#F79009" },
    "Women Safety":    { icon: "🛡️",  color: "#D6409F" },
    "Child Emergency": { icon: "👶",   color: "#7A5AF8" },
    "Blood Needed":    { icon: "🩸",   color: "#7A271A" },
    "Ambulance":       { icon: "🚑",   color: "#166534" },
    "Disaster":        { icon: "⚠️",   color: "#CA8A04" },
    "Other":           { icon: "❓",   color: "#667085" }
  };

  let map, markers = {};           // id -> {marker, row}
  let allRows = [];                 // everything currently loaded into memory
  let activeFilters = { types: new Set(), status: "ALL", today: false };
  let searchQuery = "";
  let historyOffset = 0;
  let historyExhausted = false;
  let audioCtx = null;

  function sb() { return window.supabaseClient; }

  // ── Public entry point ──────────────────────────────────────────────────
  async function init(rootId) {
    const root = document.getElementById(rootId);
    if (!root) { console.error("MediHelpEmergency.init: container #" + rootId + " not found"); return; }

    // Optional but recommended: only logged-in admins may view this page.
    if (sb()) {
      const { data } = await sb().auth.getSession();
      if (!data || !data.session) {
        console.warn("MediHelpEmergency: no active admin session. Showing page anyway — wire up your own redirect if needed.");
        // Example: window.location.href = 'login.html'; return;
      }
    }

    root.className = (root.className ? root.className + " " : "") + "mh-em";
    root.innerHTML = template();

    buildMap();
    wireToolbar();
    await loadActive();
    await loadStats();
    await loadHistoryPage();
    subscribeRealtime();
  }

  function template() {
    return `
      <div class="stat-grid" id="mhStatGrid"></div>

      <div class="toolbar">
        <input type="text" id="mhSearch" placeholder="Search name, phone, type, address…">
        <select id="mhStatusFilter">
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <div class="chip-filter" data-today>📅 Today only</div>
        <button class="toolbar-btn grey" id="mhExportBtn">⬇️ Export CSV</button>
      </div>
      <div class="toolbar" id="mhTypeChips"></div>

      <div class="map-wrap">
        <div class="map-live-badge"><span class="live-dot"></span> Live</div>
        <div id="mhEmMap"></div>
      </div>

      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Time</th><th>Name</th><th>Phone</th><th>Emergency</th>
            <th>Address</th><th>Status</th><th>Action</th>
          </tr></thead>
          <tbody id="mhTableBody"><tr class="empty-row"><td colspan="7">Loading…</td></tr></tbody>
        </table>
        <div class="load-more-wrap"><button class="toolbar-btn grey" id="mhLoadMoreBtn">Load older history</button></div>
      </div>`;
  }

  function buildMap() {
    map = L.map("mhEmMap").setView([11.6643, 78.1460], 12); // Salem, TN default center
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);
  }

  function divIconFor(type) {
    const s = TYPE_STYLES[type] || TYPE_STYLES.Other;
    return L.divIcon({
      className: "",
      html: `<div class="mh-em-marker" style="background:${s.color}"><span>${s.icon}</span></div>`,
      iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -32]
    });
  }

  // ── Data loading ─────────────────────────────────────────────────────────
  async function loadActive() {
    const { data, error } = await sb().from(TABLE)
      .select("*").in("status", ["ACTIVE", "IN_PROGRESS"]).order("created_at", { ascending: false });
    if (error) { console.error(error); return; }
    (data || []).forEach(addOrUpdateRow);
    renderTable();
  }

  async function loadHistoryPage() {
    if (historyExhausted) return;
    const { data, error } = await sb().from(TABLE)
      .select("*").in("status", ["RESOLVED", "ARCHIVED"])
      .order("created_at", { ascending: false })
      .range(historyOffset, historyOffset + HISTORY_PAGE_SIZE - 1);
    if (error) { console.error(error); return; }
    if (!data || data.length < HISTORY_PAGE_SIZE) historyExhausted = true;
    historyOffset += (data || []).length;
    (data || []).forEach(addOrUpdateRow);
    renderTable();
  }

  async function loadStats() {
    const grid = document.getElementById("mhStatGrid");
    const counts = await Promise.all([
      countWhere({}),
      countWhere({ emergency_type: "Medical" }),
      countWhere({ emergency_type: "Fire" }),
      countWhere({ emergency_type: "Police" }),
      countWhere({ status: "RESOLVED" }),
      countWhere({ statusIn: ["ACTIVE", "IN_PROGRESS"] }),
      countWhere({ today: true })
    ]);
    const [total, medical, fire, police, resolved, active, today] = counts;
    grid.innerHTML = [
      ["Total Emergencies", total], ["Medical Cases", medical], ["Fire Cases", fire],
      ["Police Cases", police], ["Resolved Cases", resolved], ["Active Cases", active],
      ["Today's Cases", today]
    ].map(([lbl, num]) => `<div class="stat-card"><span class="s-num">${num}</span><span class="s-lbl">${lbl}</span></div>`).join("");
  }

  async function countWhere(cond) {
    let q = sb().from(TABLE).select("*", { count: "exact", head: true });
    if (cond.emergency_type) q = q.eq("emergency_type", cond.emergency_type);
    if (cond.status) q = q.eq("status", cond.status);
    if (cond.statusIn) q = q.in("status", cond.statusIn);
    if (cond.today) {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      q = q.gte("created_at", start.toISOString());
    }
    const { count, error } = await q;
    if (error) { console.error(error); return 0; }
    return count || 0;
  }

  // ── Realtime ─────────────────────────────────────────────────────────────
  function subscribeRealtime() {
    sb().channel("sos-requests-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: TABLE }, (payload) => {
        addOrUpdateRow(payload.new);
        renderTable();
        notify(payload.new);
        loadStats();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: TABLE }, (payload) => {
        addOrUpdateRow(payload.new);
        renderTable();
        loadStats();
      })
      .subscribe();
  }

  function notify(row) {
    playBeep();
    toast(`🆘 New ${row.emergency_type} Emergency\n${row.name || "Unknown"} — ${row.address || "Location pending"}`);
  }

  function playBeep() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = "sine"; o.frequency.value = 880;
      g.gain.setValueAtTime(0.15, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(); o.stop(audioCtx.currentTime + 0.5);
    } catch (e) { /* audio not available — non-fatal */ }
  }

  function toast(msg) {
    let t = document.getElementById("mhEmToastEl");
    if (!t) { t = document.createElement("div"); t.id = "mhEmToastEl"; t.className = "mh-em-toast"; document.body.appendChild(t); }
    t.style.whiteSpace = "pre-line";
    t.textContent = msg;
    t.classList.add("on");
    setTimeout(() => t.classList.remove("on"), 4500);
  }

  // ── Row / marker bookkeeping ────────────────────────────────────────────
  function addOrUpdateRow(row) {
    const i = allRows.findIndex(r => r.id === row.id);
    if (i >= 0) allRows[i] = row; else allRows.unshift(row);

    // markers: only ACTIVE/IN_PROGRESS shown on map; remove marker once resolved/archived
    if (markers[row.id]) { map.removeLayer(markers[row.id]); delete markers[row.id]; }
    if (row.status === "ACTIVE" || row.status === "IN_PROGRESS") {
      const m = L.marker([row.latitude, row.longitude], { icon: divIconFor(row.emergency_type) })
        .addTo(map).bindPopup(popupHtml(row));
      markers[row.id] = m;
    }
  }

  function popupHtml(row) {
    const s = TYPE_STYLES[row.emergency_type] || TYPE_STYLES.Other;
    const time = row.created_at ? new Date(row.created_at).toLocaleString() : "—";
    return `
      <div class="mh-em-popup">
        <h4>${s.icon} ${row.emergency_type} Emergency</h4>
        <div class="row"><span>Name</span><span>${row.name || "—"}</span></div>
        <div class="row"><span>Phone</span><span>${row.phone || "—"}</span></div>
        <div class="row"><span>Address</span><span>${row.address || "—"}</span></div>
        <div class="row"><span>Lat, Lng</span><span>${row.latitude.toFixed(5)}, ${row.longitude.toFixed(5)}</span></div>
        <div class="row"><span>Time</span><span>${time}</span></div>
        <div class="row"><span>Status</span><span class="badge badge-${row.status}">${row.status}</span></div>
        ${row.message ? `<div class="row"><span>Message</span><span>${row.message}</span></div>` : ""}
        <div class="actions">
          <a href="https://www.google.com/maps?q=${row.latitude},${row.longitude}" target="_blank" style="background:#EFF8FF;color:#175CD3;">Open Maps</a>
          ${row.status !== "RESOLVED" ? `<button onclick="MediHelpEmergency.resolve('${row.id}')" style="background:#D1FADF;color:#05603A;">Resolve</button>` : ""}
        </div>
      </div>`;
  }

  // ── Table rendering (with filters + search applied) ─────────────────────
  function renderTable() {
    const tbody = document.getElementById("mhTableBody");
    const rows = filteredRows();
    if (!rows.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="7">No emergencies match your filters.</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map(r => {
      const s = TYPE_STYLES[r.emergency_type] || TYPE_STYLES.Other;
      const time = r.created_at ? new Date(r.created_at).toLocaleString() : "—";
      return `
        <tr data-id="${r.id}">
          <td>${time}</td>
          <td>${r.name || "—"}</td>
          <td>${r.phone || "—"}</td>
          <td>${s.icon} ${r.emergency_type}</td>
          <td>${r.address || "—"}</td>
          <td><span class="badge badge-${r.status}">${r.status}</span></td>
          <td onclick="event.stopPropagation()">
            <button class="act-btn" onclick="MediHelpEmergency.locate('${r.id}')">Locate</button>
            ${r.status !== "RESOLVED" && r.status !== "ARCHIVED" ? `<button class="act-btn resolve" onclick="MediHelpEmergency.resolve('${r.id}')">Resolve</button>` : ""}
          </td>
        </tr>`;
    }).join("");

    tbody.querySelectorAll("tr[data-id]").forEach(tr => {
      tr.addEventListener("click", () => locate(tr.getAttribute("data-id")));
    });
  }

  function filteredRows() {
    return allRows.filter(r => {
      if (activeFilters.types.size && !activeFilters.types.has(r.emergency_type)) return false;
      if (activeFilters.status !== "ALL" && r.status !== activeFilters.status) return false;
      if (activeFilters.today) {
        const d = new Date(r.created_at);
        const now = new Date();
        if (d.toDateString() !== now.toDateString()) return false;
      }
      if (searchQuery) {
        const hay = [r.name, r.phone, r.emergency_type, r.status, r.address, r.created_at].join(" ").toLowerCase();
        if (!hay.includes(searchQuery)) return false;
      }
      return true;
    });
  }

  // ── Toolbar wiring ───────────────────────────────────────────────────────
  function wireToolbar() {
    const chipWrap = document.getElementById("mhTypeChips");
    chipWrap.innerHTML = Object.keys(TYPE_STYLES).map(t =>
      `<div class="chip-filter" data-type="${t}">${TYPE_STYLES[t].icon} ${t}</div>`).join("");

    chipWrap.querySelectorAll("[data-type]").forEach(chip => {
      chip.addEventListener("click", () => {
        const t = chip.getAttribute("data-type");
        chip.classList.toggle("active");
        if (activeFilters.types.has(t)) activeFilters.types.delete(t); else activeFilters.types.add(t);
        renderTable();
      });
    });

    document.querySelector("[data-today]").addEventListener("click", (e) => {
      activeFilters.today = !activeFilters.today;
      e.currentTarget.classList.toggle("active");
      renderTable();
    });

    document.getElementById("mhStatusFilter").addEventListener("change", (e) => {
      activeFilters.status = e.target.value; renderTable();
    });

    document.getElementById("mhSearch").addEventListener("input", (e) => {
      searchQuery = e.target.value.toLowerCase().trim(); renderTable();
    });

    document.getElementById("mhLoadMoreBtn").addEventListener("click", loadHistoryPage);
    document.getElementById("mhExportBtn").addEventListener("click", exportCsv);
  }

  // ── Actions ──────────────────────────────────────────────────────────────
  function locate(id) {
    const row = allRows.find(r => r.id === id);
    if (!row) return;
    map.setView([row.latitude, row.longitude], 16);
    if (markers[id]) markers[id].openPopup();
    else L.popup().setLatLng([row.latitude, row.longitude]).setContent(popupHtml(row)).openOn(map);
  }

  async function resolve(id) {
    const handledBy = (await currentAdminEmail()) || "admin";
    const { error } = await sb().from(TABLE).update({
      status: "RESOLVED", resolved_at: new Date().toISOString(), handled_by: handledBy
    }).eq("id", id);
    if (error) { console.error(error); toast("⚠️ Could not update status."); return; }
    map.closePopup();
  }

  async function currentAdminEmail() {
    if (!sb()) return null;
    const { data } = await sb().auth.getSession();
    return data && data.session ? data.session.user.email : null;
  }

  function exportCsv() {
    const rows = filteredRows();
    const header = ["Time", "Name", "Phone", "Emergency Type", "Address", "Latitude", "Longitude", "Status", "Message", "Handled By"];
    const lines = [header.join(",")];
    rows.forEach(r => {
      const line = [
        r.created_at, r.name, r.phone, r.emergency_type, r.address,
        r.latitude, r.longitude, r.status, r.message, r.handled_by
      ].map(v => `"${(v == null ? "" : String(v)).replace(/"/g, '""')}"`).join(",");
      lines.push(line);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `medihelp-emergencies-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  window.MediHelpEmergency = { init, resolve, locate };
})();
