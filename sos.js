// routes/sos.js
// Emergency SOS trigger, live location updates, and resolution.

const express = require('express');
const { randomUUID } = require('crypto');
const { readJSON, writeJSON } = require('../lib/store');
const { findNearestHospitals, findNearestVolunteers } = require('./directory');

const router = express.Router();

function loadEvents() {
  return readJSON('sos-events', {});
}
function saveEvents(events) {
  writeJSON('sos-events', events);
}

// "Send alert" — stubbed. Wire up an SMS/email/push provider here later
// (e.g. Twilio for SMS, Firebase Cloud Messaging for push, Nodemailer for email).
function sendAlert(channel, target, message) {
  console.log(`[ALERT -> ${channel}] to ${target.name || target.phone}: ${message}`);
  return true;
}

function getEmergencyContactsFor(username) {
  if (!username) {
    return [{ name: 'Primary Contact (default)', phone: '+91-9000000001' }];
  }
  const users = readJSON('users', {});
  const user = users[username];
  if (user && user.emergencyContact) {
    return [
      {
        name: user.emergencyContact.contactPersonName,
        phone: user.emergencyContact.contactNumber,
        relationship: user.emergencyContact.relationship,
      },
    ];
  }
  return [{ name: 'Primary Contact (default)', phone: '+91-9000000001' }];
}

// 1. Trigger a new SOS
router.post('/', (req, res) => {
  const { emergencyType, lat, lng, userName, userPhone, username } = req.body;

  if (lat === undefined || lng === undefined || !emergencyType) {
    return res.status(400).json({ error: 'emergencyType, lat and lng are required' });
  }

  const events = loadEvents();
  const id = randomUUID();
  const now = new Date().toISOString();

  const nearestVolunteers = findNearestVolunteers(emergencyType, lat, lng);
  const nearestHospitals = findNearestHospitals(lat, lng);
  const emergencyContacts = getEmergencyContactsFor(username);

  const event = {
    id,
    userName: userName || 'Unknown user',
    userPhone: userPhone || null,
    emergencyType,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    locationHistory: [{ lat, lng, timestamp: now }],
    notified: { emergencyContacts, volunteers: nearestVolunteers, hospitals: nearestHospitals },
  };

  events[id] = event;
  saveEvents(events);

  emergencyContacts.forEach((c) =>
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
router.post('/:id/location', (req, res) => {
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
router.get('/:id', (req, res) => {
  const events = loadEvents();
  const event = events[req.params.id];
  if (!event) return res.status(404).json({ error: 'SOS event not found' });
  res.json(event);
});

// 4. Resolve / cancel an SOS
router.post('/:id/resolve', (req, res) => {
  const events = loadEvents();
  const event = events[req.params.id];
  if (!event) return res.status(404).json({ error: 'SOS event not found' });

  event.status = 'resolved';
  event.updatedAt = new Date().toISOString();
  saveEvents(events);

  res.json(event);
});

// Note: listing ALL SOS events is intentionally not exposed on this public router
// (it would leak every user's live location). See routes/admin.js for the protected version.

module.exports = router;
