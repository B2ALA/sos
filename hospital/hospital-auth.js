/* =====================================================================
   hospital-auth.js
   Shared authentication + authorization helpers for the Hospital Portal.
   Mirrors /admin/auth.js's requireAdmin() pattern exactly, but resolves
   identity through hospital_users instead of admin_users.
   Depends on: supabase-config.js (must be loaded first)
===================================================================== */

/**
 * Checks whether there is a valid session and whether the logged-in
 * user is mapped to a hospital via hospital_users. Never trusts a
 * hospital_id from the client — it's always looked up server-side
 * (RLS-enforced) from the authenticated user's own mapping row.
 *
 * IMPORTANT: this must fully resolve (be awaited) before any other
 * Supabase query runs on a hospital-portal page. If a query fires
 * before the session is confirmed, RLS silently returns zero rows
 * rather than an error — it will look like "no data" instead of
 * "not logged in yet".
 */
async function requireHospitalUser() {
  const {
    data: { session },
    error: sessionError
  } = await supabaseClient.auth.getSession();

  if (sessionError || !session) {
    window.location.href = "login.html";
    return null;
  }

  const { data: mappingRow, error: mappingError } = await supabaseClient
    .from("hospital_users")
    .select("id, hospital_id, role")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (mappingError || !mappingRow) {
    await supabaseClient.auth.signOut();
    sessionStorage.setItem("mh_hospital_denied", "1");
    window.location.href = "login.html";
    return null;
  }

  const { data: hospitalRow, error: hospitalError } = await supabaseClient
    .from("hospitals")
    .select("*")
    .eq("id", mappingRow.hospital_id)
    .maybeSingle();

  if (hospitalError || !hospitalRow) {
    // RLS should always allow this given a valid mapping row; if it
    // fails, treat it the same as "not authorized" rather than
    // showing a broken dashboard.
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
    return null;
  }

  return {
    session,
    hospitalUser: mappingRow,
    hospital: hospitalRow
  };
}

/**
 * If already logged in as a hospital user, redirect directly to the
 * dashboard instead of showing the login form again.
 */
async function redirectIfLoggedIn() {
  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (!session) return;

  const { data: mappingRow } = await supabaseClient
    .from("hospital_users")
    .select("id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (mappingRow) {
    window.location.href = "dashboard.html";
  } else {
    await supabaseClient.auth.signOut();
  }
}

/**
 * Login using Supabase Authentication, then confirm the user is
 * actually mapped to a hospital before letting them in.
 */
async function loginWithPassword(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error("Supabase Auth Error:", error);
    return { ok: false, message: error.message };
  }

  const { data: mappingRow, error: mappingError } = await supabaseClient
    .from("hospital_users")
    .select("id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (mappingError || !mappingRow) {
    await supabaseClient.auth.signOut();
    return {
      ok: false,
      message: "This account isn't linked to a hospital. Contact your administrator."
    };
  }

  return { ok: true };
}

/**
 * Logout current hospital user.
 */
async function logoutHospitalUser() {
  await supabaseClient.auth.signOut();
  window.location.href = "login.html";
}
