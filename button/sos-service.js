/* button/sos-service.js
   Responsibilities:
   - Validate SOS payload
   - Prevent duplicates (same user or same coords within short window)
   - Queue when offline and retry with exponential backoff
   - Insert into public.sos_requests using window.supabaseClient
   - Wrap existing sendEmergency() safely to extend behavior
*/

(function () {
  if (!window.MediHelp) window.MediHelp = {};
  if (window.MediHelp.SOS) return;

  const QUEUE_KEY = 'MediHelp:sosQueueV1';
  const DUPLICATE_WINDOW_MS = 1000 * 60 * 2; // 2 minutes
  const MAX_RETRIES = 5;

  /**
   * Escape HTML to prevent XSS when rendering later
   * @param {string} str
   * @returns {string}
   */
  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"'`=\/]/g, function (s) {
      return ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
      })[s];
    });
  }

  /**
   * Read queue from localStorage
   * @returns {Array}
   */
  function readQueue() {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Write queue to localStorage
   * @param {Array} q
   */
  function writeQueue(q) {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
    } catch (e) {
      // ignore
    }
  }

  /**
   * Add an item to the offline queue
   * @param {Object} item
   */
  function enqueue(item) {
    const q = readQueue();
    q.push(item);
    writeQueue(q);
  }

  /**
   * Pop the next queued item
   * @returns {Object|null}
   */
  function dequeue() {
    const q = readQueue();
    if (!q.length) return null;
    const item = q.shift();
    writeQueue(q);
    return item;
  }

  /**
   * Validate payload shape and required fields
   * @param {Object} payload
   */
  function validatePayload(payload) {
    if (!payload) throw new Error('Empty payload.');
    const required = ['user_id', 'name', 'phone', 'emergency_type', 'latitude', 'longitude', 'address'];
    for (const k of required) {
      if (payload[k] === undefined || payload[k] === null || payload[k] === '') {
        throw new Error(`Missing required field: ${k}`);
      }
    }
    // status must not be 'pending' and must be one of allowed values or default to ACTIVE
    const allowed = ['ACTIVE', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED'];
    if (payload.status && !allowed.includes(payload.status)) {
      throw new Error('Invalid status value.');
    }
    payload.status = payload.status || 'ACTIVE';
    return payload;
  }

  /**
   * Prevent duplicate SOS: checks local recent submissions for same user or same coords
   * @param {Object} payload
   * @returns {boolean} true if duplicate
   */
  function isDuplicate(payload) {
    try {
      const raw = localStorage.getItem('MediHelp:recentSOSes') || '[]';
      const recent = JSON.parse(raw);
      const now = Date.now();
      const keyCoord = `${payload.latitude.toFixed(4)},${payload.longitude.toFixed(4)}`;
      for (const r of recent) {
        if ((now - r.ts) < DUPLICATE_WINDOW_MS) {
          if (payload.user_id && r.user_id && payload.user_id === r.user_id) return true;
          if (r.coord === keyCoord) return true;
        }
      }
      // not duplicate: push to recent
      recent.push({ ts: now, user_id: payload.user_id || null, coord: keyCoord });
      // keep last 20
      while (recent.length > 20) recent.shift();
      localStorage.setItem('MediHelp:recentSOSes', JSON.stringify(recent));
      return false;
    } catch (e) {
      return false;
    }
  }

  /**
   * Insert SOS into Supabase table public.sos_requests
   * @param {Object} payload
   * @returns {Promise<Object>} inserted row
   */
  async function insertSOS(payload) {
    if (!window.supabaseClient) {
      throw new Error('Supabase client not available.');
    }
    // Ensure we never insert "pending"
    if (payload.status === 'pending') payload.status = 'ACTIVE';

    const insertPayload = {
      user_id: payload.user_id || null,
      name: escapeHtml(payload.name || ''),
      phone: escapeHtml(payload.phone || ''),
      emergency_type: payload.emergency_type || 'Other',
      latitude: payload.latitude,
      longitude: payload.longitude,
      address: escapeHtml(payload.address || ''),
      message: escapeHtml(payload.message || ''),
      status: payload.status,
      created_at: new Date().toISOString()
    };

    const { data, error } = await window.supabaseClient
      .from('sos_requests')
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data;
  }

  /**
   * Attempt to send payload with retries and exponential backoff.
   * If offline or network error, enqueue for later.
   * @param {Object} payload
   * @param {number} [attempt=0]
   * @returns {Promise<Object>}
   */
  async function sendWithRetry(payload, attempt = 0) {
    try {
      const result = await insertSOS(payload);
      // success: notify
      if (window.MediHelp.NotificationService) {
        window.MediHelp.NotificationService.toast('SOS sent successfully', { type: 'success' });
      }
      return result;
    } catch (err) {
      // network or supabase error
      const isNetwork = !navigator.onLine || (err && err.message && /network|timeout|failed/i.test(err.message));
      if (isNetwork) {
        // enqueue for offline retry
        enqueue({ payload, attempt: attempt + 1, ts: Date.now() });
        if (window.MediHelp.NotificationService) {
          window.MediHelp.NotificationService.toast('You are offline. SOS queued and will retry automatically.', { type: 'warning' });
        }
        return null;
      }
      // retryable server errors: 5xx or rate limit
      const retryable = attempt < MAX_RETRIES && (err && (err.status >= 500 || /rate limit|429/i.test(err.message)));
      if (retryable) {
        const delay = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 500);
        await new Promise((r) => setTimeout(r, delay));
        return sendWithRetry(payload, attempt + 1);
      }
      // non-retryable: bubble up
      throw err;
    }
  }

  /**
   * Process queued items (called on startup and when online)
   */
  async function processQueue() {
    if (!navigator.onLine) return;
    let item;
    // process sequentially
    while ((item = dequeue())) {
      try {
        await sendWithRetry(item.payload, item.attempt || 0);
      } catch (e) {
        // if still failing and attempts left, re-enqueue with incremented attempt
        const attempts = (item.attempt || 0) + 1;
        if (attempts <= MAX_RETRIES) {
          enqueue({ payload: item.payload, attempt: attempts, ts: Date.now() });
        } else {
          if (window.MediHelp.NotificationService) {
            window.MediHelp.NotificationService.toast('Failed to send queued SOS after multiple attempts.', { type: 'error' });
          }
        }
      }
      // small pause to avoid hammering
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  // Listen for online events to flush queue
  window.addEventListener('online', () => {
    processQueue().catch(() => { /* swallow */ });
  });

  // Try to process queue on load
  setTimeout(() => {
    processQueue().catch(() => { /* swallow */ });
  }, 2000);

  /**
   * Public API: sendSOS(payload)
   * Validates, prevents duplicates, and sends or queues.
   * @param {Object} payload
   * @returns {Promise<Object|null>}
   */
  async function sendSOS(payload) {
    const validated = validatePayload(payload);
    if (isDuplicate(validated)) {
      if (window.MediHelp.NotificationService) {
        window.MediHelp.NotificationService.toast('Duplicate SOS detected. Please wait before sending another.', { type: 'warning' });
      }
      return null;
    }
    // attempt send
    return sendWithRetry(validated, 0);
  }

  /**
   * Wrap existing global sendEmergency function to extend behavior.
   * The wrapper calls the original function and then attempts to ensure the SOS is recorded via our service.
   * This preserves existing behavior while adding validation, duplicate prevention, offline queueing, and reverse geocode fallback.
   */
  function wrapGlobalSendEmergency() {
    try {
      const original = window.sendEmergency;
      if (!original || original.__medihelp_wrapped) {
        // nothing to wrap or already wrapped
        return;
      }

      const wrapper = async function (...args) {
        // Call original first to preserve UX (it may already insert into DB)
        let originalResult;
        try {
          originalResult = await original.apply(this, args);
        } catch (e) {
          // original failed; continue to attempt our flow
          originalResult = null;
        }

        // Attempt to build a payload from arguments or from DOM if original didn't return payload
        // Reasonable default: expect original to have created a payload or DOM fields exist
        let payload = null;
        try {
          // If original returned an object that looks like a payload, use it
          if (originalResult && typeof originalResult === 'object' && originalResult.latitude && originalResult.longitude) {
            payload = originalResult;
          } else if (args && args[0] && typeof args[0] === 'object' && args[0].latitude) {
            payload = args[0];
          } else {
            // Attempt to read common DOM fields (conservative selectors)
            const name = document.querySelector('[name="name"]')?.value || document.querySelector('#sos-name')?.textContent || '';
            const phone = document.querySelector('[name="phone"]')?.value || document.querySelector('#sos-phone')?.textContent || '';
            const emergency_type = document.querySelector('[name="emergency_type"]')?.value || document.querySelector('#sos-type')?.textContent || 'Other';
            const message = document.querySelector('[name="message"]')?.value || '';
            // Try to get coords from MediHelp.GPS or from data attributes
            let lat = null, lon = null;
            const el = document.querySelector('#sos-button') || document.querySelector('.sos-button');
            if (el && el.dataset && el.dataset.lat && el.dataset.lon) {
              lat = parseFloat(el.dataset.lat);
              lon = parseFloat(el.dataset.lon);
            }
            if (!lat && window.MediHelp && window.MediHelp.GPS) {
              try {
                const pos = await window.MediHelp.GPS.getPositionWithFallback();
                lat = pos.latitude;
                lon = pos.longitude;
              } catch (e) {
                // ignore
              }
            }
            // Reverse geocode if address not present
            let address = document.querySelector('[name="address"]')?.value || document.querySelector('#sos-address')?.textContent || '';
            if ((!address || address.trim() === '') && lat && lon && window.MediHelp && window.MediHelp.ReverseGeocode) {
              try {
                const rg = await window.MediHelp.ReverseGeocode.reverseGeocode(lat, lon);
                address = rg.address || '';
              } catch (e) {
                // ignore
              }
            }
            payload = {
              user_id: window.supabaseClient?.auth?.user?.id || null,
              name: name || 'Unknown',
              phone: phone || '',
              emergency_type: emergency_type || 'Other',
              latitude: lat,
              longitude: lon,
              address: address || '',
              message: message || ''
            };
          }
        } catch (e) {
          // if we cannot build payload, just return original result
          return originalResult;
        }

        // If payload lacks coords, try GPS
        if ((!payload.latitude || !payload.longitude) && window.MediHelp && window.MediHelp.GPS) {
          try {
            const pos = await window.MediHelp.GPS.getPositionWithFallback();
            payload.latitude = pos.latitude;
            payload.longitude = pos.longitude;
          } catch (e) {
            // cannot get coords; notify and return original
            if (window.MediHelp.NotificationService) {
              window.MediHelp.NotificationService.toast('Unable to obtain GPS coordinates for SOS.', { type: 'error' });
            }
            return originalResult;
          }
        }

        // Final validation and send via our service
        try {
          await sendSOS(payload);
        } catch (err) {
          if (window.MediHelp.NotificationService) {
            window.MediHelp.NotificationService.toast('Failed to send SOS: ' + (err.message || 'Unknown error'), { type: 'error' });
          }
        }

        return originalResult;
      };

      // mark wrapper to avoid double-wrapping
      wrapper.__medihelp_wrapped = true;
      window.sendEmergency = wrapper;
    } catch (e) {
      // swallow to avoid breaking page
      console.error('MediHelp: failed to wrap sendEmergency', e);
    }
  }

  // Immediately attempt to wrap
  setTimeout(wrapGlobalSendEmergency, 50);

  // Expose public API
  window.MediHelp.SOS = {
    sendSOS,
    processQueue,
    enqueue,
    dequeue,
    readQueue
  };
})();
