/* =====================================================================
   bloodbanks.js
===================================================================== */

let bloodbanksManager;

(async function init() {
  const authResult = await requireAdmin();
  if (!authResult) return;

  renderSidebar("bloodbanks");
  renderNavbar("Blood Banks", authResult.admin.email);
  renderFooter();

  bloodbanksManager = new CrudManager({
    tableName: "bloodbanks",
    idField: "id",
    orderBy: "updated_at",
    tableEl: document.getElementById("mh-table-body"),
    emptyMessage: "No blood banks added yet.",
    columns: [
      { key: "name", label: "Name" },
      { key: "phone", label: "Phone" },
      {
        key: "blood_stock",
        label: "Stock summary",
        render: (val) => {
          if (!val || typeof val !== "object" || Object.keys(val).length === 0) return "—";
          return Object.entries(val).map(([k, v]) => `${escapeHtml(k)}: ${escapeHtml(v)}`).join(", ");
        }
      },
      { key: "updated_at", label: "Updated", render: (val) => fmtDate(val) }
    ],
    fields: [
      { key: "name", label: "Blood bank name", type: "text", required: true },
      { key: "address", label: "Address", type: "textarea" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "lat", label: "Latitude", type: "number" },
      { key: "lng", label: "Longitude", type: "number" },
      {
        key: "blood_stock",
        label: 'Blood stock JSON — e.g. {"A+":10,"O-":3}',
        type: "textarea",
        format: (val) => (val && typeof val === "object") ? JSON.stringify(val, null, 2) : "{}",
        parse: (val) => {
          try {
            const parsed = JSON.parse(val || "{}");
            return (parsed && typeof parsed === "object") ? parsed : {};
          } catch (e) {
            toast("Blood stock must be valid JSON — saved as empty until fixed.", "error");
            return {};
          }
        }
      }
    ]
  });

  document.getElementById("mh-add-btn").addEventListener("click", () => bloodbanksManager.openModal(null));
  await bloodbanksManager.load();
})();
