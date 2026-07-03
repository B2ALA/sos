/* app.js
   Main application logic: loads local JSON DB, renders lists, handles SOS flow, donors, doctors, volunteers.
   Uses localStorage for demo persistence. Designed to be replaced by real APIs later.
*/

/* Utility functions */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

/* Load local JSON "database" (demo) */
async function loadJSON(path){
  try{
    const res = await fetch(path);
    return await res.json();
  }catch(e){
    console.warn('Failed to load', path, e);
    return [];
  }
}

/* Global state */
const state = {
  userLocation: null,
  doctors: [],
  hospitals: [],
  donors: [],
  volunteers: [],
  faqs: []
};

/* Initialize app */
async function init(){
  // Load DB files
  state.doctors = await loadJSON('database/doctors.json');
  state.hospitals = await loadJSON('database/hospitals.json');
  state.donors = await loadJSON('database/donors.json');
  state.volunteers = await loadJSON('database/volunteers.json');
  state.faqs = await loadJSON('database/faqs.json');

  // Render initial UI
  renderHospitals(state.hospitals);
  renderDoctors(state.doctors);
  renderDonors(state.donors);
  renderVolunteers(state.volunteers);
  renderQuickReplies();
  updateAdminStats();

  // Populate specialization filter
  const specs = [...new Set(state.doctors.map(d=>d.specialization))].sort();
  const specFilter = $('#specFilter');
  specs.forEach(s=>{
    const opt = document.createElement('option'); opt.value = s; opt.textContent = s;
    specFilter.appendChild(opt);
  });

  // Event listeners
  $('#hospitalSearch').addEventListener('input', e=>{
    const q = e.target.value.toLowerCase();
    renderHospitals(state.hospitals.filter(h=>h.name.toLowerCase().includes(q) || h.address.toLowerCase().includes(q)));
  });
  $('#doctorSearch').addEventListener('input', e=>{
    const q = e.target.value.toLowerCase();
    renderDoctors(state.doctors.filter(d=>d.name.toLowerCase().includes(q) || d.specialization.toLowerCase().includes(q)));
  });
  $('#specFilter').addEventListener('change', e=>{
    const v = e.target.value;
    renderDoctors(v ? state.doctors.filter(d=>d.specialization===v) : state.doctors);
  });
  $('#bloodFilter').addEventListener('change', e=>{
    const v = e.target.value;
    renderDonors(v ? state.donors.filter(d=>d.blood===v) : state.donors);
  });
  $('#registerDonor').addEventListener('click', ()=> window.location.href = 'register.html');

  // SOS buttons
  $('#sosBtn').addEventListener('click', startSOSFlow);
  $('#sosTest').addEventListener('click', ()=>simulateSOS(true));

  // Dark mode toggle
  $('#darkToggle').addEventListener('click', ()=>{
    document.body.classList.toggle('dark');
  });

  // Locate button
  $('#locateBtn').addEventListener('click', ()=>mapsLocateUser(true));
}

/* Render functions */
function renderHospitals(list){
  const container = $('#hospitalList');
  container.innerHTML = '';
  list.forEach(h=>{
    const el = document.createElement('div'); el.className='list-item';
    el.innerHTML = `<div>
      <div style="font-weight:700">${h.name} ${h.emergency ? '🚨' : ''}</div>
      <div class="meta">${h.address} • Beds: ${h.bedsAvailable} • ICU: ${h.icu ? 'Yes' : 'No'}</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
      <a class="btn small" href="${h.mapsLink}" target="_blank">View</a>
      <button class="btn small" onclick="requestAmbulance('${h.id}')">Call ${h.emergencyNumber}</button>
    </div>`;
    container.appendChild(el);
  });
}

function renderDoctors(list){
  const container = $('#doctorList');
  container.innerHTML = '';
  list.forEach(d=>{
    const el = document.createElement('div'); el.className='list-item';
    el.innerHTML = `<div>
      <div style="font-weight:700">${d.name} ${d.emergencyAvailable ? '🩺' : ''}</div>
      <div class="meta">${d.specialization} • ${d.hospital} • ${d.location}</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
      <div class="meta">⭐ ${d.rating}</div>
      <button class="btn small" onclick="bookAppointment('${d.id}')">Book</button>
    </div>`;
    container.appendChild(el);
  });
}

function renderDonors(list){
  const container = $('#donorList');
  container.innerHTML = '';
  list.forEach(d=>{
    const el = document.createElement('div'); el.className='list-item';
    el.innerHTML = `<div>
      <div style="font-weight:700">${d.name} • ${d.blood}</div>
      <div class="meta">${d.location} • Last: ${d.lastDonation || 'N/A'}</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
      <button class="btn small" onclick="requestBlood('${d.id}')">Request</button>
      <button class="btn small" onclick="messageDonor('${d.id}')">Message</button>
    </div>`;
    container.appendChild(el);
  });
}

function renderVolunteers(list){
  const container = $('#volunteerList');
  container.innerHTML = '';
  list.forEach(v=>{
    const el = document.createElement('div'); el.className='list-item';
    el.innerHTML = `<div>
      <div style="font-weight:700">${v.group}</div>
      <div class="meta">${v.type} • Members: ${v.members.length}</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
      <button class="btn small" onclick="joinGroup('${v.id}')">Join</button>
      <button class="btn small" onclick="viewMembers('${v.id}')">Members</button>
    </div>`;
    container.appendChild(el);
  });
}

