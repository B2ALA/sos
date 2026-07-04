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
