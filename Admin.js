/* ══════════════════════════════════════════════════════════════
   MediHelp — ADMIN PANEL LOGIC
   Demo auth: hardcoded credentials + localStorage session flag.
   Replace with real authenticated backend routes in production —
   never ship hardcoded admin credentials to a live site.
   ══════════════════════════════════════════════════════════════ */

function openM(id){ document.getElementById(id).classList.add('open'); }
function closeM(id){ document.getElementById(id).classList.remove('open'); }
document.addEventListener('DOMContentLoaded', ()=>{
  document.querySelectorAll('.modal-overlay').forEach(ov=>{
    ov.addEventListener('click', e=>{ if(e.target === ov) ov.classList.remove('open'); });
  });
});

const ADMIN_DEMO_USER = 'admin';
const ADMIN_DEMO_PASS = 'medihelp2026'; // ⚠️ CHANGE THIS before deploying — demo only

function adminLogin(e){
  e.preventDefault();
  const u = document.getElementById('adminUser').value.trim();
  const p = document.getElementById('adminPass').value;
  if(u === ADMIN_DEMO_USER && p === ADMIN_DEMO_PASS){
    MHStore.set('adminSession', true);
    document.getElementById('adminLoginScreen').classList.add('hidden');
    document.getElementById('adminDashboard').classList.remove('hidden');
    renderAdminDashboard();
  } else {
    adminToast('❌ Invalid admin credentials.');
  }
}
function adminLogout(){
  MHStore.set('adminSession', false);
  document.getElementById('adminDashboard').classList.add('hidden');
  document.getElementById('adminLoginScreen').classList.remove('hidden');
}
function adminToast(msg){
  const t=document.getElementById('adminToast');
  t.textContent=msg; t.classList.add('show');
  clearTimeout(window._at); window._at=setTimeout(()=>t.classList.remove('show'),3000);
}

function checkAdminSession(){
  if(MHStore.get('adminSession', false)){
    document.getElementById('adminLoginScreen').classList.add('hidden');
    document.getElementById('adminDashboard').classList.remove('hidden');
    renderAdminDashboard();
  }
}

/* ---------- Dashboard stats ---------- */
function renderAdminDashboard(){
  renderStats();
  renderAdminDoctors();
  renderAdminHospitals();
  renderAdminDonors();
  renderAdminUsers();
  renderAdminEmergencyRequests();
  renderAdminVolunteerRequests();
}
function renderStats(){
  const stats = [
    { label:'Registered Users', val: MHStore.get('users',[]).length, icon:'👤' },
    { label:'Doctors Listed', val: MHStore.get('doctors',[]).length, icon:'👨‍⚕️' },
    { label:'Hospitals Listed', val: MHStore.get('hospitals',[]).length, icon:'🏥' },
    { label:'Blood Donors', val: MHStore.get('donors',[]).length, icon:'🩸' },
    { label:'Emergency Requests', val: MHStore.get('emergencyRequests',[]).length, icon:'🚨' },
    { label:'Volunteer Alerts Sent', val: MHStore.get('volunteerRequests',[]).length, icon:'🙋' }
  ];
  document.getElementById('adminStats').innerHTML = stats.map(s=>`
    <div class="card text-center">
      <div style="font-size:26px;">${s.icon}</div>
      <div style="font-family:var(--font-display);font-size:24px;font-weight:700;color:var(--teal-900);">${s.val}</div>
      <div class="small muted">${s.label}</div>
    </div>`).join('');
}

