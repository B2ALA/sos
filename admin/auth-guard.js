/* =========================================================
   Admin Auth Guard
   ---------------------------------------------------------
   Included at the top of every page inside /admin/*.
   Client-side checks below are a UX convenience only (fast
   redirect, no flash of protected content). They are NOT a
   security boundary — every admin API call and every
   Supabase table must ALSO be protected server-side via
   Row Level Security policies / backend auth middleware, so
   that a user who bypasses this script (or calls the API
   directly) still cannot read or write admin data.
   ========================================================= */

(async function enforceAdminAccess() {
  const isGateScreen = document.body.hasAttribute("data-gate-screen");

  try {
    // ===============================
    // BACKEND INTEGRATION POINT
    // Replace this with your backend authentication logic.
    // Example: Supabase Auth or REST API
    // ===============================
    const session = await window.MediHelpAPI.getSession();

    if (!session) {
      redirectToLogin();
      return;
    }

    // ===============================
    // BACKEND INTEGRATION POINT
    // Role must be resolved server-side (see supabaseClient.js
    // getCurrentUserRole). Never trust a role value read from
    // localStorage, a cookie, or the JWT payload without
    // verifying it against the backend.
    // ===============================
    const role = await window.MediHelpAPI.getCurrentUserRole();

    if (role !== "admin") {
      showAccessDenied();
      return;
    }

    // Access granted — reveal the panel (it's hidden by default via CSS/attribute).
    document.documentElement.setAttribute("data-admin-verified", "true");
    document.dispatchEvent(new CustomEvent("medihelp:admin-verified", { detail: { session } }));
  } catch (err) {
    console.error("[MediHelp] Auth check failed:", err);
    redirectToLogin();
  }
})();

function redirectToLogin() {
  const next = encodeURIComponent(window.location.pathname);
  window.location.href = `/login.html?next=${next}`;
}

function showAccessDenied() {
  document.documentElement.setAttribute("data-admin-verified", "denied");
  window.location.href = "/403.html";
}
