/* app.js — MediHelp main client script
   - Handles UI modals, toasts, SOS flow, AI chatbot (local KB),
     doctor/hospital search, volunteer & donor interactions.
   - Uses local JSON files in /database for demo data.
   - For production, replace localStorage and fetches with secure backend APIs.
*/

/* -------------------------
   Utility & state
   ------------------------- */
const state = {
  userLocation: null,
  map: null,
  layers: {},
  currentLayer: 'hospital',
  nearbyData: null,
  doctors: [],
  hospitals: [],
  donors: [],
  volunteers: [],
  faqs: [],
  kb: [],
  users: [],
  currentUser: null
};

function toast(msg, ms = 3000) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('on');
  setTimeout(() => t.classList.remove('on'), ms);
}

/* -------------------------
   Modal helpers
   ------------------------- */
function openM(id) {
  let el = document.getElementById(id);
  if (!el) {
    // create simple modal container if not present
    el = document.createElement('div');
    el.id = id;
    el.className = 'backdrop on';
    el.innerHTML = `<div class="mbox"><div class="mhead"><h3>${id}</h3><button onclick="closeM('${id}')">✕</button></div><div class="mbody">Loading...</div></div>`;
    document.body.appendChild(el);
  } else {
    el.classList.add('on');
  }
}

function closeM(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('on');
}

/* -------------------------
   Load local database JSONs (demo)
   ------------------------- */
async function loadDatabase() {
  // Load JSON files from /database
  const files = ['doctors','hospitals','donors','volunteers','faqs','knowledgebase','users'];
  for (const f of files) {
    try {
      const res = await fetch(`database/${f}.json`);
      if (!res.ok) continue;
      const data = await res.json();
      state[f] = data;
    } catch (e) {
      console.warn('DB load failed', f, e);
    }
  }
  // fallback: if users in localStorage, set currentUser
  const u = localStorage.getItem('medi_user');
  if (u) state.currentUser = JSON.parse(u);
}

/* -------------------------
   Map initialization (Leaflet)
   ------------------------- */
function initMap() {
  // maps.js will call createMap() which uses Leaflet
  if (window.createMap) {
    state.map = createMap('map');
    // add default layer markers
    renderNearbyList('hospital');
  } else {
    console.warn('Leaflet not loaded');
  }
}

/* -------------------------
   Nearby search & list rendering
   - Uses local database/hardcoded data for demo
   - For production, call backend /api/nearby which proxies Google Places or your own DB
   ------------------------- */
function openNearby(type = 'hospital') {
  state.currentLayer = type;
  document.getElementById('layerSelect').value = type;
  renderNearbyList(type);
  // center map if user location exists
  if (state.userLocation && state.map) {
    state.map.setView([state.userLocation.lat, state.userLocation.lng], 13);
  }
}

function renderNearbyList(type) {
  const listEl = document.getElementById('nearbyList');
  listEl.innerHTML = '<div class="loading">Loading nearby...</div>';
  // use local DB if available
  const db = state[type] && state[type].length ? state[type] : (window.nearbyDB && window.nearbyDB[type]) || [];
  state.nearbyData = db;
  // render markers on map
  if (state.map && window.clearLayerMarkers) {
    clearLayerMarkers();
  }
  setTimeout(() => {
    if (!db.length) {
      listEl.innerHTML = '<p style="color:var(--muted)">No nearby results.</p>';
      return;
    }
    listEl.innerHTML = db.map(p => {
      const dist = p.dist || '—';
      const time = p.time || '—';
      return `<div class="place-card">
        <div class="p-ico-box">${p.ico || '📍'}</div>
        <div style="flex:1">
          <div class="p-name">${p.name}</div>
          <div class="p-addr">${p.addr || p.address || ''}</div>
          <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
            <div class="p-meta">⭐ ${p.rating || '—'}</div>
            <div class="p-meta">📏 ${dist}</div>
            <div class="p-meta">🚗 ${time}</div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <a class="maps-btn" href="#" onclick="navigateTo('${encodeURIComponent(p.name)}')">🗺️ Navigate</a>
          <button class="btn-full btn-grey" onclick="callNumber('${p.phone || p.contact || ''}')">📞 Call</button>
        </div>
      </div>`;
    }).join('');
    // add markers
    if (state.map && window.addMarkersToMap) {
      addMarkersToMap(db, type);
    }
  }, 300);
}