/* ---------- Doctors CRUD ---------- */
function renderAdminDoctors(){
  const doctors = MHStore.get('doctors', []);
  document.getElementById('adminDoctorTable').innerHTML = `
    <table class="admin-table"><thead><tr><th>Name</th><th>Spec</th><th>Hospital</th><th>Phone</th><th>Emergency</th><th></th></tr></thead>
    <tbody>${doctors.map(d=>`<tr>
      <td>${d.name}</td><td>${d.spec}</td><td>${d.hospital}</td><td>${d.phone}</td>
      <td>${d.emergency?'🚨 Yes':'No'}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="editDoctor('${d.id}')">✏️</button>
      <button class="btn btn-ghost btn-sm" onclick="deleteDoctor('${d.id}')">🗑️</button></td>
    </tr>`).join('')}</tbody></table>`;
}
function openDoctorForm(id){
  const doctors = MHStore.get('doctors', []);
  const d = id ? doctors.find(x=>x.id===id) : {};
  document.getElementById('docFormTitle').textContent = id ? '✏️ Edit Doctor' : '➕ Add Doctor';
  document.getElementById('docFormId').value = id || '';
  ['name','spec','hospital','phone','availability','location','maps'].forEach(f=> document.getElementById('docf_'+f).value = d[f] || '');
  document.getElementById('docf_rating').value = d.rating || 4.5;
  document.getElementById('docf_emergency').checked = !!d.emergency;
  document.getElementById('docf_lat').value = d.lat || 11.6716;
  document.getElementById('docf_lng').value = d.lng || 78.1073;
  openM('doctorFormM');
}
function editDoctor(id){ openDoctorForm(id); }
function saveDoctorForm(e){
  e.preventDefault();
  const doctors = MHStore.get('doctors', []);
  const id = document.getElementById('docFormId').value;
  const doc = {
    id: id || 'D'+Date.now(),
    name: document.getElementById('docf_name').value,
    spec: document.getElementById('docf_spec').value,
    hospital: document.getElementById('docf_hospital').value,
    phone: document.getElementById('docf_phone').value,
    availability: document.getElementById('docf_availability').value,
    location: document.getElementById('docf_location').value,
    maps: document.getElementById('docf_maps').value,
    rating: parseFloat(document.getElementById('docf_rating').value) || 4.5,
    emergency: document.getElementById('docf_emergency').checked,
    lat: parseFloat(document.getElementById('docf_lat').value),
    lng: parseFloat(document.getElementById('docf_lng').value)
  };
  const updated = id ? doctors.map(d=>d.id===id?doc:d) : [...doctors, doc];
  MHStore.set('doctors', updated);
  closeM('doctorFormM');
  renderAdminDoctors(); renderStats();
  adminToast('✅ Doctor saved.');
}
function deleteDoctor(id){
  if(!confirm('Delete this doctor?')) return;
  MHStore.set('doctors', MHStore.get('doctors',[]).filter(d=>d.id!==id));
  renderAdminDoctors(); renderStats();
  adminToast('🗑️ Doctor deleted.');
}

/* ---------- Hospitals CRUD ---------- */
function renderAdminHospitals(){
  const hospitals = MHStore.get('hospitals', []);
  document.getElementById('adminHospitalTable').innerHTML = `
    <table class="admin-table"><thead><tr><th>Name</th><th>Type</th><th>Beds</th><th>ICU</th><th>Ambulance</th><th></th></tr></thead>
    <tbody>${hospitals.map(h=>`<tr>
      <td>${h.name}</td><td>${h.type}</td><td>${h.beds}</td><td>${h.icu}</td><td>${h.ambulance?'🚑':'—'}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="editHospital('${h.id}')">✏️</button>
      <button class="btn btn-ghost btn-sm" onclick="deleteHospital('${h.id}')">🗑️</button></td>
    </tr>`).join('')}</tbody></table>`;
}
function openHospitalForm(id){
  const hospitals = MHStore.get('hospitals', []);
  const h = id ? hospitals.find(x=>x.id===id) : {};
  document.getElementById('hospFormTitle').textContent = id ? '✏️ Edit Hospital' : '➕ Add Hospital';
  document.getElementById('hospFormId').value = id || '';
  ['name','type','address','phone','emergency','maps'].forEach(f=> document.getElementById('hospf_'+f).value = h[f] || '');
  document.getElementById('hospf_beds').value = h.beds ?? 0;
  document.getElementById('hospf_icu').value = h.icu ?? 0;
  document.getElementById('hospf_ambulance').checked = !!h.ambulance;
  document.getElementById('hospf_lat').value = h.lat || 11.6716;
  document.getElementById('hospf_lng').value = h.lng || 78.1073;
  openM('hospitalFormM');
}
function editHospital(id){ openHospitalForm(id); }
function saveHospitalForm(e){
  e.preventDefault();
  const hospitals = MHStore.get('hospitals', []);
  const id = document.getElementById('hospFormId').value;
  const h = {
    id: id || 'H'+Date.now(),
    name: document.getElementById('hospf_name').value,
    type: document.getElementById('hospf_type').value,
    address: document.getElementById('hospf_address').value,
    phone: document.getElementById('hospf_phone').value,
    emergency: document.getElementById('hospf_emergency').value,
    maps: document.getElementById('hospf_maps').value,
    beds: parseInt(document.getElementById('hospf_beds').value) || 0,
    icu: parseInt(document.getElementById('hospf_icu').value) || 0,
    ambulance: document.getElementById('hospf_ambulance').checked,
    lat: parseFloat(document.getElementById('hospf_lat').value),
    lng: parseFloat(document.getElementById('hospf_lng').value)
  };
  const updated = id ? hospitals.map(x=>x.id===id?h:x) : [...hospitals, h];
  MHStore.set('hospitals', updated);
  closeM('hospitalFormM');
  renderAdminHospitals(); renderStats();
  adminToast('✅ Hospital saved.');
}
function deleteHospital(id){
  if(!confirm('Delete this hospital?')) return;
  MHStore.set('hospitals', MHStore.get('hospitals',[]).filter(h=>h.id!==id));
  renderAdminHospitals(); renderStats();
  adminToast('🗑️ Hospital deleted.');
}

