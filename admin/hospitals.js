/* =====================================================================
   hospitals.js
===================================================================== */

let hospitalsManager;

(async function init() {
  const authResult = await requireAdmin();
  if (!authResult) return;

  renderSidebar("hospitals");
  renderNavbar("Hospitals", authResult.admin.email);
  renderFooter();

  hospitalsManager = new CrudManager({
    tableName: "hospitals",
    idField: "id",
    orderBy: "created_at",
    tableEl: document.getElementById("mh-table-body"),
    emptyMessage: "No hospitals added yet.",
    columns: [
      { key: "name", label: "Name" },
      { key: "phone", label: "Phone" },
      { key: "icu_beds", label: "ICU beds" },
      { key: "general_beds", label: "General beds" },
      {
        key: "is_verified",
        label: "Verified",
        render: (val) => val
          ? `<span class="mh-badge mh-badge-green">Verified</span>`
          : `<span class="mh-badge mh-badge-grey">Unverified</span>`
      }
    ],
    fields: [
      { key: "name", label: "Hospital name", type: "text", required: true },
      { key: "address", label: "Address", type: "textarea" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "lat", label: "Latitude", type: "number" },
      { key: "lng", label: "Longitude", type: "number" },
      { key: "icu_beds", label: "ICU beds", type: "number" },
      { key: "general_beds", label: "General beds", type: "number" },
      {
        key: "specialties", label: "Specialties (comma-separated)", type: "text",
        format: (val) => Array.isArray(val) ? val.join(", ") : (val || ""),
        parse: (val) => (val || "").split(",").map((s) => s.trim()).filter(Boolean)
      },
      { key: "is_verified", label: "Verified", type: "checkbox" }
    ]
  });

  document.getElementById("mh-add-btn").addEventListener("click", () => hospitalsManager.openModal(null));
  await hospitalsManager.load();
})();
