// routes/directory.js
// Public read endpoints for doctors, pharmacies, blood donors, shelters, hospitals, and volunteers.
// Also exports helper functions reused by the SOS module for "nearest X" lookups.

const express = require('express');
const { readJSON, distanceKm } = require('../lib/store');

const router = express.Router();

function withDistance(list, lat, lng) {
  if (lat === undefined || lng === undefined) return list;
  const flat = parseFloat(lat);
  const flng = parseFloat(lng);
  return list
    .map((item) => ({
      ...item,
      distanceKm: +distanceKm(flat, flng, item.latitude, item.longitude).toFixed(2),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

function paginate(list, limit) {
  const n = parseInt(limit, 10);
  return n > 0 ? list.slice(0, n) : list;
}

// ---------------- Doctors ----------------
router.get('/doctors', (req, res) => {
  const { specialization, location, lat, lng, limit = 50 } = req.query;
  let list = readJSON('doctors', []);

  if (specialization) {
    list = list.filter((d) => d.specialization.toLowerCase() === specialization.toLowerCase());
  }
  if (location) {
    list = list.filter((d) => d.location.toLowerCase().includes(location.toLowerCase()));
  }
  list = withDistance(list, lat, lng);
  res.json({ count: list.length, results: paginate(list, limit) });
});

// ---------------- Pharmacies / Medical Stores ----------------
router.get('/pharmacies', (req, res) => {
  const { open24hrs, lat, lng, limit = 50 } = req.query;
  let list = readJSON('pharmacies', []);

  if (open24hrs !== undefined) {
    const want = open24hrs === 'true';
    list = list.filter((p) => p.open24hrs === want);
  }
  list = withDistance(list, lat, lng);
  res.json({ count: list.length, results: paginate(list, limit) });
});

// ---------------- Hospitals ----------------
router.get('/hospitals', (req, res) => {
  const { lat, lng, limit = 50 } = req.query;
  let list = readJSON('hospitals', []);
  list = withDistance(list, lat, lng);
  res.json({ count: list.length, results: paginate(list, limit) });
});

// ---------------- Blood Donors ----------------
router.get('/donors', (req, res) => {
  const { bloodGroup, district, location, availableOnly, lat, lng, limit = 50 } = req.query;
  let list = readJSON('donors', []);

  if (bloodGroup) {
    list = list.filter((d) => d.bloodGroup.toLowerCase() === bloodGroup.toLowerCase());
  }
  if (district) {
    list = list.filter((d) => d.district.toLowerCase() === district.toLowerCase());
  }
  if (location) {
    list = list.filter((d) => d.location.toLowerCase().includes(location.toLowerCase()));
  }
  if (availableOnly === 'true') {
    list = list.filter((d) => d.available);
  }
  list = withDistance(list, lat, lng);
  res.json({ count: list.length, results: paginate(list, limit) });
});

// Emergency blood request — stubbed notification, matches spec's "emergency request" feature
router.post('/donors/request', (req, res) => {
  const { bloodGroup, district, requesterName, requesterPhone } = req.body;
  if (!bloodGroup) return res.status(400).json({ error: 'bloodGroup is required' });

  let list = readJSON('donors', []).filter(
    (d) => d.bloodGroup.toLowerCase() === bloodGroup.toLowerCase() && d.available
  );
  if (district) list = list.filter((d) => d.district.toLowerCase() === district.toLowerCase());

  const matched = list.slice(0, 10);
  matched.forEach((d) =>
    console.log(
      `[BLOOD REQUEST] Notifying ${d.name} (${d.phone}) — ${bloodGroup} needed by ${requesterName || 'a patient'} (${requesterPhone || 'no phone given'})`
    )
  );

  res.json({ matchedCount: matched.length, notified: matched });
});

// ---------------- Shelters ----------------
router.get('/shelters', (req, res) => {
  const { lat, lng, limit = 50 } = req.query;
  let list = readJSON('shelters', []);
  list = withDistance(list, lat, lng);
  res.json({ count: list.length, results: paginate(list, limit) });
});

// ---------------- Volunteers ----------------
router.get('/volunteers', (req, res) => {
  const data = readJSON('volunteers', {});
  res.json(data);
});

// ---- Helpers reused by other route modules (e.g. SOS) ----
function findNearestHospitals(lat, lng, limit = 3) {
  const list = readJSON('hospitals', []);
  return withDistance(list, lat, lng).slice(0, limit);
}

function findNearestVolunteers(type, lat, lng, limit = 3) {
  const data = readJSON('volunteers', {});
  const pool = data[type]
    ? data[type].flatMap((g) => g.members)
    : Object.values(data).flatMap((groups) => groups.flatMap((g) => g.members));
  return withDistance(pool, lat, lng).slice(0, limit);
}

module.exports = { router, findNearestHospitals, findNearestVolunteers };
