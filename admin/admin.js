/* =====================================================================
   admin.js
   admin.html is the panel's entry point. It does no rendering of its
   own — it simply decides whether to send the visitor to the
   dashboard (valid admin session) or to login.html (no session, or
   a session that isn't an authorized admin).
===================================================================== */

(async function boot() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = "login.html";
    return;
  }

  const { data: adminRow } = await supabaseClient
    .from("admin_users")
    .select("id")
    .eq("id", session.user.id)
    .maybeSingle();

  if (adminRow) {
    window.location.href = "dashboard.html";
  } else {
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
  }
})();