function filterNearby() {
  const q = document.getElementById('searchNearby').value.toLowerCase();
  const filtered = (state.nearbyData || []).filter(p => (p.name + ' ' + (p.addr || '')).toLowerCase().includes(q));
  const listEl = document.getElementById('nearbyList');
  if (!filtered.length) {
    listEl.innerHTML = '<p style="color:var(--muted)">No matches.</p>';
    return;
  }
  listEl.innerHTML = filtered.map(p => {
    return `<div class="place-card">
      <div class="p-ico-box">${p.ico || '📍'}</div>
      <div style="flex:1">
        <div class="p-name">${p.name}</div>
        <div class="p-addr">${p.addr || ''}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <a class="maps-btn" href="#" onclick="navigateTo('${encodeURIComponent(p.name)}')">🗺️ Navigate</a>
      </div>
    </div>`;
  }).join('');
}

/* -------------------------
   Simple call / navigate helpers
   ------------------------- */
function callNumber(num) {
  if (!num) { toast('No phone number available'); return; }
  window.location.href = `tel:${num}`;
}
function navigateTo(q) {
  // open Google Maps search in new tab (simple)
  window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
}

/* -------------------------
   Location & SOS flow
   ------------------------- */
function requestLocation(updateNav = false) {
  if (!navigator.geolocation) {
    toast('Geolocation not supported');
    return;
  }
  toast('Requesting location...');
  navigator.geolocation.getCurrentPosition(pos => {
    state.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
    document.getElementById('navLocText').textContent = 'Your Location';
    document.getElementById('hcLocText').textContent = `Using your live GPS location (±${Math.round(pos.coords.accuracy)}m)`;
    if (state.map) state.map.setView([state.userLocation.lat, state.userLocation.lng], 13);
    toast('Location found');
  }, err => {
    toast('Location denied or unavailable');
  }, { enableHighAccuracy: true, timeout: 8000 });
}

function sendEmergency() {
  // Step 1: confirmation
  const id = 'warningM';
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    el.className = 'backdrop on';
    el.innerHTML = `<div class="mbox"><div class="mhead"><h3>⚠️ Confirm Emergency</h3><button onclick="closeM('${id}')">✕</button></div>
      <div class="mbody">
        <p style="margin-bottom:12px">Only use SOS for real emergencies. Misuse may be monitored.</p>
        <div style="display:flex;gap:8px">
          <button class="btn-full btn-grey" onclick="closeM('${id}')">Cancel</button>
          <button class="btn-full btn-red" onclick="proceedEmergency()">Confirm & Proceed</button>
        </div>
      </div></div>`;
    document.body.appendChild(el);
  } else {
    el.classList.add('on');
  }
}

function proceedEmergency() {
  closeM('warningM');
  // Step 2: start location tracking
  requestLocation(true);
  // Step 3: show monitoring modal
  const id = 'sosMonitor';
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    el.className = 'backdrop on';
    el.innerHTML = `<div class="mbox"><div class="mhead"><h3>🆘 SOS Activated</h3><button onclick="closeM('${id}')">✕</button></div>
      <div class="mbody">
        <p id="sosStatus">You are under monitoring. Your live location is being tracked.</p>
        <div style="margin-top:12px">
          <button class="btn-full btn-red" onclick="simulateNotify()">Notify Now</button>
          <button class="btn-full btn-grey" onclick="closeM('${id}')">Close</button>
        </div>
      </div></div>`;
    document.body.appendChild(el);
  } else {
    el.classList.add('on');
  }
  // Step 4: simulate sending emergency info to hospitals/volunteers/contacts
  setTimeout(() => {
    toast('Notifying nearest hospitals, volunteers and your emergency contacts...');
    // store emergency request in localStorage for admin view
    const reqs = JSON.parse(localStorage.getItem('medi_emergencies') || '[]');
    reqs.unshift({
      id: 'EM' + Date.now(),
      time: new Date().toISOString(),
      location: state.userLocation || { lat: 11.6643, lng: 78.1460 },
      status: 'sent'
    });
    localStorage.setItem('medi_emergencies', JSON.stringify(reqs));
  }, 800);
}

function simulateNotify() {
  toast('All contacts notified (demo).');
}

/* -------------------------
   AI Chatbot (local KB)
   - Simple rule-based matching + FAQ lookup
   - Typing animation + quick replies
   ------------------------- */
