/* ============================================================================
 * MediHelp — Shared Supabase Client
 * ----------------------------------------------------------------------------
 * This is your existing supabase.js, kept exactly as-is. It is included here
 * only so this module folder is self-contained and works out of the box.
 *
 * IMPORTANT: If your project already loads its own supabase.js on every page
 * (public site + admin panel), do NOT include this file a second time on the
 * same page — just make sure your existing one loads BEFORE sos-module.js /
 * emergency-map.js, since both look for `window.supabaseClient`.
 *
 * Load order on any page that needs SOS features:
 *   1. <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   2. <script src="supabase-client.js"></script>   (this file, or your existing one)
 *   3. <script src="sos-module.js"></script>        (public site)
 *      -- or --
 *      <script src="emergency-map.js"></script>      (admin Emergency page)
 * ==========================================================================*/

const SUPABASE_URL = "https://maanemjludawgpkaaiuf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYW5lbWpsdWRhd2dwa2FhaXVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzNjE2MDUsImV4cCI6MjA5OTkzNzYwNX0.zaVWddvT6Xs5Q9J37SkTq78gcmu51O9VIW7ZDANxpFE";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});

// Expose on window so other modules (sos-module.js, emergency-map.js) can find it
// regardless of how this file was bundled/loaded.
window.supabaseClient = supabaseClient;
