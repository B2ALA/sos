/* =====================================================================
   auth.js
   Shared authentication + authorization helpers.
   Depends on: supabaseConfig.js (must be loaded first)
===================================================================== */

/**
 * Checks whether there is a valid session and whether
 * the logged-in user is an authorized admin.
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

/**
 * If already logged in as an admin,
 * redirect directly to dashboard.
 */
async function redirectIfLoggedIn() {
  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

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

/**
 * Login using Supabase Authentication.
 */
async function loginWithPassword(email, password) {
  const { data, error } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

  if (error) {
    console.error("Supabase Auth Error:", error);

    return {
      ok: false,
      message: error.message
    };
  }

  const { data: adminRow, error: adminError } = await supabaseClient
    .from("admin_users")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (adminError || !adminRow) {
    await supabaseClient.auth.signOut();

    return {
      ok: false,
      message: "You are not authorized to access the Admin Panel."
    };
  }

  return {
    ok: true
  };
}

/**
 * Logout current admin.
 */
async function logoutAdmin() {
  await supabaseClient.auth.signOut();
  window.location.href = "login.html";
}
