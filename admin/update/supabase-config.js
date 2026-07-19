/**
 * supabase-client.js
 * ─────────────────────────────────────────────────────────────────────────
 * SINGLE RESPONSIBILITY: create and expose one shared Supabase client
 * instance for the entire SOS module.
 *
 * This file does NOT touch, redeclare, or conflict with any Supabase client
 * your existing project (e.g. admin panel) may already create elsewhere.
 * It creates its own instance scoped only to this module's imports.
 *
 * Requires the Supabase JS SDK to be loaded on the page BEFORE this module,
 * e.g. via:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 * which exposes the global `window.supabase.createClient(...)`.
 *
 * If you already load supabase-js as an ES module elsewhere, you can swap
 * the import strategy below (see the commented alternative).
 * ─────────────────────────────────────────────────────────────────────────
 */

const SUPABASE_URL = "https://maanemjludawgpkaaiuf.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYW5lbWpsdWRhd2dwa2FhaXVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzNjE2MDUsImV4cCI6MjA5OTkzNzYwNX0.zaVWddvT6Xs5Q9J37SkTq78gcmu51O9VIW7ZDANxpFE";

/**
 * Lazily creates (once) and returns the shared Supabase client for the
 * SOS module. Safe to call multiple times — always returns the same
 * instance (singleton pattern), so no duplicate clients / duplicate
 * realtime sockets are ever created by this module.
 *
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
let _sosClientInstance = null;

export function getSosSupabaseClient() {
  if (_sosClientInstance) return _sosClientInstance;

  if (typeof window === "undefined" || !window.supabase || !window.supabase.createClient) {
    throw new Error(
      "[SOS Module] Supabase SDK not found on window. " +
      "Make sure <script src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'></script> " +
      "is included BEFORE sos-listener.js on the page."
    );
  }

  _sosClientInstance = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  return _sosClientInstance;
}

/*
  ALTERNATIVE (if you prefer the ESM package instead of the CDN UMD build):

  import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
  let _sosClientInstance = null;
  export function getSosSupabaseClient() {
    if (!_sosClientInstance) {
      _sosClientInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { ... });
    }
    return _sosClientInstance;
  }
*/
