/* =====================================================================
   dashboard.js
===================================================================== */

(async function init() {
  const authResult = await requireAdmin();
  if (!authResult) return;

  renderSidebar("dashboard");
  renderNavbar("Dashboard", authResult.admin.email);
  renderFooter();

  await loadStats();
  await loadRecentSos();
})();

async function countRows(table, filter) {
  let query = supabaseClient.from(table).select("*", { count: "exact", head: true });
  if (filter) query = filter(query);
  const { count, error } = await query;
  if (error) {
    console.warn(`Count failed for ${table}:`, error.message);
    return "—";
  }
  return count ?? 0;
}

async function loadStats() {
  const [hospitals, doctors, bloodbanks, ambulances, volunteers, users, activeSos] = await Promise.all([
    countRows("hospitals"),
    countRows("doctors"),
    countRows("bloodbanks"),
    countRows("ambulances"),
    countRows("volunteers"),
    countRows("users"),
    countRows("sos_alerts", (q) => q.eq("status", "active"))
  ]);

  const stats = [
    { label: "Hospitals", value: hospitals },
    { label: "Doctors", value: doctors },
    { label: "Blood banks", value: bloodbanks },
    { label: "Ambulances", value: ambulances },
    { label: "Volunteers", value: volunteers },
    { label: "Registered users", value: users },
    { label: "Active SOS alerts", value: activeSos }
  ];

  document.getElementById("mh-stat-grid").innerHTML = stats.map((s) => `
    <div class="mh-stat-card">
      <div class="mh-stat-label">${s.label}</div>
      <div class="mh-stat-value">${s.value}</div>
    </div>`).join("");
}

async function loadRecentSos() {
  const tbody = document.getElementById("mh-recent-sos");
  const { data, error } = await supabaseClient
    .from("sos_alerts")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    tbody.innerHTML = `<tr><td colspan="4" class="mh-empty">Couldn't load SOS alerts.</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="mh-empty">No active SOS alerts right now.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map((row) => `
    <tr>
      <td>${escapeHtml(row.emergency_type || "—")}</td>
      <td>${row.lat && row.lng ? `${row.lat.toFixed(4)}, ${row.lng.toFixed(4)}` : "—"}</td>
      <td><span class="mh-badge mh-badge-red">Active</span></td>
      <td>${fmtDate(row.created_at)}</td>
    </tr>`).join("");
}
