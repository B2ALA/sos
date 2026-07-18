/* =====================================================================
   footer.js
   Renders a small footer into <div id="mh-footer"></div>.
===================================================================== */

function renderFooter() {
  const host = document.getElementById("mh-footer");
  if (!host) return;
  const year = new Date().getFullYear();
  host.innerHTML = `<span>MediHelp Admin &middot; Salem, Tamil Nadu &middot; ${year}</span>`;
}
