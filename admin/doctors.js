/* =====================================================================
   doctors.js
===================================================================== */

let doctorsManager;

(async function init() {
  const authResult = await requireAdmin();
  if (!authResult) return;

  renderSidebar("doctors");
  renderNavbar("Doctors", authResult.admin.email);
  renderFooter();

  const { data: hospitals } = await supabaseClient.from("hospitals").select("id, name").order("name");
  const hospitalOptions = (hospitals || []).map((h) => ({ value: h.id, label: h.name }));
  const hospitalNameById = {};
  (hospitals || []).forEach((h) => { hospitalNameById[h.id] = h.name; });

  doctorsManager = new CrudManager({
    tableName: "doctors",
    idField: "id",
    orderBy: "created_at",
    tableEl: document.getElementById("mh-table-body"),
    emptyMessage: "No doctors added yet.",
    columns: [
      { key: "name", label: "Name" },
      { key: "specialty", label: "Specialty" },
      { key: "hospital_id", label: "Hospital", render: (val) => escapeHtml(hospitalNameById[val] || "—") },
      { key: "phone", label: "Phone" },
      {
        key: "available",
        label: "Available",
        render: (val) => val
          ? `<span class="mh-badge mh-badge-green">Available</span>`
          : `<span class="mh-badge mh-badge-grey">Unavailable</span>`
      }
    ],
    fields: [
      { key: "name", label: "Doctor name", type: "text", required: true },
      { key: "specialty", label: "Specialty", type: "text" },
      { key: "hospital_id", label: "Hospital", type: "select", options: hospitalOptions },
      { key: "phone", label: "Phone", type: "text" },
      { key: "available", label: "Available", type: "checkbox" }
    ]
  });

  document.getElementById("mh-add-btn").addEventListener("click", () => doctorsManager.openModal(null));
  await doctorsManager.load();
})();
