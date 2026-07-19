/**
 * sos-listener.js
 * ─────────────────────────────────────────────────────────────────────────
 * This is the "ActionListener" of the module.
 *
 * In Java you'd write:
 *
 *   button.addActionListener(new ActionListener() {
 *       public void actionPerformed(ActionEvent e) {
 *           // emergency logic
 *       }
 *   });
 *
 * Here, instead of the button knowing about its listener (which would mean
 * editing index.html), the LISTENER finds the button and observes it from
 * the outside — using event delegation at the document level, backed by a
 * MutationObserver in case the button is re-rendered or added later.
 *
 * This file NEVER touches index.html, NEVER removes/replaces the existing
 * inline `onclick="sendEmergency()"` handler, and runs entirely alongside
 * it. Both handlers fire independently on the same click.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { getCurrentLocation, LocationError, LOCATION_ERROR } from "./location-service.js";
import { reverseGeocode, GeocodeError } from "./reverse-geocode.js";
import { submitSosRequest, getRegisteredUserSnapshot, SosServiceError, SOS_ERROR } from "./sos-service.js";
import { showSosToast, playSosSound } from "./notification-service.js";

/**
 * ── CONFIGURATION ──────────────────────────────────────────────────────
 * Adjust selectors/defaults here without touching any orchestration logic.
 */
const CONFIG = Object.freeze({
  // CSS selectors that identify the existing SOS button(s). Both the nav
  // button and the floating mobile button in index.html match one of these.
  buttonSelectors: [".fab-sos", ".nav-cta"],

  // Extra safety check: only treat a matched element as "the SOS button"
  // if its visible text also contains this token (case-insensitive).
  // This avoids accidentally binding to some future unrelated ".nav-cta".
  requiredTextToken: "sos",

  // Default emergency type recorded when the listener fires. The existing
  // sendEmergency() flow lets the user pick a type in its own modal — this
  // module is independent and doesn't have access to that choice, so it
  // records a generic type. Change this if you want a different default,
  // or extend attachListener() to read a type from elsewhere.
  defaultEmergencyType: "SOS - General",

  // Minimum time between two accepted SOS submissions, to guard against
  // rapid/duplicate clicks (e.g. panicked repeated tapping).
  cooldownMs: 8000,

  locationOptions: { timeoutMs: 10000, highAccuracy: true, retries: 1 },
  geocodeOptions: { timeoutMs: 8000, retries: 1 },
  submitOptions: { retries: 1 },
});

/** Module-level state — intentionally NOT on `window`, so zero global pollution. */
let isSubmitting = false;
let lastSubmittedAt = 0;
let boundButtons = new WeakSet();

/**
 * Public entry point. Call this once after the DOM is ready to start
 * observing the existing SOS button(s).
 */
export function attachSosListener() {
  bindToExistingButtons();
  observeForFutureButtons();
}

/**
 * Finds every element currently in the DOM that matches our SOS button
 * criteria and binds a click listener to each (once per element).
 */
function bindToExistingButtons() {
  const candidates = document.querySelectorAll(CONFIG.buttonSelectors.join(","));
  candidates.forEach((el) => bindIfSosButton(el));
}

/**
 * Watches the DOM for nodes added later (e.g. if the button is rendered
 * dynamically, or the page swaps sections via client-side routing) and
 * binds to any newly-appearing SOS buttons automatically.
 */
function observeForFutureButtons() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (matchesSosButton(node)) bindIfSosButton(node);
        node.querySelectorAll?.(CONFIG.buttonSelectors.join(",")).forEach((el) => bindIfSosButton(el));
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * @param {Element} el
 * @returns {boolean} true if `el` matches one of our configured selectors
 *          AND contains the required safety text token.
 */
function matchesSosButton(el) {
  const matchesSelector = CONFIG.buttonSelectors.some((sel) => el.matches?.(sel));
  if (!matchesSelector) return false;
  const text = (el.textContent || "").toLowerCase();
  return text.includes(CONFIG.requiredTextToken);
}

/**
 * Binds a single click listener to `el` if it's a genuine SOS button and
 * hasn't already been bound (WeakSet guard prevents double-binding if the
 * MutationObserver and initial scan both see the same element).
 * @param {Element} el
 */
