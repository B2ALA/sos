/* ============================================================================
 * MediHelp — SOS Module (public website)
 * ----------------------------------------------------------------------------
 * A separate, self-contained module. It does NOT modify index.html — it
 * injects its own modal into the page at runtime and exposes a small API:
 *
 *   MediHelpSOS.open()
 *       Opens the full SOS flow: GPS → reverse geocode → pick emergency
 *       type → name/phone/message → save to Supabase → success message.
 *
 *   MediHelpSOS.recordFromExisting({ type, lat, lng, message, name, phone })
 *       For sites (like the current index.html) that already have their own
 *       SOS UI and already have a lat/lng in hand — call this to just persist
 *       the record to Supabase without showing another modal on top of yours.
 *
 * Requires: shared/supabase-client.js (or your own) loaded first, so that
 * `window.supabaseClient` exists.
 * ==========================================================================*/
(function () {
  "use strict";

  const TABLE = "sos_requests";

  // Marker/type styling lives here too so the public form and the admin map
  // agree on the same list — see docs/INTEGRATION_GUIDE.md.
  const EMERGENCY_TYPES = [
    { key: "Medical",         icon: "➕",    color: "#0E7C66" },
    { key: "Fire",             icon: "🔥",    color: "#D92D20" },
    { key: "Police",           icon: "🚔",    color: "#1570EF" },
    { key: "Accident",         icon: "🚗💥",  color: "#F79009" },
    { key: "Women Safety",     icon: "🛡️",   color: "#D6409F" },
    { key: "Child Emergency",  icon: "👶",    color: "#7A5AF8" },
    { key: "Blood Needed",     icon: "🩸",    color: "#7A271A" },
    { key: "Ambulance",        icon: "🚑",    color: "#166534" },
    { key: "Disaster",         icon: "⚠️",    color: "#CA8A04" },
    { key: "Other",            icon: "❓",    color: "#667085" }
  ];

  let mounted = false;
  let state = { lat: null, lng: null, address: null, type: null, geoError: null };

  function client() {
    if (!window.supabaseClient) {
      console.error("MediHelpSOS: window.supabaseClient not found. Load shared/supabase-client.js first.");
    }
    return window.supabaseClient;
  }

  // ── Build the modal once ────────────────────────────────────────────────
  function mount() {
    if (mounted) return;
    mounted = true;

    const wrap = document.createElement("div");
    wrap.className = "mh-sos";
    wrap.innerHTML = `
      <div class="mh-backdrop" id="mhSosBackdrop">
        <div class="mh-box">
          <div class="mh-head">
            <h3>🆘 SOS Emergency</h3>
            <button class="mh-close" id="mhSosClose">✕</button>
          </div>
          <div class="mh-body" id="mhSosBody"><!-- rendered by renderStep() --></div>
        </div>
      </div>`;
    document.body.appendChild(wrap);

    document.getElementById("mhSosClose").addEventListener("click", close);
    document.getElementById("mhSosBackdrop").addEventListener("click", (e) => {
      if (e.target.id === "mhSosBackdrop") close();
    });
  }

  function open() {
    mount();
    state = { lat: null, lng: null, address: null, type: null, geoError: null };
    document.getElementById("mhSosBackdrop").classList.add("on");
    renderGeoStep();
    requestGPS();
  }

  function close() {
    const b = document.getElementById("mhSosBackdrop");
    if (b) b.classList.remove("on");
  }

  // ── Step 1: GPS + reverse geocode ───────────────────────────────────────
  function renderGeoStep() {
    document.getElementById("mhSosBody").innerHTML = `
      <div class="mh-geo" id="mhGeoBar"><span class="ico">📍</span>
        <div class="txt"><strong>Getting your location…</strong>Please allow location access</div>
      </div>
      <p class="mh-sub">We need your GPS location so responders can find you. This only takes a second.</p>`;
  }

  function requestGPS() {
    if (!navigator.geolocation) {
      state.geoError = "Geolocation not supported on this device.";
      return renderTypeStep();
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        state.lat = pos.coords.latitude;
        state.lng = pos.coords.longitude;
        await reverseGeocode(state.lat, state.lng);
        renderTypeStep();
      },
      () => {
        state.geoError = "Location access denied. You can still report — an admin will need to call you back for the address.";
        renderTypeStep();
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function reverseGeocode(lat, lng) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      state.address = data && data.display_name ? data.display_name : null;
    } catch (e) {
      console.warn("MediHelpSOS: reverse geocode failed", e);
      state.address = null;
    }
  }

  // ── Step 2: choose emergency type ───────────────────────────────────────
  function renderTypeStep() {
    const geoHtml = state.lat
      ? `<div class="mh-geo ok"><span class="ico">✅</span>
           <div class="txt"><strong>Location found</strong>${state.address ? state.address : state.lat.toFixed(4) + ", " + state.lng.toFixed(4)}</div>
         </div>`
      : `<div class="mh-geo err"><span class="ico">⚠️</span>
           <div class="txt"><strong>Location unavailable</strong>${state.geoError || "Could not get GPS location"}</div>
           <button class="retry" id="mhRetryGeo">Retry</button>
         </div>`;

    document.getElementById("mhSosBody").innerHTML = `
      ${geoHtml}
      <p class="mh-sub">Select the type of emergency:</p>
      <div class="mh-type-grid" id="mhTypeGrid">
        ${EMERGENCY_TYPES.map(t => `
          <div class="mh-type-tile" data-type="${t.key}" style="color:${t.color}">
            <span class="ti">${t.icon}</span>${t.key}
          </div>`).join("")}
      </div>`;

    const retry = document.getElementById("mhRetryGeo");
    if (retry) retry.addEventListener("click", () => { renderGeoStep(); requestGPS(); });

    document.querySelectorAll("#mhTypeGrid .mh-type-tile").forEach(tile => {
      tile.addEventListener("click", () => {
        state.type = tile.getAttribute("data-type");
        renderDetailsStep();
      });
    });
  }

  // ── Step 3: name / phone / message ──────────────────────────────────────
  function renderDetailsStep() {
    document.getElementById("mhSosBody").innerHTML = `
      <p class="mh-sub"><strong>${state.type}</strong> emergency selected. A few details help responders act fast:</p>
      <input class="mh-input" id="mhName" placeholder="Your name">
      <input class="mh-input" id="mhPhone" placeholder="Phone number" type="tel">
      <textarea class="mh-input" id="mhMsg" placeholder="What's happening? (optional)"></textarea>
      <button class="mh-btn" id="mhSubmitBtn">🆘 Send SOS Now</button>
      <button class="mh-btn grey" id="mhBackBtn">← Back</button>`;

    document.getElementById("mhBackBtn").addEventListener("click", renderTypeStep);
    document.getElementById("mhSubmitBtn").addEventListener("click", submit);
  }

  async function submit() {
    if (!state.lat || !state.lng) {
      // allow submitting without GPS as a last resort (address/manual callback)
      const proceed = confirm("Location wasn't detected. Send SOS anyway?");
      if (!proceed) return;
    }
    const btn = document.getElementById("mhSubmitBtn");
    btn.disabled = true;
    btn.textContent = "Sending…";

    const payload = {
      name: document.getElementById("mhName").value || null,
      phone: document.getElementById("mhPhone").value || null,
      emergency_type: state.type,
      latitude: state.lat,
      longitude: state.lng,
      address: state.address,
      message: document.getElementById("mhMsg").value || null,
      status: "ACTIVE"
    };

    const { error } = await client().from(TABLE).insert(payload);

    if (error) {
      console.error("MediHelpSOS: insert failed", error);
      btn.disabled = false;
      btn.textContent = "🆘 Send SOS Now";
      toast("⚠️ Couldn't send SOS. Check your connection and try again.");
      return;
    }

    renderSuccessStep();
    toast("✅ SOS sent — help is on the way.");
    setTimeout(close, 3000);
  }

  function renderSuccessStep() {
    document.getElementById("mhSosBody").innerHTML = `
      <div class="mh-success">
        <div class="chk">✅</div>
        <h4>SOS Sent</h4>
        <p>Your ${state.type.toLowerCase()} emergency and location have been shared with MediHelp responders. Stay safe — help is on the way.</p>
      </div>`;
  }

  // ── For pages (like the existing index.html) that already collect lat/lng
  // via their own SOS UI and just want the record saved to Supabase too. ────
  async function recordFromExisting({ type, lat, lng, message, name, phone } = {}) {
    if (!type || lat == null || lng == null) {
      console.error("MediHelpSOS.recordFromExisting: type, lat and lng are required");
      return { error: "missing_fields" };
    }
    let address = null;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, { headers: { "Accept-Language": "en" } });
      const data = await res.json();
      address = data && data.display_name ? data.display_name : null;
    } catch (e) { /* non-fatal */ }

    const { error } = await client().from(TABLE).insert({
      name: name || null,
      phone: phone || null,
      emergency_type: type,
      latitude: lat,
      longitude: lng,
      address,
      message: message || null,
      status: "ACTIVE"
    });
    if (error) console.error("MediHelpSOS.recordFromExisting: insert failed", error);
    return { error };
  }

  // ── Minimal toast fallback (skipped if the host page has its own #toast) ─
  function toast(msg) {
    const existing = document.getElementById("toast");
    if (existing) { // reuse the site's own toast element if present
      existing.textContent = msg;
      existing.classList.add("on");
      setTimeout(() => existing.classList.remove("on"), 3500);
      return;
    }
    let t = document.getElementById("mhSosToastEl");
    if (!t) {
      t = document.createElement("div");
      t.id = "mhSosToastEl";
      t.className = "mh-sos-toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("on");
    setTimeout(() => t.classList.remove("on"), 3500);
  }

  window.MediHelpSOS = { open, close, recordFromExisting, EMERGENCY_TYPES };
})();
