/* =====================================================================
   users.js
===================================================================== */

let usersManager;

(async function init() {
  const authResult = await requireAdmin();
  if (!authResult) return;

  renderSidebar("users");
  renderNavbar("Users", authResult.admin.email);
  renderFooter();

  usersManager = new CrudManager({
    tableName: "users",
    idField: "id",
    orderBy: "created_at",
    tableEl: document.getElementById("mh-table-body"),
    emptyMessage: "No users added yet.",
    columns: [
      { key: "full_name", label: "Full name" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "blood_group", label: "Blood group" },
      { key: "created_at", label: "Added", render: (val) => fmtDate(val) }
    ],
    fields: [
      { key: "full_name", label: "Full name", type: "text", required: true },
      { key: "phone", label: "Phone", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "blood_group", label: "Blood group", type: "text" }
    ]
  });

  document.getElementById("mh-add-btn").addEventListener("click", () => usersManager.openModal(null));
  await usersManager.load();
})();
