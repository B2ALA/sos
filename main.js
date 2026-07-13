/* MediHelp — shared frontend utilities loaded on every page */

// ---------------- API helper ----------------
const MediHelpAPI = {
  base: window.MEDIHELP_CONFIG.API_BASE_URL,

  async request(path, { method = "GET", body, auth = false } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (auth) {
      const token = localStorage.getItem("medihelp_token");
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(this.base + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    let data;
    try { data = await res.json(); } catch (e) { data = { success: false, message: "Invalid server response." }; }
    if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
    return data;
  },

  get(path, auth) { return this.request(path, { method: "GET", auth }); },
  post(path, body, auth) { return this.request(path, { method: "POST", body, auth }); },
  put(path, body, auth) { return this.request(path, { method: "PUT", body, auth }); },
  patch(path, body, auth) { return this.request(path, { method: "PATCH", body, auth }); },
  del(path, auth) { return this.request(path, { method: "DELETE", auth }); }
};

// ---------------- Auth helpers ----------------
const MediHelpAuth = {
  saveSession(token, user) {
    localStorage.setItem("medihelp_token", token);
    localStorage.setItem("medihelp_user", JSON.stringify(user));
  },
  getUser() {
    try { return JSON.parse(localStorage.getItem("medihelp_user")); } catch (e) { return null; }
  },
  isLoggedIn() { return !!localStorage.getItem("medihelp_token"); },
  logout() {
    localStorage.removeItem("medihelp_token");
    localStorage.removeItem("medihelp_user");
    window.location.href = "index.html";
  }
};

// ---------------- Toast ----------------
function showToast(message, type = "info") {
  let toast = document.getElementById("medihelp-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "medihelp-toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = "toast show" + (type === "error" ? " error" : "");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), 3800);
}

// ---------------- Theme toggle (persisted) ----------------
(function initTheme() {
  const saved = localStorage.getItem("medihelp_theme");
  if (saved === "dark") document.documentElement.setAttribute("data-theme", "dark");
})();
function toggleTheme() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  if (isDark) {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("medihelp_theme", "light");
  } else {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("medihelp_theme", "dark");
  }
}

// ---------------- Mobile nav toggle ----------------
function toggleNav() {
  document.querySelector(".nav-links")?.classList.toggle("open");
}

// ---------------- Reflect logged-in state in nav ----------------
document.addEventListener("DOMContentLoaded", () => {
  const authSlot = document.getElementById("nav-auth-slot");
  if (authSlot) {
    if (MediHelpAuth.isLoggedIn()) {
      const user = MediHelpAuth.getUser();
      authSlot.innerHTML = `<a href="#" onclick="MediHelpAuth.logout(); return false;">Log out (${user?.name?.split(" ")[0] || "Account"})</a>`;
    } else {
      authSlot.innerHTML = `<a href="login.html">Log in</a>`;
    }
  }
});

// ---------------- Geolocation helper ----------------
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation is not supported by this browser."));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}
