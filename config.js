// Central place to point the frontend at your deployed backend.
// For local dev with `vercel dev` or a separate Express server, change this
// to e.g. "http://localhost:5000/api". For a single Vercel deployment where
// the backend is deployed as serverless functions under /api, leave as-is.
window.MEDIHELP_CONFIG = {
  API_BASE_URL: "/api",
  GOOGLE_MAPS_API_KEY: "" // Set this before using live map features
};