function openChatBot() {
  // create chat modal
  const id = 'chatM';
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    el.className = 'backdrop on';
    el.innerHTML = `<div class="mbox" style="max-width:640px">
      <div class="mhead"><h3>🤖 MediHelp AI — Medical Assistant</h3><button onclick="closeM('${id}')">✕</button></div>
      <div class="mbody">
        <div id="chatWindow" style="height:320px;overflow:auto;border:1px solid rgba(0,0,0,.06);padding:8px;border-radius:8px;margin-bottom:8px;background:var(--bg)"></div>
        <div id="quickReplies" style="display:flex;gap:8px;margin-bottom:8px"></div>
        <div style="display:flex;gap:8px">
          <input id="chatInput" class="m-input" placeholder="Ask about first aid, medicines, emergency steps..." />
          <button class="btn-full btn-brand" style="width:140px" onclick="sendChat()">Send</button>
        </div>
      </div></div>`;
    document.body.appendChild(el);
    // render quick replies
    const quick = ['First aid for bleeding','What to do in a heart attack','Nearest ambulance','Blood donation info','Mental health support'];
    document.getElementById('quickReplies').innerHTML = quick.map(q => `<button class="btn-full btn-grey" style="width:auto;padding:8px 10px" onclick="quickAsk('${q}')">${q}</button>`).join('');
    // load initial greeting
    setTimeout(()=>botReply("Hello 👋 — I'm MediHelp AI. I can help with first aid, emergency procedures, medicine info, hospital guidance and more. Type your question or choose a quick reply."), 300);
  } else {
    el.classList.add('on');
  }
}

function quickAsk(q) {
  document.getElementById('chatInput').value = q;
  sendChat();
}

function sendChat() {
  const input = document.getElementById('chatInput');
  const q = input.value.trim();
  if (!q) { toast('Type a question'); return; }
  appendUserMessage(q);
  input.value = '';
  // typing animation
  appendBotTyping();
  setTimeout(() => {
    // match against knowledge base and faqs
    const ans = findKBAnswer(q);
    removeBotTyping();
    appendBotMessage(ans.text, ans.urgent);
    if (ans.quick && ans.quick.length) {
      const qr = document.getElementById('quickReplies');
      qr.innerHTML = ans.quick.map(s => `<button class="btn-full btn-grey" style="width:auto;padding:8px 10px" onclick="quickAsk('${s}')">${s}</button>`).join('');
    }
  }, 900 + Math.random()*900);
}

function appendUserMessage(text) {
  const w = document.getElementById('chatWindow');
  const el = document.createElement('div');
  el.style.textAlign = 'right';
  el.innerHTML = `<div style="display:inline-block;background:linear-gradient(135deg,#E8F7F2,#CDEEE3);padding:8px 12px;border-radius:12px;margin:6px 0;font-weight:700">${escapeHtml(text)}</div>`;
  w.appendChild(el); w.scrollTop = w.scrollHeight;
}

function appendBotTyping() {
  const w = document.getElementById('chatWindow');
  const el = document.createElement('div');
  el.id = 'botTyping';
  el.innerHTML = `<div style="display:inline-block;background:var(--surface);padding:8px 12px;border-radius:12px;margin:6px 0;color:var(--muted)">🤖 typing<span class="dots">...</span></div>`;
  w.appendChild(el); w.scrollTop = w.scrollHeight;
}
function removeBotTyping() {
  const el = document.getElementById('botTyping'); if (el) el.remove();
}

function appendBotMessage(text, urgent=false) {
  const w = document.getElementById('chatWindow');
  const el = document.createElement('div');
  el.style.textAlign = 'left';
  el.innerHTML = `<div style="display:inline-block;background:var(--surface);padding:10px 12px;border-radius:12px;margin:6px 0;max-width:86%">${escapeHtml(text)}${urgent?'<div style="margin-top:8px;padding:8px;border-radius:8px;background:#FFF1F0;color:#B42318;font-weight:800">⚠️ Emergency suggestion: Call 108 / 112 now</div>':''}</div>`;
  w.appendChild(el); w.scrollTop = w.scrollHeight;
}

