/* =====================================================================
   emergency.js
===================================================================== */
let sosManager;
const SOS_STATUS_BADGE = {
  active: "mh-badge-red",
  resolved: "mh-badge-green",
  cancelled: "mh-badge-grey"
};
(async function init() {
  const authResult = await requireAdmin();
  if (!authResult) return;
  renderSidebar("emergency");
  renderNavbar("SOS / Emergency", authResult.admin.email);
  renderFooter();

  // Lets emergency-map.js (loaded after this file) know the admin session
  // has been confirmed, so it can safely start querying sos_alerts without
  // hitting the same "queried before getSession() resolved" RLS issue that
  // affected the old standalone live-map page.
  document.dispatchEvent(new CustomEvent("mh-admin-ready"));

  const { data: ambulances } = await supabaseClient.from("ambulances").select("id, vehicle_no").order("vehicle_no");
  const ambulanceOptions = (ambulances || []).map((a) => ({ value: a.id, label: a.vehicle_no || a.id }));
  const ambulanceLabelById = {};
  (ambulances || []).forEach((a) => { ambulanceLabelById[a.id] = a.vehicle_no || a.id; });
  sosManager = new CrudManager({
    tableName: "sos_alerts",
    idField: "id",
    orderBy: "created_at",
    tableEl: document.getElementById("mh-table-body"),
    emptyMessage: "No SOS alerts recorded yet.",
    columns: [
      { key: "emergency_type", label: "Type" },
      {
        key: "lat",
        label: "Location",
        // Placeholder shown immediately (raw coordinates, same as before);
        // afterRender below swaps this span's text for a human-readable
        // address once available. Lat/lng themselves are never touched.
        render: (val, row) => `<span class="mh-loc-cell" data-loc-id="${row.id}">${
          (row.lat != null && row.lng != null) ? `${Number(row.lat).toFixed(4)}, ${Number(row.lng).toFixed(4)}` : "—"
        }</span>`
      },
      { key: "status", label: "Status", render: (val) => `<span class="mh-badge ${SOS_STATUS_BADGE[val] || "mh-badge-grey"}">${escapeHtml(val)}</span>` },
      { key: "responder_id", label: "Responder", render: (val) => escapeHtml(ambulanceLabelById[val] || "Unassigned") },
      { key: "created_at", label: "Raised", render: (val) => fmtDate(val) }
    ],
    fields: [
      { key: "emergency_type", label: "Emergency type", type: "text", required: true },
      { key: "lat", label: "Latitude", type: "number" },
      { key: "lng", label: "Longitude", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["active", "resolved", "cancelled"], required: true },
      { key: "responder_id", label: "Responder (ambulance)", type: "select", options: ambulanceOptions }
    ],
    // Runs after every render (initial load, and after add/edit/delete):
    // fills in each location span with a real address, using the same
    // helper the Dashboard's Active SOS table uses, so both stay consistent.
    afterRender: (rows, tableEl) => {
      rows.forEach((row) => {
        const cell = tableEl.querySelector(`[data-loc-id="${row.id}"]`);
        renderLocationAsync(cell, row);
      });
    }
  });
  document.getElementById("mh-add-btn").addEventListener("click", () => sosManager.openModal(null));
  await sosManager.load();
})();
