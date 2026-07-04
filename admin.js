// routes/admin.js
// Admin login + protected management endpoints for the /admin dashboard.
// Mount this router at /api/admin. Only /login is public; everything else requires requireAdmin.

const express = require('express');
const { readJSON, writeJSON } = require('../lib/store');
const { verifyPassword, createSession, requireAdmin } = require('../lib/auth');

const router = express.Router();

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const admins = readJSON('admins', {});
  const admin = admins[username];

  if (!admin || !verifyPassword(password, admin.password)) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }

  const token = createSession(username, 'admin');
  res.json({ token, username });
});

// All routes below require a valid admin session
router.use(requireAdmin);

// ---------------- Analytics ----------------
router.get('/analytics', (req, res) => {
  const doctors = readJSON('doctors', []);
  const pharmacies = readJSON('pharmacies', []);
  const donors = readJSON('donors', []);
  const shelters = readJSON('shelters', []);
  const hospitals = readJSON('hospitals', []);
  const volunteers = readJSON('volunteers', {});
  const users = readJSON('users', {});
  const sosEvents = Object.values(readJSON('sos-events', {}));

  const volunteerCount = Object.values(volunteers)
    .flat()
    .reduce((sum, g) => sum + (g.members ? g.members.length : 0), 0);

  res.json({
    doctors: doctors.length,
    pharmacies: pharmacies.length,
    donors: donors.length,
    availableDonors: donors.filter((d) => d.available).length,
    shelters: shelters.length,
    hospitals: hospitals.length,
    volunteers: volunteerCount,
    registeredUsers: Object.keys(users).length,
    sos: {
      total: sosEvents.length,
      active: sosEvents.filter((e) => e.status === 'active').length,
      resolved: sosEvents.filter((e) => e.status === 'resolved').length,
    },
  });
});

// ---------------- Users ----------------
router.get('/users', (req, res) => {
  const users = readJSON('users', {});
  const list = Object.values(users).map(({ password, ...safe }) => safe);
  res.json(list);
});

router.delete('/users/:username', (req, res) => {
  const users = readJSON('users', {});
  if (!users[req.params.username]) return res.status(404).json({ error: 'User not found' });
  delete users[req.params.username];
  writeJSON('users', users);
  res.json({ success: true });
});

// ---------------- Generic CRUD factory for array-based datasets ----------------
function crudFor(name) {
  router.get(`/${name}`, (req, res) => {
    res.json(readJSON(name, []));
  });

  router.post(`/${name}`, (req, res) => {
    const list = readJSON(name, []);
    const record = { id: `${name.slice(0, 2).toUpperCase()}${Date.now()}`, ...req.body };
    list.push(record);
    writeJSON(name, list);
    res.status(201).json(record);
  });

  router.put(`/${name}/:id`, (req, res) => {
    const list = readJSON(name, []);
    const idx = list.findIndex((r) => r.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Record not found' });
    list[idx] = { ...list[idx], ...req.body, id: list[idx].id };
    writeJSON(name, list);
    res.json(list[idx]);
  });

  router.delete(`/${name}/:id`, (req, res) => {
    const list = readJSON(name, []);
    const filtered = list.filter((r) => r.id !== req.params.id);
    if (filtered.length === list.length) return res.status(404).json({ error: 'Record not found' });
    writeJSON(name, filtered);
    res.json({ success: true });
  });
}

['doctors', 'pharmacies', 'donors', 'shelters', 'hospitals'].forEach(crudFor);

// ---------------- SOS Monitoring ----------------
router.get('/sos', (req, res) => {
  const events = Object.values(readJSON('sos-events', {}));
  res.json(events.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

router.post('/sos/:id/resolve', (req, res) => {
  const events = readJSON('sos-events', {});
  const event = events[req.params.id];
  if (!event) return res.status(404).json({ error: 'SOS event not found' });
  event.status = 'resolved';
  event.updatedAt = new Date().toISOString();
  writeJSON('sos-events', events);
  res.json(event);
});

// ---------------- Volunteers (nested structure, handled separately from crudFor) ----------------
router.get('/volunteers', (req, res) => {
  res.json(readJSON('volunteers', {}));
});

router.post('/volunteers/:groupType/:groupNumber/members', (req, res) => {
  const data = readJSON('volunteers', {});
  const { groupType, groupNumber } = req.params;
  const group = (data[groupType] || []).find((g) => g.groupNumber === parseInt(groupNumber, 10));
  if (!group) return res.status(404).json({ error: 'Volunteer group not found' });

  const member = { id: `${groupType.slice(0, 3).toUpperCase()}${Date.now()}`, ...req.body };
  group.members.push(member);
  writeJSON('volunteers', data);
  res.status(201).json(member);
});

module.exports = router;
// admin/admin.js — admin login page logic

const form = document.getElementById('adminLoginForm');
const formMsg = document.getElementById('formMsg');

// If already logged in, skip straight to dashboard
if (localStorage.getItem('mh_admin_token')) {
  window.location.href = 'dashboard.html';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      formMsg.innerHTML = `<p class="error-text">${data.error}</p>`;
      return;
    }

    localStorage.setItem('mh_admin_token', data.token);
    window.location.href = 'dashboard.html';
  } catch (err) {
    console.error(err);
    formMsg.innerHTML = `<p class="error-text">Something went wrong. Please try again.</p>`;
  }
});
