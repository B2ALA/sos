/* =====================================================================
   login.js
===================================================================== */

(async function init() {
  await redirectIfLoggedIn();

  if (sessionStorage.getItem("mh_admin_denied")) {
    showError("You are not authorized to access the Admin Panel.");
    sessionStorage.removeItem("mh_admin_denied");
  }
})();

function showError(msg) {
  const el = document.getElementById("mh-login-error");
  el.textContent = msg;
  el.hidden = false;
}

function hideError() {
  document.getElementById("mh-login-error").hidden = true;
}

document.getElementById("mh-login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();

  const form = new FormData(e.target);
  const email = form.get("email").trim();
  const password = form.get("password");

  const submitBtn = e.target.querySelector("button[type='submit']");
  submitBtn.disabled = true;
  submitBtn.textContent = "Signing in…";

  const result = await loginWithPassword(email, password);

  if (result.ok) {
    window.location.href = "dashboard.html";
    return;
  }

  showError(result.message);
  submitBtn.disabled = false;
  submitBtn.textContent = "Sign in";
});
