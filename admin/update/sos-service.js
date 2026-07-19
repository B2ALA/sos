/**
 * sos-service.js
 * ─────────────────────────────────────────────────────────────────────────
 * SINGLE RESPONSIBILITY: build an SOS record and persist it to Supabase's
 * `sos_requests` table. Knows nothing about the DOM, GPS, or geocoding —
 * it just takes finished data in, and returns the saved row out.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { getSosSupabaseClient } from "./supabase-client.js";

const TABLE_NAME = "sos_requests";

export const SOS_ERROR = Object.freeze({
  INSERT_FAILED: "INSERT_FAILED",
  OFFLINE: "OFFLINE",
});

export class SosServiceError extends Error {
  constructor(code, message, cause) {
    super(message);
    this.name = "SosServiceError";
    this.code = code;
    this.cause = cause;
  }
}

/**
 * @typedef {object} SosPayload
 * @property {string} [userId]
 * @property {string} [name]
 * @property {string} [phone]
 * @property {string} emergencyType
 * @property {number} latitude
 * @property {number} longitude
 * @property {string} address
 * @property {string} [message]
 */

/**
 * Reads the currently-registered MediHelp user from localStorage, if any,
 * so the SOS record can be attributed to a real profile. Fails silently
 * (returns null) if nothing is stored — this module must work for
 * anonymous/unregistered users too.
 *
 * @returns {{id:string,name:string,phone:string}|null}
 */
export function getRegisteredUserSnapshot() {
  try {
    const users = JSON.parse(localStorage.getItem("medihelp_users") || "[]");
    const currentId = localStorage.getItem("medihelp_current_user");
    if (!currentId) return null;
    const user = users.find((u) => u.id === currentId);
    if (!user) return null;
    return {
      id: user.id,
      name: (user.personal && user.personal.name) || "",
      phone: (user.personal && user.personal.phone) || "",
    };
  } catch (_err) {
    return null;
  }
}

/**
 * Inserts a new SOS request into Supabase.
 *
 * @param {SosPayload} payload
 * @param {object} [options]
 * @param {number} [options.retries=1]
 * @returns {Promise<object>} the inserted row, as returned by Supabase
 */
export async function submitSosRequest(payload, options = {}) {
  const { retries = 1 } = options;

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new SosServiceError(
      SOS_ERROR.OFFLINE,
      "Device appears to be offline. SOS could not be sent to the server."
    );
  }

  const record = {
    user_id: payload.userId || null,
    name: payload.name || "Unknown",
    phone: payload.phone || "",
    emergency_type: payload.emergencyType || "Other",
    latitude: payload.latitude,
    longitude: payload.longitude,
    address: payload.address || "",
    message: payload.message || "",
    status: "ACTIVE",
    created_at: new Date().toISOString(),
  };

  const client = getSosSupabaseClient();
  let lastError = null;

  for (let attemptNum = 0; attemptNum <= retries; attemptNum++) {
    const { data, error } = await client.from(TABLE_NAME).insert([record]).select().single();

    if (!error) {
      return data;
    }
    lastError = error;
  }

  throw new SosServiceError(
    SOS_ERROR.INSERT_FAILED,
    `Failed to save SOS request after ${retries + 1} attempt(s): ${lastError.message}`,
    lastError
  );
}