function bindIfSosButton(el) {
  if (!matchesSosButton(el)) return;
  if (boundButtons.has(el)) return;
  boundButtons.add(el);

  // Plain addEventListener — this ADDS to whatever onclick already exists,
  // it does not replace or remove it.
  el.addEventListener("click", handleSosButtonClick, { passive: true });
}

/**
 * The actual "actionPerformed" equivalent — everything that happens when
 * the SOS button is clicked, from this module's point of view.
 */
async function handleSosButtonClick() {
  const now = Date.now();

  if (isSubmitting) {
    showSosToast("An SOS request is already being sent — please wait…", "info", 2500);
    return;
  }
  if (now - lastSubmittedAt < CONFIG.cooldownMs) {
    const remaining = Math.ceil((CONFIG.cooldownMs - (now - lastSubmittedAt)) / 1000);
    showSosToast(`SOS already sent. Please wait ${remaining}s before sending another.`, "info", 2500);
    return;
  }

  isSubmitting = true;
  showSosToast("📍 Getting your location…", "loading", 0);

  try {
    const location = await getCurrentLocation(CONFIG.locationOptions);

    showSosToast("🗺️ Looking up your address…", "loading", 0);
    const address = await safeReverseGeocode(location.latitude, location.longitude);

    showSosToast("📡 Sending SOS to emergency responders…", "loading", 0);
    const user = getRegisteredUserSnapshot();

    await submitSosRequest(
      {
        userId: user?.id,
        name: user?.name,
        phone: user?.phone,
        emergencyType: CONFIG.defaultEmergencyType,
        latitude: location.latitude,
        longitude: location.longitude,
        address: address.formattedAddress,
        message: "",
      },
      CONFIG.submitOptions
    );

    lastSubmittedAt = Date.now();
    showSosToast("✅ SOS sent! Help has been notified of your location.", "success");
    playSosSound("success");
  } catch (err) {
    handleSosFailure(err);
  } finally {
    isSubmitting = false;
  }
}

/**
 * Wraps reverseGeocode() so that a geocoding failure degrades gracefully
 * instead of blocking the whole SOS submission — the coordinates alone
 * are still enough for responders to locate the user.
 * @param {number} lat
 * @param {number} lng
 */
async function safeReverseGeocode(lat, lng) {
  try {
    return await reverseGeocode(lat, lng, CONFIG.geocodeOptions);
  } catch (err) {
    console.warn("[SOS Module] Reverse geocode failed, falling back to raw coordinates.", err);
    return {
      formattedAddress: `Lat ${lat.toFixed(6)}, Lng ${lng.toFixed(6)} (address lookup failed)`,
    };
  }
}

/**
 * Central error handler — maps every failure type from every downstream
 * service into a clear, user-facing message.
 * @param {Error} err
 */
function handleSosFailure(err) {
  console.error("[SOS Module] SOS submission failed:", err);

  if (err instanceof LocationError) {
    switch (err.code) {
      case LOCATION_ERROR.PERMISSION_DENIED:
        showSosToast("⚠️ Location permission denied. Please enable GPS access and try again.", "error", 5000);
        break;
      case LOCATION_ERROR.UNSUPPORTED:
        showSosToast("⚠️ Your device/browser doesn't support location services.", "error", 5000);
        break;
      case LOCATION_ERROR.TIMEOUT:
        showSosToast("⚠️ Timed out getting your GPS location. Please try again.", "error", 5000);
        break;
      default:
        showSosToast("⚠️ Could not determine your location. Please try again.", "error", 5000);
    }
    playSosSound("error");
    return;
  }

  if (err instanceof GeocodeError) {
    // Should not normally reach here since safeReverseGeocode() catches
    // this — kept for completeness/defensive coding.
    showSosToast("⚠️ Address lookup failed, but your coordinates were still sent.", "error", 4000);
    playSosSound("error");
    return;
  }

  if (err instanceof SosServiceError) {
    if (err.code === SOS_ERROR.OFFLINE) {
      showSosToast("📴 You appear to be offline. Please call your local emergency number directly.", "error", 6000);
    } else {
      showSosToast("⚠️ Could not reach the emergency server. Please try again or call for help directly.", "error", 6000);
    }
    playSosSound("error");
    return;
  }

  showSosToast("⚠️ Something went wrong sending your SOS. Please try again.", "error", 5000);
  playSosSound("error");
}
