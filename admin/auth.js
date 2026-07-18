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
  const {
    data: { session },
    error: sessionError
  } = await supabaseClient.auth.getSession();

  if (sessionError || !session) {
    window.location.href = "login.html";
    return null;
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

  return {
    session,
    admin: adminRow
  };
}
