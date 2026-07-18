/* =====================================================================
   volunteers.js
===================================================================== */

let volunteersManager;

(async function init() {
  const authResult = await requireAdmin();
  if (!authResult) return;

  renderSidebar("volunteers");
  renderNavbar("Volunteers", authResult.admin.email);
  renderFooter();

  volunteersManager = new CrudManager({
    tableName: "volunteers",
    idField: "id",
    orderBy: "created_at",
    tableEl: document.getElementById("mh-table-body"),
    emptyMessage: "No volunteers added yet.",
    columns: [
      { key: "name", label: "Name" },
      { key: "role", label: "Role" },
      { key: "area", label: "Area" },
      { key: "phone", label: "Phone" },
      {
        key: "status",
        label: "Status",
        render: (val) => val === "active"
          ? `<span class="mh-badge mh-badge-green">Active</span>`
          : `<span class="mh-badge mh-badge-grey">Inactive</span>`
      }
    ],
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "phone", label: "Phone", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "role", label: "Role", type: "text" },
      { key: "area", label: "Area", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["active", "inactive"], required: true }
    ]
  });

  document.getElementById("mh-add-btn").addEventListener("click", () => volunteersManager.openModal(null));
  await volunteersManager.load();
})();
