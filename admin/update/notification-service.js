/**
 * notification-service.js
 * ─────────────────────────────────────────────────────────────────────────
 * SINGLE RESPONSIBILITY: give the user visual/audio feedback about the SOS
 * flow (loading, success, error) WITHOUT touching any existing toast/DOM
 * elements from index.html. Creates and manages its own isolated
 * <div id="sos-module-toast"> so there is zero collision risk with the
 * site's existing #toast element or CSS classes.
 * ─────────────────────────────────────────────────────────────────────────
 */

const TOAST_ID = "sos-module-toast";
let toastTimer = null;

/** Injects the toast element + its scoped styles once, lazily. */
function ensureToastElement() {
  let el = document.getElementById(TOAST_ID);
  if (el) return el;

  const style = document.createElement("style");
  style.textContent = `
    #${TOAST_ID} {
      position: fixed;
      bottom: 22px;
      left: 50%;
      transform: translate(-50%, 40px);
      z-index: 99999;
      background: #101828;
      color: #fff;
      padding: 13px 20px;
      border-radius: 12px;
      font-family: -apple-system, "Inter", sans-serif;
      font-size: 13.5px;
      font-weight: 600;
      box-shadow: 0 12px 24px rgba(16,24,40,.25);
      max-width: 320px;
      opacity: 0;
      transition: transform .25s ease, opacity .25s ease;
      pointer-events: none;
      border-left: 4px solid #0E7C66;
    }
    #${TOAST_ID}.on {
      transform: translate(-50%, 0);
      opacity: 1;
    }
    #${TOAST_ID}.sos-error   { border-left-color: #D92D20; }
    #${TOAST_ID}.sos-success { border-left-color: #12A187; }
    #${TOAST_ID}.sos-loading { border-left-color: #F79009; }
  `;
  document.head.appendChild(style);

  el = document.createElement("div");
  el.id = TOAST_ID;
  document.body.appendChild(el);
  return el;
}

/**
 * @param {string} message
 * @param {"loading"|"success"|"error"|"info"} [type="info"]
 * @param {number} [durationMs=3500] pass 0 to keep visible until replaced
 */
export function showSosToast(message, type = "info", durationMs = 3500) {
  const el = ensureToastElement();
  el.textContent = message;
  el.classList.remove("sos-error", "sos-success", "sos-loading");
  if (type === "error") el.classList.add("sos-error");
  if (type === "success") el.classList.add("sos-success");
  if (type === "loading") el.classList.add("sos-loading");

  el.classList.add("on");

  if (toastTimer) clearTimeout(toastTimer);
  if (durationMs > 0) {
    toastTimer = setTimeout(() => el.classList.remove("on"), durationMs);
  }
}

export function hideSosToast() {
  const el = document.getElementById(TOAST_ID);
  if (el) el.classList.remove("on");
}

/**
 * Plays a short confirmation beep using the Web Audio API — no external
 * audio file/asset required, so this module has zero extra dependencies.
 * @param {"success"|"error"} [tone="success"]
 */
export function playSosSound(tone = "success") {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = tone === "success" ? 880 : 220;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (_err) {
    // Audio is a nice-to-have; never let it break the SOS flow.
  }
}