/* Quick replies for chatbot */
function renderQuickReplies(){
  const quick = $('#quickReplies');
  const replies = ['First aid', 'Chest pain', 'Bleeding', 'Poisoning', 'Ambulance', 'Nearby hospitals', 'Blood donation', 'Mental health'];
  quick.innerHTML = '';
  replies.forEach(r=>{
    const btn = document.createElement('button'); btn.className='quick-reply'; btn.textContent = r;
    btn.addEventListener('click', ()=>window.chatbot.ask(r));
    quick.appendChild(btn);
  });
}

/* Admin stats */
function updateAdminStats(){
  $('#statDoctors') && (document.getElementById('statDoctors').textContent = state.doctors.length);
  $('#statHospitals') && (document.getElementById('statHospitals').textContent = state.hospitals.length);
  $('#statDonors') && (document.getElementById('statDonors').textContent = state.donors.length);
  $('#statSOS') && (document.getElementById('statSOS').textContent = 0);
}

/* SOS flow */
async function startSOSFlow(){
  // Step 1: confirmation popup
  if(!confirm('Confirm SOS: This will share your live location with nearby hospitals, volunteers and your emergency contacts. Proceed?')) return;
  // Step 2: start location tracking
  if(!navigator.geolocation){
    alert('Geolocation not supported in this browser.');
    return;
  }
  $('#sosStatus').textContent = 'Starting location tracking...';
  const watchId = navigator.geolocation.watchPosition(pos=>{
    state.userLocation = {lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy};
    $('#sosStatus').textContent = 'You are under monitoring. Live location is being tracked.';
    // Step 4: send emergency info to hospitals, volunteers, contacts (demo: store in localStorage)
    const sosRequests = JSON.parse(localStorage.getItem('mh_sos')||'[]');
    sosRequests.push({
      id: 'sos_'+Date.now(),
      user: JSON.parse(localStorage.getItem('mh_current')||'{}'),
      location: state.userLocation,
      time: new Date().toISOString(),
      status: 'sent'
    });
    localStorage.setItem('mh_sos', JSON.stringify(sosRequests));
    // Notify volunteers (demo)
    console.log('SOS sent to hospitals & volunteers (demo).');
    // Update map marker
    if(window.MediMaps) MediMaps.updateUserMarker(state.userLocation);
  }, err=>{
    console.error(err);
    alert('Unable to get location: ' + err.message);
  }, {enableHighAccuracy:true, maximumAge:0});
  // Save watchId for cancellation
  localStorage.setItem('mh_sos_watch', watchId);
}

/* Simulate SOS for testing */
function simulateSOS(test=false){
  const fakeLoc = {lat:11.6643 + Math.random()*0.01, lng:78.1460 + Math.random()*0.01};
  state.userLocation = fakeLoc;
  $('#sosStatus').textContent = 'Test SOS: You are under monitoring. Live location is being tracked.';
  if(window.MediMaps) MediMaps.updateUserMarker(fakeLoc);
  const sosRequests = JSON.parse(localStorage.getItem('mh_sos')||'[]');
  sosRequests.push({
    id: 'sos_test_'+Date.now(),
    user: JSON.parse(localStorage.getItem('mh_current')||'{}'),
    location: fakeLoc,
    time: new Date().toISOString(),
    status: 'test'
  });
  localStorage.setItem('mh_sos', JSON.stringify(sosRequests));
  alert('Test SOS created (demo).');
}

/* Actions */
function requestAmbulance(hospitalId){
  const h = state.hospitals.find(x=>x.id===hospitalId);
  alert(`Calling ambulance at ${h.name} — ${h.emergencyNumber} (demo)`);
}
function bookAppointment(doctorId){
  const d = state.doctors.find(x=>x.id===doctorId);
  const name = prompt(`Book appointment with Dr. ${d.name}. Enter preferred date/time:`);
  if(name){
    alert('Appointment requested (demo). The hospital will contact you.');
  }
}
function requestBlood(donorId){
  const d = state.donors.find(x=>x.id===donorId);
  alert(`Request sent to ${d.name} (${d.blood}). They will be notified (demo).`);
}
function messageDonor(donorId){
  const d = state.donors.find(x=>x.id===donorId);
  alert(`Opening message to ${d.name} — ${d.phone} (demo).`);
}
function joinGroup(groupId){
  const g = state.volunteers.find(x=>x.id===groupId);
  const current = JSON.parse(localStorage.getItem('mh_current')||'null');
  if(!current){ alert('Please login to join groups.'); return; }
  if(!g.members.includes(current.id)) g.members.push(current.id);
  localStorage.setItem('mh_volunteers', JSON.stringify(state.volunteers));
  alert('Joined group (demo). You will receive notifications.');
}
function viewMembers(groupId){
  const g = state.volunteers.find(x=>x.id===groupId);
  alert('Members: ' + g.members.join(', '));
}

/* Expose for console */
window.MediApp = {state, init, renderHospitals, renderDoctors};

window.addEventListener('load', init);
