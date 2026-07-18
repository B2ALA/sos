/* =====================================================================
   notifications.js
===================================================================== */

let notificationsManager;

const NOTIF_TYPE_BADGE = {
  info: "mh-badge-blue",
  warning: "mh-badge-orange",
  emergency: "mh-badge-red"
};

(async function init() {
  const authResult = await requireAdmin();
  if (!authResult) return;

  renderSidebar("notifications");
  renderNavbar("Notifications", authResult.admin.email);
  renderFooter();

  notificationsManager = new CrudManager({
    tableName: "notifications",
    idField: "id",
    orderBy: "created_at",
    tableEl: document.getElementById("mh-table-body"),
    emptyMessage: "No notifications sent yet.",
    extraOnInsert: async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      return { sent_by: session ? session.user.id : null };
    },
    columns: [
      { key: "title", label: "Title" },
      { key: "type", label: "Type", render: (val) => `<span class="mh-badge ${NOTIF_TYPE_BADGE[val] || "mh-badge-grey"}">${escapeHtml(val)}</span>` },
      { key: "target", label: "Target" },
      { key: "created_at", label: "Sent", render: (val) => fmtDate(val) }
    ],
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "message", label: "Message", type: "textarea", required: true },
      { key: "type", label: "Type", type: "select", options: ["info", "warning", "emergency"], required: true },
      { key: "target", label: "Send to", type: "select", options: ["all", "volunteers", "hospitals"], required: true }
    ]
  });

  document.getElementById("mh-add-btn").addEventListener("click", () => notificationsManager.openModal(null));
  await notificationsManager.load();
})();
