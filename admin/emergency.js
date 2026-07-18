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
      { key: "lat", label: "Location", render: (val, row) => (row.lat && row.lng) ? `${row.lat.toFixed(4)}, ${row.lng.toFixed(4)}` : "—" },
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
    ]
  });

  document.getElementById("mh-add-btn").addEventListener("click", () => sosManager.openModal(null));
  await sosManager.load();
})();
