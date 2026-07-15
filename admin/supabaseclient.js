// ==========================================================================
// MediHelp — Supabase Client Bootstrap
//
// This is the ONLY file that should contain your Supabase project URL and
// public anon key. Both values are safe to expose in frontend code (they are
// designed to be public — Supabase enforces access with Row Level Security
// policies on the backend, not by hiding this key).
//
// Do NOT put a service_role key here or anywhere in frontend code.
// ==========================================================================

// ===============================
// BACKEND INTEGRATION POINT
// Replace the placeholders below with your actual Supabase project values.
// Dashboard -> Project Settings -> API
// ===============================
const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_PUBLIC_KEY";

let supabaseClient = null;

/**
 * Lazily creates and returns a single shared Supabase client instance.
 * Requires the Supabase JS library to be loaded on the page:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
 */
function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  if (typeof window.supabase === "undefined") {
    console.error(
      "Supabase library not found. Include the Supabase JS CDN script before this file."
    );
    return null;
  }

  if (SUPABASE_URL.startsWith("YOUR_") || SUPABASE_ANON_KEY.startsWith("YOUR_")) {
    console.warn(
      "MediHelp: Supabase is not configured yet. Set SUPABASE_URL and SUPABASE_ANON_KEY in js/supabaseClient.js."
    );
  }

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return supabaseClient;
}
