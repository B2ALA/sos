// ==========================================================================
// MediHelp — Admin Route Guard
//
// IMPORTANT: This client-side check exists only to improve the *experience*
// (avoid flashing admin UI, redirect politely). It is NOT the security
// boundary. Every admin API call and every Supabase table used on these
// pages MUST also be protected by Row Level Security policies / backend
// role checks — a user could disable JavaScript or call your API directly,
// and the backend must refuse them regardless of what this file does.
// ==========================================================================

(async function guardAdminRoute() {
  const gate = document.getElementById("admin-gate");
  if (gate) gate.style.display = "flex"; // full-screen "Checking access…" overlay

  const session = await MediHelpSession.getSession();

  if (!session) {
    window.location.replace("/login.html?next=" + encodeURIComponent(location.pathname));
    return;
  }

  // ===============================
  // BACKEND INTEGRATION POINT
  // Role is fetched from the backend on every load — never cached as the
  // source of truth on the client.
  // ===============================
  const role = await MediHelpSession.getCurrentRole();

  if (role === "suspended") {
    renderDenied("Your account has been suspended. Contact an administrator.");
    return;
  }

  if (role !== "admin") {
    renderDenied("403 — Access Denied. This area is restricted to administrators.");
    return;
  }

  // Access granted: reveal the real admin UI.
  document.documentElement.classList.add("admin-access-granted");
  if (gate) gate.remove();
})();

function renderDenied(message) {
  document.body.innerHTML = `
    <div class="denied-screen">
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
        <circle cx="12" cy="12" r="9.5"/><line x1="8" y1="8" x2="16" y2="16"/><line x1="16" y1="8" x2="8" y2="16"/>
      </svg>
      <h1>Access Denied</h1>
      <p>${message}</p>
      <a class="btn btn-primary" href="/login.html">Return to Login</a>
    </div>`;
}