/* Simple KB matching */
function findKBAnswer(q) {
  const text = q.toLowerCase();
  // check FAQs first
  for (const f of state.faqs || []) {
    if (text.includes(f.q.toLowerCase().split(' ')[0]) || text.includes(f.q.toLowerCase())) {
      return { text: f.a, quick: f.quick || [], urgent: f.urgent || false };
    }
  }
  // check knowledgebase keywords
  for (const k of state.knowledgebase || []) {
    for (const kw of k.keywords) {
      if (text.includes(kw)) {
        return { text: k.answer, quick: k.quick || [], urgent: k.urgent || false };
      }
    }
  }
  // fallback
  return { text: "I couldn't find an exact match. If this is an emergency, call 108 or 112. Otherwise try: 'first aid for burns', 'how to stop bleeding', 'medicine paracetamol dosage'.", quick: ['First aid for bleeding','Burn first aid'], urgent: false };
}

/* -------------------------
   Doctors & Appointments (client-side)
   ------------------------- */
function openDoctors() {
  // open modal with doctor list and filters
  const id = 'doctorsM';
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    el.className = 'backdrop on';
    el.innerHTML = `<div class="mbox wide"><div class="mhead"><h3>🩺 Doctors</h3><button onclick="closeM('${id}')">✕</button></div>
      <div class="mbody">
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <input id="docSearch" class="m-input" placeholder="Search by name or specialization" />
          <select id="docSpec" class="m-input"><option value="">All specializations</option></select>
        </div>
        <div id="docList" style="max-height:420px;overflow:auto"></div>
      </div></div>`;
    document.body.appendChild(el);
    document.getElementById('docSearch').addEventListener('input', filterDoctors);
  } else {
    el.classList.add('on');
  }
  renderDoctors();
}

function renderDoctors() {
  const list = document.getElementById('docList');
  const docs = state.doctors.length ? state.doctors : (window.doctors || []);
  // populate specialization select
  const specSet = new Set(docs.map(d => d.specialization || 'General'));
  const sel = document.getElementById('docSpec');
  if (sel) {
    sel.innerHTML = `<option value="">All specializations</option>` + Array.from(specSet).map(s => `<option value="${s}">${s}</option>`).join('');
    sel.onchange = filterDoctors;
  }
  list.innerHTML = docs.map(d => `<div class="svc-card">
    <div class="svc-head"><span class="svc-name">${d.name}</span><span style="margin-left:auto;font-weight:800">${d.rating || '4.2'} ⭐</span></div>
    <div class="svc-detail">${d.specialization || 'General'} · ${d.hospital || ''}<br>📞 ${d.contact || ''} · ${d.availability || '9am-5pm'}</div>
    <div style="display:flex;gap:8px;margin-top:8px">
      <button class="btn-full btn-brand" onclick="bookAppointment('${encodeURIComponent(d.name)}')">Book</button>
      <button class="btn-full btn-grey" onclick="callNumber('${d.contact || ''}')">Call</button>
    </div>
  </div>`).join('');
}

function filterDoctors() {
  const q = (document.getElementById('docSearch')?.value || '').toLowerCase();
  const spec = (document.getElementById('docSpec')?.value || '');
  const docs = (state.doctors.length ? state.doctors : (window.doctors || [])).filter(d => {
    const matchQ = !q || (d.name + ' ' + (d.specialization || '') + ' ' + (d.hospital || '')).toLowerCase().includes(q);
    const matchSpec = !spec || (d.specialization === spec);
    return matchQ && matchSpec;
  });
  const list = document.getElementById('docList');
  list.innerHTML = docs.map(d => `<div class="svc-card">
    <div class="svc-head"><span class="svc-name">${d.name}</span><span style="margin-left:auto;font-weight:800">${d.rating || '4.2'} ⭐</span></div>
    <div class="svc-detail">${d.specialization || 'General'} · ${d.hospital || ''}<br>📞 ${d.contact || ''} · ${d.availability || '9am-5pm'}</div>
    <div style="display:flex;gap:8px;margin-top:8px">
      <button class="btn-full btn-brand" onclick="bookAppointment('${encodeURIComponent(d.name)}')">Book</button>
      <button class="btn-full btn-grey" onclick="callNumber('${d.contact || ''}')">Call</button>
    </div>
  </div>`).join('');
}

function bookAppointment(docNameEncoded) {
  const docName = decodeURIComponent(docNameEncoded);
  const when = prompt(`Book appointment with ${docName}\nEnter preferred date & time (e.g. 2026-07-05 10:30)`);
  if (!when) return;
  // store appointment in localStorage (demo)
  const appts = JSON.parse(localStorage.getItem('medi_appointments') || '[]');
  appts.unshift({ id: 'AP' + Date.now(), doctor: docName, when, user: state.currentUser?.email || 'Guest' });
  localStorage.setItem('medi_appointments', JSON.stringify(appts));
  toast('Appointment requested. Confirmations will be sent (demo).');
}

