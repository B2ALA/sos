/* =========================================================
   BACKEND INTEGRATION POINT — Supabase Client
   ---------------------------------------------------------
   This is the ONLY place a Supabase project URL and public
   anon key should ever be configured. The anon key is safe
   to expose in frontend code (it is designed for this), but
   it must NEVER be the service_role key, and no user
   passwords or admin secrets belong here or anywhere else
   in this codebase.

   1. Create a project at https://supabase.com
   2. Enable Email/Password auth under Authentication > Providers
   3. Paste your Project URL + anon public key below
   4. Import the Supabase JS SDK in your HTML before this file:
        <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
   ========================================================= */

const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL"; // e.g. https://xxxxx.supabase.co
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_PUBLIC_KEY";

// ===============================
// BACKEND INTEGRATION POINT
// Replace this with your backend authentication logic.
// Example: Supabase Auth or REST API
// ===============================
let supabaseClient = null;

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  if (typeof window.supabase === "undefined") {
    console.warn(
      "[MediHelp] Supabase SDK not loaded. Add the Supabase <script> tag " +
      "before js/supabaseClient.js, then set SUPABASE_URL / SUPABASE_ANON_KEY above."
    );
    return null;
  }

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabaseClient;
}

/* -------------------------------------------------------
   Thin auth/data facade used by every page in this project.
   Every function below is a clearly marked seam: swap the
   body for a Supabase call or a REST fetch() to your own
   backend — the rest of the UI never needs to change.
   ------------------------------------------------------- */
const MediHelpAPI = {
  /**
   * Sign in with email + password.
   * BACKEND INTEGRATION POINT — password validation happens
   * entirely on the backend (Supabase Auth or your API).
   * Never validate credentials in the browser.
   */
  async signIn(email, password) {
    const client = getSupabaseClient();
    if (!client) throw new Error("Backend not configured.");
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data; // { user, session }
  },

  async signOut() {
    const client = getSupabaseClient();
    if (!client) return;
    await client.auth.signOut();
  },

  /** Returns the current authenticated session, or null. */
  async getSession() {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data.session || null;
  },

  /**
   * BACKEND INTEGRATION POINT — role-based access control.
   * The client must never decide who is an admin. Look this
   * up server-side, e.g. a `profiles` table with a `role`
   * column, gated by Row Level Security, or a custom claim
   * on the Supabase JWT.
   */
  async getCurrentUserRole() {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data: sessionData } = await client.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return null;

    // Example shape — replace with your real table/columns:
    // const { data, error } = await client
    //   .from("profiles")
    //   .select("role")
    //   .eq("id", user.id)
    //   .single();
    // return error ? null : data.role;

    return null; // no client-side fallback — unresolved role must never mean "admin"
  },

  // ---- Dashboard / analytics ----
  // BACKEND INTEGRATION POINT — replace with Supabase queries
  // (e.g. client.from('users').select('*', {count:'exact'})) or REST calls.
  async getDashboardStats() { return null; },
  async getAnalytics(range) { return null; },

  // ---- Users ----
  async listUsers(filters) { return null; },
  async suspendUser(userId) { return null; },
  async activateUser(userId) { return null; },
  async deleteUser(userId) { return null; },
  async resetUserPassword(userId) { return null; }, // backend-triggered email, never a plaintext reset

  // ---- Hospitals ----
  async listHospitals() { return null; },
  async createHospital(payload) { return null; },
  async updateHospital(id, payload) { return null; },
  async deleteHospital(id) { return null; },

  // ---- Blood banks ----
  async listBloodBanks() { return null; },
  async createBloodBank(payload) { return null; },
  async updateBloodBank(id, payload) { return null; },
  async deleteBloodBank(id) { return null; },

  // ---- Volunteers ----
  async listVolunteers() { return null; },
  async approveVolunteer(id) { return null; },
  async rejectVolunteer(id) { return null; },
  async suspendVolunteer(id) { return null; },

  // ---- SOS alerts ----
  // BACKEND INTEGRATION POINT — pair this with Supabase Realtime
  // (client.channel('sos_alerts').on('postgres_changes', ...)) for live updates.
  async listActiveSOSAlerts() { return null; },
  async acceptSOSAlert(id) { return null; },
  async rejectSOSAlert(id) { return null; },
  async resolveSOSAlert(id) { return null; },
  subscribeToSOSAlerts(onInsert) {
    const client = getSupabaseClient();
    if (!client) return null;
    return client
      .channel("sos_alerts_live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sos_alerts" }, onInsert)
      .subscribe();
  },

  // ---- Global search ----
  async globalSearch(query) { return null; },

  // ---- Notifications ----
  async listNotifications() { return null; },
};

window.MediHelpAPI = MediHelpAPI;
window.getSupabaseClient = getSupabaseClient;
