/* =====================================================================
   navbar.js
   Renders the top bar into <div id="mh-navbar"></div>.
   Call renderNavbar('Page Title', adminEmail).
===================================================================== */

function renderNavbar(pageTitle, adminEmail) {
  const host = document.getElementById("mh-navbar");
  if (!host) return;

  host.innerHTML = `
    <button class="mh-sidebar-toggle" id="mh-sidebar-toggle" aria-label="Toggle menu">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
    </button>
    <h1 class="mh-page-title">${pageTitle}</h1>
    <div class="mh-navbar-right">
      <span class="mh-admin-email">${adminEmail || ""}</span>
      <div class="mh-admin-avatar">${adminEmail ? adminEmail.charAt(0).toUpperCase() : "A"}</div>
    </div>`;

  const toggle = document.getElementById("mh-sidebar-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      document.body.classList.toggle("mh-sidebar-open");
    });
  }
}