/* -------------------------
   Volunteers & Donors
   ------------------------- */
function openVolunteer() {
  const id = 'volM';
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    el.className = 'backdrop on';
    el.innerHTML = `<div class="mbox wide"><div class="mhead"><h3>🧑‍🚒 Volunteer Groups</h3><button onclick="closeM('${id}')">✕</button></div>
      <div class="mbody">
        <div id="volList"></div>
      </div></div>`;
    document.body.appendChild(el);
  } else el.classList.add('on');
  renderVolunteers();
}

function renderVolunteers() {
  const list = document.getElementById('volList');
  const groups = state.volunteers.length ? state.volunteers : (window.volunteers || []);
  list.innerHTML = groups.map(g => `<div class="svc-card">
    <div class="svc-head"><span class="svc-name">${g.name}</span><span style="margin-left:auto">${g.members.length} members</span></div>
    <div class="svc-detail">${g.description || ''}</div>
    <div style="display:flex;gap:8px;margin-top:8px">
      <button class="btn-full btn-brand" onclick="joinGroup('${g.id}')">Join</button>
      <button class="btn-full btn-grey" onclick="leaveGroup('${g.id}')">Leave</button>
      <button class="btn-full btn-amber" onclick="viewMembers('${g.id}')">View</button>
    </div>
  </div>`).join('');
}

function joinGroup(id) {
  const g = (state.volunteers || []).find(x => x.id === id);
  if (!g) return;
  const me = state.currentUser?.name || 'Guest';
  if (!g.members.includes(me)) g.members.push(me);
  toast(`Joined ${g.name}`);
  localStorage.setItem('medi_volunteers', JSON.stringify(state.volunteers));
  renderVolunteers();
}
function leaveGroup(id) {
  const g = (state.volunteers || []).find(x => x.id === id);
  if (!g) return;
  const me = state.currentUser?.name || 'Guest';
  g.members = g.members.filter(m => m !== me);
  toast(`Left ${g.name}`);
  localStorage.setItem('medi_volunteers', JSON.stringify(state.volunteers));
  renderVolunteers();
}
function viewMembers(id) {
  const g = (state.volunteers || []).find(x => x.id === id);
  if (!g) return;
  alert(`Members of ${g.name}:\n\n${g.members.join('\n')}`);
}

/* -------------------------
   Blood donors
   ------------------------- */
function openBloodDonors() {
  openM('bloodM');
  renderBlood();
}
function renderBlood() {
  const el = document.getElementById('bloodGrid') || document.createElement('div');
  // simple rendering using state.donors or database
  const donors = state.donors.length ? state.donors : (window.donors || []);
  const gridHtml = donors.map(d => `<div class="place-card">
    <div class="p-ico-box">🩸</div>
    <div style="flex:1">
      <div class="p-name">${d.name} · ${d.blood}</div>
      <div class="p-addr">${d.location || ''} · Last: ${d.lastDonation || 'N/A'}</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn-full btn-amber" onclick="callNumber('${d.phone}')">📞 ${d.phone}</button>
      <button class="btn-full btn-grey" onclick="requestBlood('${d.id}')">Request</button>
    </div>
  </div>`).join('');
  if (document.getElementById('bloodGrid')) {
    document.getElementById('bloodGrid').innerHTML = gridHtml;
  } else {
    document.body.appendChild(el);
    el.id = 'bloodGrid';
    el.innerHTML = gridHtml;
  }
}
function requestBlood(id) {
  toast('Blood request sent (demo).');
}

/* -------------------------
   Helper: escape HTML
   ------------------------- */
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* -------------------------
   Init
   ------------------------- */
window.addEventListener('load', async () => {
  await loadDatabase();
  initMap();
  // set global quick access
  window.openM = openM;
  window.openChatBot = openChatBot;
  // attach chat open to nav
  document.querySelectorAll('[onclick="openM(\'chatM\')"]').forEach(el => el.addEventListener('click', openChatBot));
  // render initial data
  if (state.faqs.length === 0 && window.faqs) state.faqs = window.faqs;
  if (state.knowledgebase.length === 0 && window.knowledgebase) state.knowledgebase = window.knowledgebase;
  // set global references for maps.js
  window.state = state;
});
