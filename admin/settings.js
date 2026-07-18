/* =====================================================================
   settings.js
===================================================================== */

(async function init() {
  const authResult = await requireAdmin();
  if (!authResult) return;

  renderSidebar("settings");
  renderNavbar("Settings", authResult.admin.email);
  renderFooter();

  document.getElementById("mh-settings-email").textContent = authResult.admin.email;

  document.getElementById("mh-reset-btn").addEventListener("click", async () => {
    const statusEl = document.getElementById("mh-reset-status");
    const { error } = await supabaseClient.auth.resetPasswordForEmail(authResult.admin.email);
    statusEl.hidden = false;
    if (error) {
      statusEl.style.color = "var(--red-dark)";
      statusEl.textContent = `Couldn't send reset email: ${error.message}`;
    } else {
      statusEl.style.color = "var(--brand-dark)";
      statusEl.textContent = `Password reset email sent to ${authResult.admin.email}.`;
    }
  });

  document.getElementById("mh-logout-btn2").addEventListener("click", () => {
    if (confirm("Log out of the admin panel?")) logoutAdmin();
  });
})();
