/* =====================================================================
   auth.js
   Shared authentication + authorization helpers.
   Depends on: supabase-config.js (must be loaded first)
===================================================================== */

/**
 * Confirms there is a valid Supabase session AND that the signed-in
 * user exists in admin_users (the only source of truth for who is
 * allowed into the panel — no email or UID is hardcoded here).
 * On any failure: signs out, redirects to login.html with a message.
 * Call this at the top of every protected page.
 */
async function requireAdmin() {
const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

if (error) {
  console.error("Supabase Auth Error:", error);
  return {
    ok: false,
    message: error.message
  };
}

  const { data: adminRow, error: adminError } = await supabaseClient
    .from("admin_users")
    .select("id, email")
    .eq("id", session.user.id)
    .maybeSingle();

  if (adminError || !adminRow) {
    await supabaseClient.auth.signOut();
    sessionStorage.setItem("mh_admin_denied", "1");
    window.location.href = "login.html";
    return null;
  }

  return { session, admin: adminRow };
}

/**
 * If a valid admin session already exists, redirect away from login.
 * Call this at the top of login.html only.
 */
async function redirectIfLoggedIn() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;

  const { data: adminRow } = await supabaseClient
    .from("admin_users")
    .select("id")
    .eq("id", session.user.id)
    .maybeSingle();

  if (adminRow) {
    window.location.href = "dashboard.html";
  } else {
    await supabaseClient.auth.signOut();
  }
}

async function loginWithPassword(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
if (error) {
  console.error("Supabase Auth Error:", error);

  return {
    ok: false,
    message: `${error.message} (${error.status ?? "no-status"})`
  };
}

  const { data: adminRow } = await supabaseClient
    .from("admin_users")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!adminRow) {
    await supabaseClient.auth.signOut();
    return { ok: false, message: "You are not authorized to access the Admin Panel." };
  }

  return { ok: true };
}

async function logoutAdmin() {
  await supabaseClient.auth.signOut();
  window.location.href = "login.html";
}
