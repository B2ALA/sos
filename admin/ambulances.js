/* =====================================================================
   ambulances.js
===================================================================== */

let ambulancesManager;

const AMBULANCE_STATUS_BADGE = {
  available: "mh-badge-green",
  busy: "mh-badge-orange",
  offline: "mh-badge-grey"
};

(async function init() {
  const authResult = await requireAdmin();
  if (!authResult) return;

  renderSidebar("ambulances");
  renderNavbar("Ambulances", authResult.admin.email);
  renderFooter();

  ambulancesManager = new CrudManager({
    tableName: "ambulances",
    idField: "id",
    orderBy: "updated_at",
    tableEl: document.getElementById("mh-table-body"),
    emptyMessage: "No ambulances added yet.",
    columns: [
      { key: "vehicle_no", label: "Vehicle no." },
      { key: "driver_name", label: "Driver" },
      { key: "phone", label: "Phone" },
      {
        key: "status",
        label: "Status",
        render: (val) => `<span class="mh-badge ${AMBULANCE_STATUS_BADGE[val] || "mh-badge-grey"}">${escapeHtml(val || "offline")}</span>`
      }
    ],
    fields: [
      { key: "vehicle_no", label: "Vehicle number", type: "text", required: true },
      { key: "driver_name", label: "Driver name", type: "text" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["available", "busy", "offline"], required: true },
      { key: "lat", label: "Latitude", type: "number" },
      { key: "lng", label: "Longitude", type: "number" }
    ]
  });

  document.getElementById("mh-add-btn").addEventListener("click", () => ambulancesManager.openModal(null));
  await ambulancesManager.load();
})();
