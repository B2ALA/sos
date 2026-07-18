const SUPABASE_URL = "https://maanemjludawgpkaaiuf.supabase.co";

const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYW5lbWpsdWRhd2dwa2FhaXVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzNjE2MDUsImV4cCI6MjA5OTkzNzYwNX0.zaVWddvT6Xs5Q9J37SkTq78gcmu51O9VIW7ZDANxpFE";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});
