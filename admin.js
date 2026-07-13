/* MediHelp Admin Dashboard logic */

// ---- Guard: redirect to login if no token ----
if (!MediHelpAuth.isLoggedIn()) {
  window.location.href = "login.html";
}

// ---- Tab switching ----
document.querySelectorAll(".tab-link").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    document.querySelectorAll(".tab-link").forEach((l) => l.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    link.classList.add("active");
    document.getElementById(`tab-${link.dataset.tab}`).classList.add("active");
  });
});

function statusBadge(status) {
  const cls = status === "active" ? "badge-alert" : status === "resolved" ? "" : "badge-gold";
  return `<span class="badge ${cls}">${status}</span>`;
}

// ---- Overview ----
async function loadOverview() {
  try {
    const res = await MediHelpAPI.get("/admin/analytics", true);
    const c = res.counts;
    document.getElementById("overview-stats").innerHTML = `
      <div class="card stat-card"><small class="eyebrow">Users</small><h2>${c.users}</h2></div>
      <div class="card stat-card"><small class="eyebrow">Doctors</small><h2>${c.doctors}</h2></div>
      <div class="card stat-card"><small class="eyebrow">Pharmacies</small><h2>${c.pharmacies}</h2></div>
      <div class="card stat-card"><small class="eyebrow">Active SOS</small><h2 style="color:var(--alert);">${res.activeSOSCount}</h2></div>
    `;
    document.getElementById("recent-sos-body").innerHTML = res.recentSOS.map((s) => `
      <tr><td>${s.emergency_type}</td><td>${statusBadge(s.status)}</td><td>${new Date(s.triggered_at).toLocaleString()}</td></tr>
    `).join("") || `<tr><td colspan="3">No SOS events yet.</td></tr>`;
  } catch (err) {
    showToast("Couldn't load analytics: " + err.message, "error");
  }
}

// ---- Emergency monitoring ----
async function loadActiveSOS() {
  try {
    const res = await MediHelpAPI.get("/sos/active", true);
    document.getElementById("active-sos-body").innerHTML = res.data.map((s) => `
      <tr>
        <td>${s.emergency_type}</td>
        <td>${s.latitude.toFixed(4)}, ${s.longitude.toFixed(4)}</td>
        <td>${statusBadge(s.status)}</td>
        <td>${new Date(s.triggered_at).toLocaleString()}</td>
        <td><button class="btn btn-outline" style="padding:6px 12px;" onclick="resolveSOS('${s.id}')">Resolve</button></td>
      </tr>
    `).join("") || `<tr><td colspan="5">No active emergencies right now.</td></tr>`;
  } catch (err) {
    showToast("Couldn't load active SOS: " + err.message, "error");
  }
}
async function resolveSOS(id) {
  try {
    await MediHelpAPI.patch(`/sos/${id}/status`, { status: "resolved" }, true);
    showToast("Marked resolved.");
    loadActiveSOS();
  } catch (err) { showToast(err.message, "error"); }
}

// ---- Users ----
async function loadUsers() {
  try {
    const res = await MediHelpAPI.get("/admin/users", true);
    document.getElementById("users-body").innerHTML = res.data.map((u) => `
      <tr>
        <td>${u.name}</td><td>${u.mobile}</td><td>${u.district || "—"}</td><td>${u.blood_group || "—"}</td>
        <td>${new Date(u.created_at).toLocaleDateString()}</td>
        <td><button class="btn btn-outline" style="padding:6px 12px;" onclick="deleteUser('${u.id}')">Remove</button></td>
      </tr>
    `).join("") || `<tr><td colspan="6">No users registered yet.</td></tr>`;
  } catch (err) { showToast("Couldn't load users: " + err.message, "error"); }
}
async function deleteUser(id) {
  if (!confirm("Remove this user?")) return;
  try { await MediHelpAPI.del(`/admin/users/${id}`, true); showToast("User removed."); loadUsers(); }
  catch (err) { showToast(err.message, "error"); }
}

