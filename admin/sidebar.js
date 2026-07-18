/* =====================================================================
   sidebar.js
   Renders the left navigation into <div id="mh-sidebar"></div>.
   Call renderSidebar('hospitals') etc. with the current page's key.
===================================================================== */

const MH_NAV_ITEMS = [
  { key: "dashboard",     label: "Dashboard",      href: "dashboard.html",     icon: "M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z" },
  { key: "hospitals",     label: "Hospitals",      href: "hospitals.html",     icon: "M12 2 3 6v6c0 5 3.8 9.4 9 10 5.2-.6 9-5 9-10V6l-9-4Zm0 5v10M8 12h8" },
  { key: "doctors",       label: "Doctors",        href: "doctors.html",       icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9c0-3.9 3.1-7 7-7s7 3.1 7 7" },
  { key: "bloodbanks",    label: "Blood Banks",    href: "bloodbanks.html",    icon: "M12 2s7 7.6 7 12a7 7 0 1 1-14 0c0-4.4 7-12 7-12Z" },
  { key: "ambulances",    label: "Ambulances",     href: "ambulances.html",    icon: "M3 17h1a3 3 0 0 0 6 0h4a3 3 0 0 0 6 0h1v-6l-3-4h-4V7H3v10Zm7-8v4m-2-2h4" },
  { key: "volunteers",    label: "Volunteers",     href: "volunteers.html",    icon: "M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 10v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" },
  { key: "users",         label: "Users",          href: "users.html",         icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7-4h6m-3-3v6" },
  { key: "emergency",     label: "SOS / Emergency",href: "emergency.html",     icon: "M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" },
  { key: "notifications", label: "Notifications",  href: "notifications.html", icon: "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9ZM13.7 21a2 2 0 0 1-3.4 0" },
  { key: "settings",      label: "Settings",       href: "settings.html",      icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 1-.1 1.2l2 1.6-2 3.4-2.4-1a7.5 7.5 0 0 1-2.1 1.2l-.4 2.6H9.6l-.4-2.6a7.5 7.5 0 0 1-2.1-1.2l-2.4 1-2-3.4 2-1.6a7.4 7.4 0 0 1 0-2.4l-2-1.6 2-3.4 2.4 1a7.5 7.5 0 0 1 2.1-1.2l.4-2.6h4.8l.4 2.6a7.5 7.5 0 0 1 2.1 1.2l2.4-1 2 3.4-2 1.6c.07.4.1.8.1 1.2Z" }
];

function renderSidebar(activeKey) {
  const host = document.getElementById("mh-sidebar");
  if (!host) return;

  const items = MH_NAV_ITEMS.map((item) => `
    <a class="mh-nav-item ${item.key === activeKey ? "active" : ""}" href="${item.href}">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${item.icon}"/></svg>
      <span>${item.label}</span>
    </a>`).join("");

  host.innerHTML = `
    <div class="mh-sidebar-brand">
      <div class="mh-sidebar-logo">MH</div>
      <span class="mh-sidebar-title">MediHelp<em>Admin</em></span>
    </div>
    <nav class="mh-sidebar-nav">${items}</nav>
    <button class="mh-sidebar-logout" id="mh-logout-btn">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
      <span>Log out</span>
    </button>`;

  document.getElementById("mh-logout-btn").addEventListener("click", () => {
    if (confirm("Log out of the admin panel?")) logoutAdmin();
  });
}
