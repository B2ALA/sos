// ==========================================================================
// MediHelp — Session & Role Helper
// Every function here talks to the real backend (Supabase). Nothing in this
// file simulates login or stores a "logged in" flag on the client — the
// client only ever reflects what the backend last confirmed.
// ==========================================================================

const MediHelpSession = (() => {
  /**
   * Returns the current Supabase auth session, or null if signed out.
   * The session (JWT) is issued and verified entirely by Supabase Auth.
   */
  async function getSession() {
    const client = getSupabaseClient();
    if (!client) return null;

    // ===============================
    // BACKEND INTEGRATION POINT
    // This calls Supabase Auth directly — it is the real session check.
    // ===============================
    const { data, error } = await client.auth.getSession();
    if (error) {
      console.error("MediHelp: failed to read session", error.message);
      return null;
    }
    return data.session;
  }

  /**
   * Looks up the signed-in user's role from the backend.
   * Assumes a `profiles` table keyed by auth user id with a `role` column
   * ("admin" | "volunteer" | "user"), guarded by Row Level Security so a
   * user can only ever read their own row. Adjust the table/column names to
   * match your schema.
   */
  async function getCurrentRole() {
    const client = getSupabaseClient();
    const session = await getSession();
    if (!client || !session) return null;

    // ===============================
    // BACKEND INTEGRATION POINT
    // Role is resolved server-side. Never trust a role value that was only
    // ever stored in localStorage/sessionStorage/a JS variable.
    // ===============================
    const { data, error } = await client
      .from("profiles")
      .select("role, status")
      .eq("id", session.user.id)
      .single();

    if (error) {
      console.error("MediHelp: failed to resolve role", error.message);
      return null;
    }

    if (data.status === "suspended") return "suspended";
    return data.role || "user";
  }

  /**
   * Signs the current user out via the backend and clears the local session
   * cache that Supabase's SDK itself manages (not a custom auth flag).
   */
  async function signOut() {
    const client = getSupabaseClient();
    if (!client) return;
    await client.auth.signOut();
    window.location.href = "/login.html";
  }

  return { getSession, getCurrentRole, signOut };
})();
