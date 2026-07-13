// Supabase client configuration.
// Reads credentials from environment variables — never hardcode keys here.
const { createClient } = require("@supabase/supabase-js");
 
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
 
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn(
    "[supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set. " +
    "Set them in your .env file (see .env.example). API routes that touch " +
    "the database will fail until this is configured."
  );
}
 
// Fall back to a syntactically-valid placeholder URL so the client can be
// constructed even before real credentials are supplied. Any actual query
// will fail with a clear network error until real values are set in .env —
// this only prevents a hard crash at server boot.
const supabase = createClient(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_SERVICE_KEY || "placeholder_key",
  { auth: { persistSession: false } }
);
 
module.exports = supabase;

// Supabase client configuration.
// Reads credentials from environment variables — never hardcode keys here.
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn(
    "[supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set. " +
    "Set them in your .env file (see .env.example). API routes that touch " +
    "the database will fail until this is configured."
  );
}

// Fall back to a syntactically-valid placeholder URL so the client can be
// constructed even before real credentials are supplied. Any actual query
// will fail with a clear network error until real values are set in .env —
// this only prevents a hard crash at server boot.
const supabase = createClient(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_SERVICE_KEY || "placeholder_key",
  { auth: { persistSession: false } }
);

module.exports = supabase;
