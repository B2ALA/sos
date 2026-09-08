/* =====================================================================
   login.js — Hospital Portal
   Depends on: supabase-config.js, hospital-auth.js (loaded first)
===================================================================== */

(async function init() {
  // If a denial was flagged by requireHospitalUser()/loginWithPassword()
  // on a previous attempt, surface it once, then clear it.
  if (sessionStorage.getItem("mh_hospital_denied")) {
    toast("You are not authorized to access the Hospital Portal.", "error");
    sessionStorage.removeItem("mh_hospital_denied");
  }

  await redirectIfLoggedIn();
})();

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const btn = document.getElementById("loginBtn");

  btn.disabled = true;
  btn.textContent = "Logging in…";

  const result = await loginWithPassword(email, password);

  if (!result.ok) {
    toast(result.message || "Login failed.", "error");
    btn.disabled = false;
    btn.textContent = "Log in";
    return;
  }

  window.location.href = "dashboard.html";
});
