// server.js
// MediHelp - Emergency SOS System backend
// Plain Node + Express, file-based storage (no DB setup required to run this module standalone).
// Swap the file-storage functions for your real DB (Mongo/Postgres/Firebase) when integrating.

const express = require('express');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

const app = express();
const PORT = process.env.PORT || 5000;

const DATA_FILE = path.join(__dirname, 'data', 'sos-events.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Simple file-based "database" ----------
function loadEvents() {
  if (!fs.existsSync(DATA_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveEvents(events) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(events, null, 2));
}

// ---------- Mock data: emergency contacts / volunteers / hospitals ----------
// Replace with real lookups from your user profile, volunteer, and hospital databases.
const MOCK_EMERGENCY_CONTACTS = [
  { name: 'Primary Contact', phone: '+91-9000000001' },
  { name: 'Secondary Contact', phone: '+91-9000000002' },
];

const MOCK_VOLUNTEERS = {
  medical: [
    { id: 'v1', name: 'Arun (Medical Vol.)', phone: '+91-9111111111', lat: 11.0168, lng: 76.9558 },
    { id: 'v2', name: 'Divya (Medical Vol.)', phone: '+91-9222222222', lat: 11.0200, lng: 76.9600 },
  ],
  fire: [
    { id: 'v3', name: 'Karthik (Fire Vol.)', phone: '+91-9333333333', lat: 11.0100, lng: 76.9500 },
  ],
  rescue: [
    { id: 'v4', name: 'Meena (Rescue Vol.)', phone: '+91-9444444444', lat: 11.0050, lng: 76.9450 },
  ],
};

const MOCK_HOSPITALS = [
  { name: 'City General Hospital', phone: '+91-9555555555', lat: 11.0176, lng: 76.9558 },
  { name: 'Sunrise Multispeciality', phone: '+91-9666666666', lat: 11.0220, lng: 76.9610 },
];

// haversine distance in km
function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearestVolunteers(type, lat, lng, limit = 3) {
  const pool = MOCK_VOLUNTEERS[type] || Object.values(MOCK_VOLUNTEERS).flat();
  return pool
    .map((v) => ({ ...v, distanceKm: +distanceKm(lat, lng, v.lat, v.lng).toFixed(2) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

function findNearestHospitals(lat, lng, limit = 3) {
  return MOCK_HOSPITALS.map((h) => ({
    ...h,
    distanceKm: +distanceKm(lat, lng, h.lat, h.lng).toFixed(2),
  }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

// "Send alert" — stubbed. Wire up an SMS/email/push provider here later
// (e.g. Twilio for SMS, Firebase Cloud Messaging for push, Nodemailer for email).
function sendAlert(channel, target, message) {
  console.log(`[ALERT -> ${channel}] to ${target.name || target.phone}: ${message}`);
  return true;
}

// ---------- Routes ----------

// 1. Trigger a new SOS
app.post('/api/sos', (req, res) => {
  const { emergencyType, lat, lng, userName, userPhone } = req.body;

  if (lat === undefined || lng === undefined || !emergencyType) {
    return res.status(400).json({ error: 'emergencyType, lat and lng are required' });
  }

  const events = loadEvents();
  const id = randomUUID();
  const now = new Date().toISOString();

  const nearestVolunteers = findNearestVolunteers(emergencyType, lat, lng);
  const nearestHospitals = findNearestHospitals(lat, lng);

  const event = {
    id,
    userName: userName || 'Unknown user',
    userPhone: userPhone || null,
    emergencyType,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    locationHistory: [{ lat, lng, timestamp: now }],
    notified: {
      emergencyContacts: MOCK_EMERGENCY_CONTACTS,
      volunteers: nearestVolunteers,
      hospitals: nearestHospitals,
    },
  };

  events[id] = event;
  saveEvents(events);

  // Fire off alerts (stubbed)
  MOCK_EMERGENCY_CONTACTS.forEach((c) =>
    sendAlert('sms', c, `EMERGENCY: ${event.userName} triggered a ${emergencyType} SOS. Track: /track.html?id=${id}`)
  );
  nearestVolunteers.forEach((v) =>
    sendAlert('push', v, `Nearby ${emergencyType} emergency reported. Track: /track.html?id=${id}`)
  );
  nearestHospitals.forEach((h) =>
    sendAlert('call-center', h, `Incoming emergency (${emergencyType}) near your facility.`)
  );

  res.status(201).json(event);
});

// 2. Update live location for an ongoing SOS
app.post('/api/sos/:id/location', (req, res) => {
  const { lat, lng } = req.body;
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }

  const events = loadEvents();
  const event = events[req.params.id];
  if (!event) return res.status(404).json({ error: 'SOS event not found' });

  const now = new Date().toISOString();
  event.locationHistory.push({ lat, lng, timestamp: now });
  event.updatedAt = now;
  saveEvents(events);

  res.json(event);
});

// 3. Get current status / track a specific SOS
app.get('/api/sos/:id', (req, res) => {
  const events = loadEvents();
  const event = events[req.params.id];
  if (!event) return res.status(404).json({ error: 'SOS event not found' });
  res.json(event);
});

// 4. Resolve / cancel an SOS
app.post('/api/sos/:id/resolve', (req, res) => {
  const events = loadEvents();
  const event = events[req.params.id];
  if (!event) return res.status(404).json({ error: 'SOS event not found' });

  event.status = 'resolved';
  event.updatedAt = new Date().toISOString();
  saveEvents(events);

  res.json(event);
});

// 5. Admin-style listing of all SOS events (basic; add real auth before production use)
app.get('/api/sos', (req, res) => {
  const events = loadEvents();
  res.json(Object.values(events).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.listen(PORT, () => {
  console.log(`MediHelp SOS server running on http://localhost:${PORT}`);
});
// server.js
// MediHelp Emergency Platform — main entry point.
// Mounts all feature routers. Plain Node + Express + file-based JSON storage
// (swap lib/store.js's readJSON/writeJSON for a real DB when you're ready).

const express = require('express');
const path = require('path');
const { ensureDefaultAdmin } = require('./lib/auth');

const authRoutes = require('./routes/auth');
const { router: directoryRoutes } = require('./routes/directory');
const sosRoutes = require('./routes/sos');
const chatbotRoutes = require('./routes/chatbot');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Seed a default admin login on first run
ensureDefaultAdmin();

// ---------- Mount routers ----------
app.use('/api/auth', authRoutes);
app.use('/api', directoryRoutes); // /api/doctors, /api/pharmacies, /api/donors, /api/shelters, /api/hospitals, /api/volunteers
app.use('/api/sos', sosRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/admin', adminRoutes);

app.listen(PORT, () => {
  console.log(`MediHelp server running on http://localhost:${PORT}`);
  console.log(`Admin dashboard: http://localhost:${PORT}/admin/`);
});
