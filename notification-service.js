/* notification-service.js
   Responsibilities:
   - Toast notifications (DOM-based)
   - Browser notifications (permission-aware)
   - Siren audio playback and blink animation
   - Notification history stored in localStorage with unread counter
*/

(function () {
  if (!window.MediHelp) window.MediHelp = {};
  if (window.MediHelp.NotificationService) return;

  const HISTORY_KEY = 'MediHelp:notificationsV1';
  const MAX_HISTORY = 200;

  /**
   * Read history
   * @returns {Array}
   */
  function readHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Write history
   * @param {Array} arr
   */
  function writeHistory(arr) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(arr.slice(-MAX_HISTORY)));
    } catch (e) {
      // ignore
    }
  }

  /**
   * Add to history
   * @param {Object} item
   */
  function addHistory(item) {
    const h = readHistory();
    h.push(Object.assign({ ts: Date.now(), read: false }, item));
    writeHistory(h);
    updateUnreadCounter();
  }

  /**
   * Update unread counter in DOM if element exists
   */
  function updateUnreadCounter() {
    try {
      const h = readHistory();
      const unread = h.filter(i => !i.read).length;
      const el = document.querySelector('#mh-notification-unread');
      if (el) el.textContent = String(unread);
    } catch (e) { /* ignore */ }
  }

  /**
   * Create a simple toast container if not present
   */
  function ensureToastContainer() {
    let container = document.getElementById('mh-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'mh-toast-container';
      container.style.position = 'fixed';
      container.style.right = '16px';
      container.style.bottom = '16px';
      container.style.zIndex = 99999;
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.gap = '8px';
      document.body.appendChild(container);
    }
    return container;
  }

  /**
   * Show a toast
   * @param {string} message
   * @param {{type?:string, timeout?:number}} opts
   */
  function toast(message, opts = {}) {
    const container = ensureToastContainer();
    const el = document.createElement('div');
    el.className = 'mh-toast';
    el.style.minWidth = '220px';
    el.style.padding = '10px 12px';
    el.style.borderRadius = '6px';
    el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    el.style.color = '#fff';
    el.style.fontFamily = 'system-ui, sans-serif';
    el.style.fontSize = '13px';
    const type = opts.type || 'info';
    const bg = type === 'success' ? '#2d9a4a' : type === 'danger' ? '#d9534f' : type === 'warning' ? '#f0ad4e' : '#2b7cff';
    el.style.background = bg;
    el.textContent = message;
    container.appendChild(el);
    const timeout = typeof opts.timeout === 'number' ? opts.timeout : 5000;
    setTimeout(() => {
      el.style.transition = 'opacity 300ms ease, transform 300ms ease';
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      setTimeout(() => {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }, 320);
    }, timeout);
    addHistory({ message, type });
  }

  /**
   * Request browser notification permission if needed
   * @returns {Promise<string>}
   */
  async function requestPermission() {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    try {
      const p = await Notification.requestPermission();
      return p;
    } catch (e) {
      return 'denied';
    }
  }

  /**
   * Show browser notification (if permitted)
   * @param {string} title
   * @param {Object} options
   */
  async function browserNotify(title, options = {}) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') {
      const p = await requestPermission();
      if (p !== 'granted') return;
    }
    try {
      const n = new Notification(title, options);
      n.onclick = function () {
        window.focus();
        if (options.data && options.data.url) {
          window.open(options.data.url, '_blank');
        }
        this.close();
      };
      addHistory({ title, body: options.body || '', type: 'browser' });
    } catch (e) {
      // ignore
    }
  }

  /**
   * Play a short siren sound (uses WebAudio)
   */
  function playSiren() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(600, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.25);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      setTimeout(() => {
        o.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
      }, 300);
      setTimeout(() => {
        try { o.stop(); ctx.close(); } catch (e) { /* ignore */ }
      }, 900);
    } catch (e) {
      // fallback: no audio
    }
  }

  /**
   * Blink animation on a DOM element (e.g., header) for a short time
   * @param {string} selector
   * @param {number} duration
   */
  function blink(selector = '#header', duration = 3000) {
    try {
      const el = document.querySelector(selector);
      if (!el) return;
      el.classList.add('mh-blink');
      setTimeout(() => el.classList.remove('mh-blink'), duration);
    } catch (e) { /* ignore */ }
  }

  // Expose API
  window.MediHelp.NotificationService = {
    toast,
    browserNotify,
    requestPermission,
    playSiren,
    blink,
    readHistory,
    markAllRead: function () {
      const h = readHistory().map(i => Object.assign(i, { read: true }));
      writeHistory(h);
      updateUnreadCounter();
    },
    updateUnreadCounter
  };

  // Minimal CSS for blink and marker (non-invasive)
  (function injectStyles() {
    const css = `
      .mh-blink { animation: mh-blink 800ms ease-in-out infinite; }
      @keyframes mh-blink { 0% { opacity:1 } 50% { opacity:0.2 } 100% { opacity:1 } }
      .mh-marker { box-shadow: 0 1px 3px rgba(0,0,0,0.25); }
    `;
    const s = document.createElement('style');
    s.type = 'text/css';
    s.appendChild(document.createTextNode(css));
    document.head.appendChild(s);
  })();

  // Update unread counter on load
  setTimeout(updateUnreadCounter, 200);
})();