/* ---------- Read-only views ---------- */
function renderAdminDonors(){
  const donors = MHStore.get('donors', []);
  document.getElementById('adminDonorTable').innerHTML = `
    <table class="admin-table"><thead><tr><th>Name</th><th>Blood</th><th>Phone</th><th>Location</th><th>Available</th></tr></thead>
    <tbody>${donors.map(d=>`<tr><td>${d.name}</td><td>${d.blood}</td><td>${d.phone}</td><td>${d.location}</td><td>${d.available?'✅':'⏳'}</td></tr>`).join('')}</tbody></table>`;
}
function renderAdminUsers(){
  const users = MHStore.get('users', []);
  document.getElementById('adminUserTable').innerHTML = users.length ? `
    <table class="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Mobile</th><th>Blood</th><th>District</th></tr></thead>
    <tbody>${users.map(u=>`<tr><td>${u.fullName}</td><td>${u.email}</td><td>${u.mobile}</td><td>${u.blood}</td><td>${u.district}</td></tr>`).join('')}</tbody></table>`
    : '<p class="muted">No registered users yet.</p>';
}
function renderAdminEmergencyRequests(){
  const reqs = MHStore.get('emergencyRequests', []).slice().reverse();
  document.getElementById('adminEmergencyTable').innerHTML = reqs.length ? `
    <table class="admin-table"><thead><tr><th>Time</th><th>Location</th><th>Status</th><th>Notified Hospitals</th></tr></thead>
    <tbody>${reqs.map(r=>`<tr><td>${new Date(r.time).toLocaleString()}</td><td>${r.loc?`${r.loc.lat.toFixed(3)}, ${r.loc.lng.toFixed(3)}`:'—'}</td><td>${r.status==='active'?'🚨 Active':r.status==='cancelled'?'✅ Cancelled':r.status}</td><td>${(r.notifiedHospitals||[]).join(', ')}</td></tr>`).join('')}</tbody></table>`
    : '<p class="muted">No emergency requests yet.</p>';
}
function renderAdminVolunteerRequests(){
  const reqs = MHStore.get('volunteerRequests', []).slice().reverse();
  document.getElementById('adminVolunteerTable').innerHTML = reqs.length ? `
    <table class="admin-table"><thead><tr><th>Time</th><th>Group</th><th>Category</th><th>Status</th></tr></thead>
    <tbody>${reqs.map(r=>`<tr><td>${new Date(r.time).toLocaleString()}</td><td>${r.group}</td><td>${r.category}</td><td>${r.status}</td></tr>`).join('')}</tbody></table>`
    : '<p class="muted">No volunteer alerts yet.</p>';
}

function switchAdminTab(tab){
  document.querySelectorAll('.admin-tab-panel').forEach(p=>p.classList.add('hidden'));
  document.getElementById('atab-'+tab).classList.remove('hidden');
  document.querySelectorAll('.admin-tab-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('atabbtn-'+tab).classList.add('active');
}
