/* =========================================================
   Developer Banner — injected on public pages only.
   Dismissible for the current browser session (sessionStorage),
   never blocks or overlays actual page content.
   ========================================================= */
(function () {
  const DISMISS_KEY = "medihelp_dev_banner_dismissed";
  if (sessionStorage.getItem(DISMISS_KEY) === "1") return;

  const mount = document.getElementById("dev-banner-mount");
  if (!mount) return;

  mount.innerHTML = `
    <div class="dev-banner" role="complementary" aria-label="Developer credit">
      <div class="dev-banner__text">
        <strong>Bala T</strong>
        <span class="dev-banner__dot">•</span>
        <span>Electronics &amp; Communication Engineering Student</span>
        <span class="dev-banner__dot">•</span>
        <span>Full Stack &amp; AI Enthusiast</span>
      </div>
      <div class="dev-banner__links">
        <a href="https://your-portfolio-url.example" target="_blank" rel="noopener">Portfolio</a>
        <a href="https://github.com/your-username" target="_blank" rel="noopener">GitHub</a>
        <a href="https://linkedin.com/in/your-username" target="_blank" rel="noopener">LinkedIn</a>
        <a href="mailto:you@example.com">Email</a>
      </div>
      <button class="dev-banner__close" type="button" aria-label="Dismiss developer banner">&times;</button>
    </div>
  `;

  mount.querySelector(".dev-banner__close").addEventListener("click", () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    mount.innerHTML = "";
  });
})();
