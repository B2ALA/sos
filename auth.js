// lib/auth.js
// Lightweight auth: scrypt password hashing (no external deps) + in-memory bearer tokens.
// For production, swap sessions for signed JWTs or a real session store (Redis, DB-backed).

const crypto = require('crypto');
const { readJSON, writeJSON } = require('./store');

const SESSIONS = new Map(); // token -> { username, role, expiresAt }
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const attempt = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(attempt, 'hex'));
}

function createSession(username, role) {
  const token = crypto.randomBytes(32).toString('hex');
  SESSIONS.set(token, { username, role, expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
}

function getSession(token) {
  const session = SESSIONS.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    SESSIONS.delete(token);
    return null;
  }
  return session;
}

function destroySession(token) {
  SESSIONS.delete(token);
}

// Express middleware: requires a valid bearer token, attaches req.user
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const session = token ? getSession(token) : null;
  if (!session) return res.status(401).json({ error: 'Not authenticated' });
  req.user = session;
  req.token = token;
  next();
}

// Express middleware: requires an authenticated admin
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    next();
  });
}

// Seed a default admin account on first run (change this password in production!)
function ensureDefaultAdmin() {
  const admins = readJSON('admins', null);
  if (!admins) {
    writeJSON('admins', {
      admin: { username: 'admin', password: hashPassword('admin123'), role: 'admin' },
    });
    console.log('Seeded default admin login -> username: admin / password: admin123 (CHANGE THIS)');
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  createSession,
  getSession,
  destroySession,
  requireAuth,
  requireAdmin,
  ensureDefaultAdmin,
};
// routes/auth.js
// User registration (full profile per spec) + login/logout + "who am I".

const express = require('express');
const { readJSON, writeJSON } = require('../lib/store');
const { hashPassword, verifyPassword, createSession, destroySession, requireAuth } = require('../lib/auth');

const router = express.Router();

function sanitizeUser(user) {
  const { password, ...safe } = user;
  return safe;
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  const {
    // Account
    username,
    password,
    // Personal
    fullName, age, gender, dob, bloodGroup, height, weight,
    address, district, state, pincode, phone, email,
    // Emergency contact
    emergencyContact, // { contactPersonName, relationship, contactNumber }
    // Medical info
    medicalInfo, // { allergies, diseases, currentMedications, disabilities, insuranceDetails }
  } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }
  if (!fullName || !phone) {
    return res.status(400).json({ error: 'fullName and phone are required' });
  }

  const users = readJSON('users', {});
  if (users[username]) {
    return res.status(409).json({ error: 'Username already taken' });
  }

  const user = {
    username,
    password: hashPassword(password),
    fullName, age, gender, dob, bloodGroup, height, weight,
    address, district, state, pincode, phone, email,
    emergencyContact: emergencyContact || {},
    medicalInfo: medicalInfo || {},
    createdAt: new Date().toISOString(),
  };

  users[username] = user;
  writeJSON('users', users);

  const token = createSession(username, 'user');
  res.status(201).json({ token, user: sanitizeUser(user) });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const users = readJSON('users', {});
  const user = users[username];

  if (!user || !verifyPassword(password, user.password)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = createSession(username, 'user');
  res.json({ token, user: sanitizeUser(user) });
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req, res) => {
  destroySession(req.token);
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const users = readJSON('users', {});
  const user = users[req.user.username];
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(sanitizeUser(user));
});

module.exports = router;
