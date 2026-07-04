// admin/dashboard.js

const token = localStorage.getItem('mh_admin_token');
if (!token) window.location.href = 'index.html';

const adminMain = document.getElementById('adminMain');
const navButtons = document.querySelectorAll('.nav-btn[data-view]');
let currentView = 'overview';

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('mh_admin_token');
  window.location.href = 'index.html';
});

navButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    navButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentView = btn.dataset.view;
    renderView();
  });
});

async function api(path, options = {}) {
  const res = await fetch(`/api/admin${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    localStorage.removeItem('mh_admin_token');
    window.location.href = 'index.html';
    return null;
  }
  return res.json();
}

async function renderView() {
  adminMain.innerHTML = '<p style="color:var(--muted);">Loading...</p>';
  if (currentView === 'overview') return renderOverview();
  if (currentView === 'sos') return renderSOS();
  if (currentView === 'users') return renderUsers();
  if (currentView === 'volunteers') return renderVolunteers();
  return renderResourceTable(currentView);
}

// ---------------- Overview ----------------
async function renderOverview() {
  const stats = await api('/analytics');
  if (!stats) return;
  adminMain.innerHTML = `
    <h2>📊 Overview</h2>
    <div class="stat-grid">
      ${statCard(stats.doctors, 'Doctors')}
      ${statCard(stats.pharmacies, 'Pharmacies')}
      ${statCard(stats.donors, 'Blood Donors')}
      ${statCard(stats.availableDonors, 'Available Donors')}
      ${statCard(stats.hospitals, 'Hospitals')}
      ${statCard(stats.shelters, 'Shelters')}
      ${statCard(stats.volunteers, 'Volunteers')}
      ${statCard(stats.registeredUsers, 'Registered Users')}
      ${statCard(stats.sos.active, 'Active SOS')}
      ${statCard(stats.sos.total, 'Total SOS Events')}
    </div>`;
}

function statCard(num, label) {
  return `<div class="stat-card"><div class="num">${num}</div><div class="label">${label}</div></div>`;
}

// ---------------- SOS Monitoring ----------------
async function renderSOS() {
  const events = await api('/sos');
  if (!events) return;
  adminMain.innerHTML = `
    <h2>🚨 SOS Monitoring</h2>
    <table class="admin-table">
      <thead><tr><th>User</th><th>Type</th><th>Status</th><th>Created</th><th>Action</th></tr></thead>
      <tbody>
        ${events.map((e) => `
          <tr>
            <td>${e.userName}</td>
            <td>${e.emergencyType}</td>
            <td>${e.status === 'active' ? '<span class="badge">Active</span>' : '<span class="badge off">Resolved</span>'}</td>
            <td>${new Date(e.createdAt).toLocaleString()}</td>
            <td>${e.status === 'active' ? `<button class="pill-btn ok" data-resolve="${e.id}">Mark Resolved</button>` : '—'}</td>
          </tr>`).join('') || `<tr><td colspan="5" style="color:var(--muted);">No SOS events yet.</td></tr>`}
      </tbody>
    </table>`;

  document.querySelectorAll('[data-resolve]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await api(`/sos/${btn.dataset.resolve}/resolve`, { method: 'POST' });
      renderSOS();
    });
  });
}

// ---------------- Users ----------------
async function renderUsers() {
  const users = await api('/users');
  if (!users) return;
  adminMain.innerHTML = `
    <h2>👤 Registered Users</h2>
    <table class="admin-table">
      <thead><tr><th>Username</th><th>Full Name</th><th>Phone</th><th>Blood Group</th><th>District</th><th></th></tr></thead>
      <tbody>
        ${users.map((u) => `
          <tr>
            <td>${u.username}</td><td>${u.fullName || ''}</td><td>${u.phone || ''}</td>
            <td>${u.bloodGroup || ''}</td><td>${u.district || ''}</td>
            <td><button class="pill-btn danger" data-del-user="${u.username}">Delete</button></td>
          </tr>`).join('') || `<tr><td colspan="6" style="color:var(--muted);">No users yet.</td></tr>`}
      </tbody>
    </table>`;

  document.querySelectorAll('[data-del-user]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm(`Delete user ${btn.dataset.delUser}?`)) return;
      await api(`/users/${btn.dataset.delUser}`, { method: 'DELETE' });
      renderUsers();
    });
  });
}

// ---------------- Volunteers ----------------
async function renderVolunteers() {
  const data = await api('/volunteers');
  if (!data) return;
  adminMain.innerHTML = `<h2>🧑‍🚒 Volunteer Groups</h2>` + Object.entries(data).map(([type, groups]) => `
    <div class="form-section">
      <h3>${type} group</h3>
      ${groups.map((g) => `
        <p style="color:var(--muted); font-size:13px; margin-bottom:6px;">Group ${g.groupNumber} — ${g.members.length} members</p>
        <table class="admin-table">
          <thead><tr><th>Name</th><th>Phone</th><th>Location</th><th>Availability</th></tr></thead>
          <tbody>
            ${g.members.map((m) => `<tr><td>${m.name}</td><td>${m.phone}</td><td>${m.location}</td><td>${m.availability}</td></tr>`).join('')}
          </tbody>
        </table>`).join('')}
    </div>`).join('');
}

// ---------------- Generic resource tables: doctors / pharmacies / donors ----------------
const RESOURCE_COLUMNS = {
  doctors: ['id', 'name', 'specialization', 'hospital', 'phone', 'rating'],
  pharmacies: ['id', 'name', 'address', 'phone', 'open24hrs', 'rating'],
  donors: ['id', 'name', 'bloodGroup', 'district', 'phone', 'available'],
};

async function renderResourceTable(resource) {
  const cols = RESOURCE_COLUMNS[resource];
  const list = await api(`/${resource}`);
  if (!list) return;

  adminMain.innerHTML = `
    <h2>${labelFor(resource)}</h2>
    <p style="color:var(--muted); font-size:13px;">${list.length} total records</p>
    <table class="admin-table">
      <thead><tr>${cols.map((c) => `<th>${c}</th>`).join('')}<th></th></tr></thead>
      <tbody>
        ${list.slice(0, 100).map((item) => `
          <tr>${cols.map((c) => `<td>${item[c] !== undefined ? item[c] : ''}</td>`).join('')}
          <td><button class="pill-btn danger" data-del="${item.id}">Delete</button></td></tr>`).join('')}
      </tbody>
    </table>
    ${list.length > 100 ? `<p style="color:var(--muted); font-size:12px;">Showing first 100 of ${list.length} records.</p>` : ''}
  `;

  document.querySelectorAll('[data-del]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this record?')) return;
      await api(`/${resource}/${btn.dataset.del}`, { method: 'DELETE' });
      renderResourceTable(resource);
    });
  });
}

function labelFor(resource) {
  return { doctors: '🩺 Doctors', pharmacies: '💊 Pharmacies', donors: '🩸 Blood Donors' }[resource] || resource;
}

renderView();
