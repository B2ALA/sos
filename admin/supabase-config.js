/* =====================================================================
   supabase-config.js
   The ONLY file in /admin that should contain the Supabase URL and
   anon key. Every other module reuses `supabaseClient` from here.
   Requires the Supabase JS CDN script to be loaded before this file:
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
===================================================================== */

const SUPABASE_URL = "https://maanemjludawgpkaaiuf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvcm9jcmt2bmxvaXJnbWl4YXFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTU1MDYsImV4cCI6MjA5NTk5MTUwNn0.JEXmYn1n7a9zxNexA25IwNhDTIxwWEZWT2u6GjHAL_8";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,      // "Remember Me" — session restored after refresh
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});
