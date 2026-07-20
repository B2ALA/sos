/* ============================================================================
   MediHelp — sos-monitor.js
   ----------------------------------------------------------------------------
   PURPOSE
   This file does NOT modify index.html. It attaches to the emergency
   functions that already exist there (handleAccident, handleMedical,
   handleFire, handleOther, activateSOS) the same way you'd attach an
   ActionListener to a button in Java — except instead of adding a listener
   to the DOM element, we wrap the global handler functions themselves,
   since that's how index.html's onclick="" markup calls them.

   Each wrapped function still runs 100% of its original behaviour first
   (opening modals, toasts, etc. — nothing changes visually), and then this
   file additionally:
     1. Gets the browser's GPS coordinates
     2. Reverse-geocodes them into a human-readable address
     3. Inserts a row into public.sos_alerts in Supabase (your real table —
        see sos_alerts_migration.sql for the columns/policy this needs)
     4. The admin panel (admin/sos-live-map.html) picks it up instantly via
        a Supabase Realtime subscription — no polling needed.

   HOW TO INSTALL
   Add exactly ONE line to index.html, right before </body>
   (after your existing <script>...</script> block):

       <script src="sos-monitor.js"></script>

   That's the only change index.html needs.
   ============================================================================ */
(function () {
  'use strict';

  // ── Same Supabase project used by admin/supabase.js ──────────────────────
  const SUPABASE_URL = "https://maanemjludawgpkaaiuf.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYW5lbWpsdWRhd2dwa2FhaXVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzNjE2MDUsImV4cCI6MjA5OTkzNzYwNX0.zaVWddvT6Xs5Q9J37SkTq78gcmu51O9VIW7ZDANxpFE";
  // NOTE: this must be the bare package URL, NOT /dist/umd/supabase.js — that
  // path 404s and was the root cause of the SDK silently failing to load.
  const SUPABASE_JS_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  const DEBUG = true; // set to false to quiet the console once things work

  function log(...args){ if (DEBUG) console.log('[MediHelp SOS]', ...args); }

  let sosClient = null;
  let sdkLoadPromise = null;

  // ── Lazily load the Supabase SDK (index.html doesn't include it by default) ──
  function loadSupabaseSDK() {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      return Promise.resolve(window.supabase);
    }
    if (sdkLoadPromise) return sdkLoadPromise;
    sdkLoadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${SUPABASE_JS_CDN}"]`);
      if (existing) {
        existing.addEventListener('load', () => resolve(window.supabase));
        existing.addEventListener('error', () => reject(new Error('MediHelp SOS: Supabase SDK script tag errored')));
        return;
      }
      const s = document.createElement('script');
      s.src = SUPABASE_JS_CDN;
      s.onload = () => {
        if (!window.supabase || typeof window.supabase.createClient !== 'function') {
          reject(new Error('MediHelp SOS: Supabase SDK loaded but window.supabase.createClient is missing'));
          return;
        }
        resolve(window.supabase);
      };
      s.onerror = () => reject(new Error('MediHelp SOS: failed to load Supabase SDK from CDN — check network/CSP'));
      document.head.appendChild(s);
    });
    return sdkLoadPromise;
  }

  async function getClient() {
    if (sosClient) return sosClient;
    const sb = await loadSupabaseSDK();
    sosClient = sb.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return sosClient;
  }

  // ── Get browser GPS position ──────────────────────────────────────────────
  // NOTE: index.html's own `userLocation` variable is declared with `let` at
  // the top of its inline <script>. That does NOT attach it to `window` (only
  // `var`/function declarations do), so it isn't readable from this separate
  // file — we always request a fresh GPS fix instead, which is also more
  // accurate for a live emergency anyway.
  function getPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported on this device'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        }),
        err => reject(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
      );
    });
  }

  // ── Reverse geocode via OpenStreetMap Nominatim (free, no API key needed) ──
  // Consistent with the rest of the project already using OSM (overpass.js).
  // Wrapped with a hard timeout so a slow/blocked Nominatim call never stalls
  // the actual emergency insert.
  async function reverseGeocode(lat, lng) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' }, signal: controller.signal });
      if (!res.ok) throw new Error('reverse geocode HTTP ' + res.status);
      const data = await res.json();
      return data.display_name || null;
    } catch (e) {
      console.warn('[MediHelp SOS] reverse geocoding failed, continuing with coordinates only', e);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  // ── Pull whatever profile info is already saved locally, if any ────────────
  function getSavedProfile() {
    try {
      const users = JSON.parse(localStorage.getItem('medihelp_users') || '[]');
      const currentId = localStorage.getItem('medihelp_current_user');
      const u = users.find(x => x.id === currentId);
      if (!u) return { name: null, contact: null };
      return {
        name: (u.personal && u.personal.name) || null,
        contact: (u.emergencyContact && u.emergencyContact.phone) || null
      };
    } catch (e) {
      return { name: null, contact: null };
    }
  }

  // ── Core pipeline: GPS → reverse geocode → insert into Supabase ────────────
  async function sendSOSRequest(emergencyType) {
    log('SOS triggered:', emergencyType);

    let client;
    try {
      client = await getClient();
      log('Supabase client ready');
    } catch (e) {
      console.error('[MediHelp SOS] Supabase client unavailable —', e.message);
      return;
    }

    let pos;
    try {
      pos = await getPosition();
      log('GPS position acquired', pos);
    } catch (e) {
      console.error('[MediHelp SOS] could not get GPS location —', e.message || e);
      if (typeof window.toast === 'function') {
        window.toast('⚠️ Could not detect your location — please call the emergency number directly.');
      }
      return;
    }

    const address = await reverseGeocode(pos.lat, pos.lng);
    log('Reverse geocoded address:', address);
    const profile = getSavedProfile();

    // Column names match the real schema: table `sos_alerts`, columns
    // `lat`/`lng` (not latitude/longitude), `created_at` (auto, not sent).
    const row = {
      emergency_type: emergencyType,
      lat: pos.lat,
      lng: pos.lng,
      accuracy: pos.accuracy,
      address: address,
      status: 'active',
      user_name: profile.name,
      user_contact: profile.contact
    };

    log('Inserting row into sos_alerts…', row);
    // NOTE: no .select() here on purpose. RLS only grants the anon role
    // INSERT on sos_alerts (see sos_alerts_migration.sql) — it has no SELECT
    // policy, so asking PostgREST to return the inserted row would fail even
    // though the insert itself succeeds. We don't need the row back anyway.
    const { error } = await client.from('sos_alerts').insert(row);

    if (error) {
      console.error('[MediHelp SOS] insert failed —', error.message, error);
      if (typeof window.toast === 'function') {
        window.toast('⚠️ SOS could not reach our server. Please call 112 directly.');
      }
      return;
    }

    log('✅ Request stored, admin panel notified via realtime');
    if (typeof window.toast === 'function') {
      window.toast('📡 Your location has been sent to the response team.');
    }
  }

  // ── Wrap existing global handler functions (the "action listener" step) ────
  function wrapOnce(fnName, emergencyType) {
    const original = window[fnName];
    if (typeof original !== 'function') return false;
    if (original.__medihelpSosWrapped) return true; // already wrapped, don't double-wrap
    const wrapped = function (...args) {
      const result = original.apply(this, args); // run the original UI behaviour first, unchanged
      sendSOSRequest(emergencyType);              // then report to the admin panel
      return result;
    };
    wrapped.__medihelpSosWrapped = true;
    window[fnName] = wrapped;
    log(`Hooked into ${fnName}() → will report as "${emergencyType}"`);
    return true;
  }

  const TARGETS = [
    ['handleAccident', 'accident'],
    ['handleMedical', 'medical'],
    ['handleFire', 'fire'],
    ['handleOther', 'other'],
    ['activateSOS', 'sos_mode'] // the "🆘 SOS Emergency Mode" contacts-alert button
  ];

  // Retries briefly in case sos-monitor.js happens to load/parse before
  // index.html's inline <script> has finished defining these functions.
  function init(attemptsLeft) {
    const stillMissing = TARGETS.filter(([fnName, type]) => !wrapOnce(fnName, type));
    if (stillMissing.length === 0) {
      log('All SOS triggers hooked successfully. ✅');
      return;
    }
    if (attemptsLeft <= 0) {
      stillMissing.forEach(([fnName]) => {
        console.warn(`[MediHelp SOS] could not find global function "${fnName}" after retrying — ` +
          `make sure <script src="sos-monitor.js"></script> is placed AFTER index.html's main inline <script> block.`);
      });
      return;
    }
    setTimeout(() => init(attemptsLeft - 1), 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(10));
  } else {
    init(10);
  }
})();