// ---- Doctors ----
async function loadDoctorsAdmin() {
  try {
    const res = await MediHelpAPI.get("/doctors");
    document.getElementById("doctors-body").innerHTML = res.data.slice(0, 100).map((d) => `
      <tr><td>${d.name}</td><td>${d.specialization}</td><td>${d.hospital}</td><td>${d.phone}</td>
      <td><button class="btn btn-outline" style="padding:6px 12px;" onclick="deleteRecord('doctors','${d.id}', loadDoctorsAdmin)">Remove</button></td></tr>
    `).join("");
  } catch (err) { showToast("Couldn't load doctors: " + err.message, "error"); }
}
document.getElementById("add-doctor-btn").onclick = () => document.getElementById("doctor-modal").classList.add("open");
document.getElementById("doctor-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  try {
    await MediHelpAPI.post("/doctors", data, true);
    showToast("Doctor added.");
    document.getElementById("doctor-modal").classList.remove("open");
    e.target.reset();
    loadDoctorsAdmin();
  } catch (err) { showToast(err.message, "error"); }
});

// ---- Pharmacies ----
async function loadPharmaciesAdmin() {
  try {
    const res = await MediHelpAPI.get("/pharmacies");
    document.getElementById("pharmacies-body").innerHTML = res.data.slice(0, 100).map((p) => `
      <tr><td>${p.name}</td><td>${p.address}</td><td>${p.phone}</td><td>${p.open_24hrs ? "Yes" : "No"}</td>
      <td><button class="btn btn-outline" style="padding:6px 12px;" onclick="deleteRecord('pharmacies','${p.id}', loadPharmaciesAdmin)">Remove</button></td></tr>
    `).join("");
  } catch (err) { showToast("Couldn't load pharmacies: " + err.message, "error"); }
}
document.getElementById("add-pharmacy-btn").onclick = () => document.getElementById("pharmacy-modal").classList.add("open");
document.getElementById("pharmacy-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  try {
    await MediHelpAPI.post("/pharmacies", data, true);
    showToast("Pharmacy added.");
    document.getElementById("pharmacy-modal").classList.remove("open");
    e.target.reset();
    loadPharmaciesAdmin();
  } catch (err) { showToast(err.message, "error"); }
});

// ---- Donors ----
async function loadDonorsAdmin() {
  try {
    const res = await MediHelpAPI.get("/donors");
    document.getElementById("donors-body").innerHTML = res.data.slice(0, 100).map((d) => `
      <tr><td>${d.name}</td><td>${d.blood_group}</td><td>${d.district}</td><td>${d.phone}</td><td>${d.available ? "Yes" : "No"}</td>
      <td><button class="btn btn-outline" style="padding:6px 12px;" onclick="deleteRecord('blood_donors','${d.id}', loadDonorsAdmin)">Remove</button></td></tr>
    `).join("");
  } catch (err) { showToast("Couldn't load donors: " + err.message, "error"); }
}

// ---- Volunteers ----
async function loadVolunteersAdmin() {
  try {
    const res = await MediHelpAPI.get("/volunteers");
    document.getElementById("volunteers-body").innerHTML = res.data.map((v) => `
      <tr><td>${v.name}</td><td>${v.volunteer_groups?.team_type || "—"}</td><td>${v.skills}</td><td>${v.availability}</td></tr>
    `).join("");
  } catch (err) { showToast("Couldn't load volunteers: " + err.message, "error"); }
}

// ---- Generic delete helper for simple directory tables ----
async function deleteRecord(table, id, reload) {
  const routeMap = { doctors: "/doctors", pharmacies: "/pharmacies", blood_donors: "/donors" };
  if (!confirm("Remove this record?")) return;
  try {
    await MediHelpAPI.del(`${routeMap[table]}/${id}`, true);
    showToast("Record removed.");
    reload();
  } catch (err) { showToast(err.message, "error"); }
}

// ---- Initial load ----
loadOverview();
loadActiveSOS();
loadUsers();
loadDoctorsAdmin();
loadPharmaciesAdmin();
loadDonorsAdmin();
loadVolunteersAdmin();
setInterval(loadActiveSOS, 20000); // keep the monitoring tab fresh
