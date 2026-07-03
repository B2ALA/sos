/* ══════════════════════════════════════════════════════════════
   MediHelp — MAIN APP LOGIC (index.html)
   ══════════════════════════════════════════════════════════════ */

/* ---------- Modal helpers ---------- */
function openM(id){ document.getElementById(id).classList.add('open'); }
function closeM(id){ document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-overlay').forEach(ov=>{
  ov.addEventListener('click', e=>{ if(e.target === ov) ov.classList.remove('open'); });
});

/* ---------- Toast ---------- */
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=>t.classList.remove('show'), 3200);
}

/* ---------- Dark mode ---------- */
function toggleDark(){
  document.body.classList.toggle('dark');
  MHStore.set('darkMode', document.body.classList.contains('dark'));
}
if(MHStore.get('darkMode')) document.body.classList.add('dark');

/* ---------- Distance helper (Haversine, km) ---------- */
function distKm(lat1,lng1,lat2,lng2){
  const R=6371, dLat=(lat2-lat1)*Math.PI/180, dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

let userLoc = MHStore.get('lastKnownLoc', null); // {lat,lng}

function getUserLocation(cb){
  if(!navigator.geolocation){ toast('📍 Geolocation not supported on this device'); cb(null); return; }
  navigator.geolocation.getCurrentPosition(
    pos=>{
      userLoc = { lat:pos.coords.latitude, lng:pos.coords.longitude };
      MHStore.set('lastKnownLoc', userLoc);
      cb(userLoc);
    },
    err=>{ toast('📍 Could not get location — showing default Salem area results'); cb(null); },
    { enableHighAccuracy:true, timeout:8000 }
  );
}

function geoBarUpdate(elId){
  const el = document.getElementById(elId);
  if(!el) return;
  el.textContent = '📍 Getting your live location…';
  getUserLocation(loc=>{
    el.textContent = loc
      ? `📍 Location active — lat ${loc.lat.toFixed(4)}, lng ${loc.lng.toFixed(4)}`
      : '📍 Using approximate Salem location (permission denied or unavailable)';
  });
}

/* ══════════════════════════════════════════════════════════════
   DOCTORS — search / filter by specialization / sort by distance
   ══════════════════════════════════════════════════════════════ */
function renderDoctors(){
  const doctors = MHStore.get('doctors', []);
  const q = (document.getElementById('docSearch')?.value || '').toLowerCase();
  const spec = document.getElementById('docSpecFilter')?.value || 'all';
  const sortBy = document.getElementById('docSort')?.value || 'name';

  let list = doctors.filter(d=>
    (spec==='all' || d.spec===spec) &&
    (d.name.toLowerCase().includes(q) || d.spec.toLowerCase().includes(q) || d.hospital.toLowerCase().includes(q))
  );

  if(sortBy === 'distance' && userLoc){
    list = list.map(d=>({...d, _dist:distKm(userLoc.lat,userLoc.lng,d.lat,d.lng)})).sort((a,b)=>a._dist-b._dist);
  } else if(sortBy === 'rating'){
    list = [...list].sort((a,b)=>b.rating-a.rating);
  } else {
    list = [...list].sort((a,b)=>a.name.localeCompare(b.name));
  }

  const specSel = document.getElementById('docSpecFilter');
  if(specSel && specSel.options.length<=1){
    const specs = [...new Set(doctors.map(d=>d.spec))];
    specSel.innerHTML = '<option value="all">All Specializations</option>' + specs.map(s=>`<option value="${s}">${s}</option>`).join('');
  }

  document.getElementById('doctorList').innerHTML = list.map(d=>`
    <div class="card">
      <div class="card-row">
        <div>
          <div style="font-weight:700;font-size:14.5px;">👨‍⚕️ ${d.name}</div>
          <div class="muted small">${d.spec} · ${d.hospital}</div>
        </div>
        <span class="badge ${d.emergency?'alert':''}">${d.emergency?'🚨 Emergency':'⭐ '+d.rating}</span>
      </div>
      <div class="small muted" style="margin-top:8px;">📍 ${d.location}${d._dist?` · ${d._dist.toFixed(1)} km away`:''}</div>
      <div class="small muted">🕒 ${d.availability}</div>
      <div class="flex gap-8" style="margin-top:12px;">
        <a class="btn btn-primary btn-sm" href="tel:${d.phone.replace(/\s/g,'')}">📞 Call</a>
        <a class="btn btn-outline btn-sm" href="${d.maps}" target="_blank" rel="noopener">🗺️ Map</a>
        <button class="btn btn-ghost btn-sm" onclick="bookAppointment('${d.id}')">📅 Book</button>
      </div>
    </div>`).join('') || '<p class="muted">No doctors match your search.</p>';
}
function bookAppointment(id){
  const d = MHStore.get('doctors',[]).find(x=>x.id===id);
  toast(`📅 Appointment request sent to ${d.name}. They'll confirm by phone shortly.`);
}

/* ══════════════════════════════════════════════════════════════
   HOSPITALS
   ══════════════════════════════════════════════════════════════ */
function renderHospitals(){
  const hospitals = MHStore.get('hospitals', []);
  const q = (document.getElementById('hospSearch')?.value || '').toLowerCase();
  const type = document.getElementById('hospTypeFilter')?.value || 'all';
  let list = hospitals.filter(h => (type==='all'||h.type===type) && h.name.toLowerCase().includes(q));
  if(userLoc) list = list.map(h=>({...h,_dist:distKm(userLoc.lat,userLoc.lng,h.lat,h.lng)})).sort((a,b)=>a._dist-b._dist);

  document.getElementById('hospitalList').innerHTML = list.map(h=>`
    <div class="card">
      <div class="card-row">
        <div>
          <div style="font-weight:700;font-size:14.5px;">🏥 ${h.name}</div>
          <div class="muted small">${h.type} · ${h.address}</div>
        </div>
        <span class="badge">${h.ambulance?'🚑 Ambulance':'—'}</span>
      </div>
      <div class="flex gap-8" style="margin-top:10px;flex-wrap:wrap;">
        <span class="badge">🛏️ ${h.beds} beds</span>
        <span class="badge warn">🧬 ${h.icu} ICU</span>
        ${h._dist?`<span class="badge">📏 ${h._dist.toFixed(1)} km</span>`:''}
      </div>
      <div class="flex gap-8" style="margin-top:12px;">
        <a class="btn btn-primary btn-sm" href="tel:${h.emergency.split('/')[0].trim().replace(/\s/g,'')}">🚨 Emergency</a>
        <a class="btn btn-outline btn-sm" href="${h.maps}" target="_blank" rel="noopener">🗺️ Directions</a>
      </div>
    </div>`).join('') || '<p class="muted">No hospitals found.</p>';
}

/* ══════════════════════════════════════════════════════════════
   BLOOD DONORS
   ══════════════════════════════════════════════════════════════ */
function renderDonors(){
  const donors = MHStore.get('donors', []);
  const bg = document.getElementById('donorBloodFilter')?.value || 'all';
  const onlyAvail = document.getElementById('donorAvailOnly')?.checked;
  const list = donors.filter(d => (bg==='all'||d.blood===bg) && (!onlyAvail || d.available));

  document.getElementById('donorList').innerHTML = list.map(d=>`
    <div class="card">
      <div class="card-row">
        <div>
          <div style="font-weight:700;font-size:14.5px;">🧑 ${d.name}</div>
          <div class="muted small">📍 ${d.location} · Last donated ${d.lastDonation}</div>
        </div>
        <span class="badge ${d.available?'':'warn'}">🩸 ${d.blood}</span>
      </div>
      <div class="flex gap-8" style="margin-top:12px;">
        <a class="btn btn-primary btn-sm" href="tel:${d.phone.replace(/\s/g,'')}">📞 Contact</a>
        <span class="badge ${d.available?'':'warn'}" style="align-self:center;">${d.available?'✅ Available':'⏳ Not available'}</span>
      </div>
    </div>`).join('') || '<p class="muted">No donors match this filter.</p>';
}
function requestBlood(e){
  e.preventDefault();
  const group = document.getElementById('reqBloodGroup').value;
  const requests = MHStore.get('bloodRequests', []);
  requests.push({ id:'BR'+Date.now(), group, name:document.getElementById('reqName').value, phone:document.getElementById('reqPhone').value, time:new Date().toISOString() });
  MHStore.set('bloodRequests', requests);
  toast(`🩸 Blood request for ${group} broadcast to nearby donors!`);
  closeM('bloodRequestM');
  e.target.reset();
}
function registerDonor(e){
  e.preventDefault();
  const donors = MHStore.get('donors', []);
  donors.push({
    id:'B'+Date.now(), name:document.getElementById('donName').value, blood:document.getElementById('donBlood').value,
    phone:document.getElementById('donPhone').value, location:document.getElementById('donLocation').value,
    lastDonation:document.getElementById('donLast').value || '—', available:true
  });
  MHStore.set('donors', donors);
  toast('🩸 Thank you for registering as a blood donor!');
  closeM('donorRegM');
  e.target.reset();
  renderDonors();
}

/* ══════════════════════════════════════════════════════════════
   VOLUNTEER GROUPS
   ══════════════════════════════════════════════════════════════ */
function renderVolunteers(){
  const groups = MHStore.get('volunteerGroups', []);
  const joined = MHStore.get('joinedGroups', []);
  document.getElementById('volunteerList').innerHTML = groups.map(g=>{
    const isJoined = joined.includes(g.id);
    const icon = {Fire:'🔥',Medical:'⚕️',Rescue:'🧗',Disaster:'🌊',Accident:'🚗'}[g.category] || '👥';
    return `<div class="card">
      <div class="card-row">
        <div>
          <div style="font-weight:700;font-size:14.5px;">${icon} ${g.name}</div>
          <div class="muted small">${g.area} · ${g.members} members</div>
        </div>
        <span class="badge">${g.category}</span>
      </div>
      <div class="flex gap-8" style="margin-top:12px;">
        <a class="btn btn-outline btn-sm" href="tel:${g.contact.replace(/\s/g,'')}">📞 Contact</a>
        <button class="btn ${isJoined?'btn-ghost':'btn-primary'} btn-sm" onclick="toggleJoinGroup('${g.id}')">${isJoined?'✅ Joined — Leave':'🙋 Join Group'}</button>
      </div>
    </div>`;
  }).join('');
}
function toggleJoinGroup(id){
  let joined = MHStore.get('joinedGroups', []);
  if(joined.includes(id)){ joined = joined.filter(g=>g!==id); toast('You left the group.'); }
  else { joined.push(id); toast('🙋 You joined the group — you\'ll get emergency alerts for this category.'); }
  MHStore.set('joinedGroups', joined);
  renderVolunteers();
}
function notifyVolunteers(category){
  const groups = MHStore.get('volunteerGroups', []).filter(g=>g.category===category);
  const reqs = MHStore.get('volunteerRequests', []);
  groups.forEach(g=> reqs.push({ id:'VR'+Date.now()+g.id, group:g.name, category, time:new Date().toISOString(), status:'pending' }) );
  MHStore.set('volunteerRequests', reqs);
  return groups.length;
}

/* ══════════════════════════════════════════════════════════════
   SCHOOLS & COLLEGES — EMERGENCY SHELTERS
   ══════════════════════════════════════════════════════════════ */
function renderShelters(){
  const shelters = MHStore.get('shelters', []);
  let list = shelters;
  if(userLoc) list = list.map(s=>({...s,_dist:distKm(userLoc.lat,userLoc.lng,s.lat,s.lng)})).sort((a,b)=>a._dist-b._dist);
  document.getElementById('shelterList').innerHTML = list.map(s=>`
    <div class="card">
      <div class="card-row">
        <div>
          <div style="font-weight:700;font-size:14.5px;">${s.type==='School'?'🏫':'🎓'} ${s.name}</div>
          <div class="muted small">${s.address}</div>
        </div>
        ${s._dist?`<span class="badge">📏 ${s._dist.toFixed(1)} km</span>`:''}
      </div>
      <div class="flex gap-8" style="margin-top:12px;">
        <a class="btn btn-primary btn-sm" href="tel:${s.phone.replace(/\s/g,'')}">📞 Call</a>
        <a class="btn btn-outline btn-sm" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name+' '+s.address)}" target="_blank" rel="noopener">🗺️ Route</a>
      </div>
    </div>`).join('');
}

/* ══════════════════════════════════════════════════════════════
   SOS EMERGENCY FLOW
   ══════════════════════════════════════════════════════════════ */
let sosMonitoring = false;
let sosWatchId = null;

function openSOSConfirm(){ openM('sosConfirmM'); }

function confirmSOS(){
  closeM('sosConfirmM');
  toast('🚨 Emergency alert activating…');

  // Step 2: start location tracking
  if(navigator.geolocation){
    sosWatchId = navigator.geolocation.watchPosition(
      pos=>{ userLoc = {lat:pos.coords.latitude,lng:pos.coords.longitude}; MHStore.set('lastKnownLoc', userLoc); },
      err=>{}, { enableHighAccuracy:true }
    );
  }
  sosMonitoring = true;

  // Step 4: log + "send" to hospitals / volunteers / emergency contacts
  const req = {
    id:'SOS'+Date.now(), time:new Date().toISOString(),
    loc:userLoc, status:'active',
    notifiedHospitals: MHStore.get('hospitals',[]).slice(0,3).map(h=>h.name),
    notifiedVolunteers: notifyVolunteers('Medical') + notifyVolunteers('Rescue')
  };
  const reqs = MHStore.get('emergencyRequests', []);
  reqs.push(req);
  MHStore.set('emergencyRequests', reqs);

  // Step 3: show monitoring state
  document.getElementById('sosMonitorBanner').classList.remove('hidden');
  document.getElementById('sosIdle').classList.add('hidden');
  openM('sosStatusM');
  document.getElementById('sosStatusDetail').innerHTML = `
    <p>🚨 <strong>You are under monitoring.</strong> Your live location is being tracked and shared.</p>
    <p class="small muted">📍 ${userLoc ? `Lat ${userLoc.lat.toFixed(4)}, Lng ${userLoc.lng.toFixed(4)}` : 'Acquiring location…'}</p>
    <p class="small">✅ Notified: ${req.notifiedHospitals.join(', ')}</p>
    <p class="small">✅ ${req.notifiedVolunteers} volunteer group(s) alerted for this area</p>
    <p class="small">✅ Emergency contacts notified with your live location link</p>`;
}

function cancelSOS(){
  sosMonitoring = false;
  if(sosWatchId!==null) navigator.geolocation.clearWatch(sosWatchId);
  document.getElementById('sosMonitorBanner').classList.add('hidden');
  document.getElementById('sosIdle').classList.remove('hidden');
  const reqs = MHStore.get('emergencyRequests', []);
  if(reqs.length) reqs[reqs.length-1].status = 'cancelled';
  MHStore.set('emergencyRequests', reqs);
  closeM('sosStatusM');
  toast('SOS cancelled — you are safe. Stay well! 💚');
}

/* ══════════════════════════════════════════════════════════════
   CHATBOT UI
   ══════════════════════════════════════════════════════════════ */
function initChatbot(){
  const body = document.getElementById('chatBody');
  body.innerHTML = '';
  addBotMsg("Hi, I'm MediBot 🤖💚 Ask me about first aid, symptoms, medicines, hospitals, or mental health support. In a real emergency, please tap SOS or dial 108 first.");
  document.getElementById('chatQuick').innerHTML = CHATBOT_QUICK_REPLIES.map(q=>`<button class="chip" onclick="sendChatQuick('${q.replace(/'/g,"\\'")}')">${q}</button>`).join('');
}
function addBotMsg(text){
  const body = document.getElementById('chatBody');
  const div = document.createElement('div');
  div.className='msg bot';
  div.textContent = text;
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
}
function addUserMsg(text){
  const body = document.getElementById('chatBody');
  const div = document.createElement('div');
  div.className='msg user';
  div.textContent = text;
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
}
function sendChatQuick(q){
  document.getElementById('chatInput').value = q.replace(/ [^\s]+$/,''); // strip trailing emoji for matching
  sendChat();
}
function sendChat(){
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if(!text) return;
  addUserMsg(text);
  input.value='';
  const body = document.getElementById('chatBody');
  const typing = document.createElement('div');
  typing.className='msg bot typing';
  typing.innerHTML='<span></span><span></span><span></span>';
  body.appendChild(typing);
  body.scrollTop = body.scrollHeight;
  setTimeout(()=>{
    typing.remove();
    const reply = chatbotReply(text);
    addBotMsg(`${reply.emoji} ${reply.text}`);
  }, 550 + Math.random()*450);
}
function toggleChat(){
  const panel = document.getElementById('chatPanel');
  panel.classList.toggle('open');
  if(panel.classList.contains('open') && !panel.dataset.inited){
    initChatbot();
    panel.dataset.inited = '1';
  }
}

/* ══════════════════════════════════════════════════════════════
   NEARBY (Google Maps launcher — see production note at bottom of file)
   ══════════════════════════════════════════════════════════════ */
function openNearby(type){
  getUserLocation(loc=>{
    const query = encodeURIComponent(type + ' near me');
    const url = loc
      ? `https://www.google.com/maps/search/${query}/@${loc.lat},${loc.lng},14z`
      : `https://www.google.com/maps/search/${query}+Salem+Tamil+Nadu`;
    window.open(url, '_blank');
  });
}

/* ---------- Bottom nav ---------- */
function showTab(tab){
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.add('hidden'));
  document.getElementById('tab-'+tab).classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('nav-'+tab).classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
}

/* ---------- Auth-aware header ---------- */
function refreshAuthUI(){
  const session = MHStore.get('session', null);
  const el = document.getElementById('authArea');
  if(!el) return;
  if(session){
    el.innerHTML = `<a href="profile.html" class="icon-btn" title="Profile">👤</a>`;
  } else {
    el.innerHTML = `<a href="login.html" class="btn btn-outline btn-sm">Login</a>`;
  }
}

/* ---------- Init ---------- */
window.addEventListener('load', ()=>{
  renderDoctors(); renderHospitals(); renderDonors(); renderVolunteers(); renderShelters();
  refreshAuthUI();
  geoBarUpdate('homeGeoBar');
});

/*
 ════════════════════════════════════════════════════════════════
 PRODUCTION NOTE — connecting real Google Maps / Places data
 ════════════════════════════════════════════════════════════════
 This demo uses static seed data (js/data.js) plus a Maps link-out
 (openNearby) so it works with zero API key. To go live:

 1. Get a Google Maps Platform API key with "Places API" + "Maps
    JavaScript API" enabled, restricted to your domain.
 2. Create a backend endpoint (Node/Vercel function) at /api/nearby
    that calls:
    https://maps.googleapis.com/maps/api/place/nearbysearch/json
      ?location={lat},{lng}&radius=5000&type=hospital&key=YOUR_KEY
    (NEVER call this directly from the browser — it exposes your key.)
 3. Replace openNearby() with a fetch('/api/nearby?type=...&lat=...&lng=...')
    call and render results into the same card markup used above
    (name, vicinity, rating, opening_hours.open_now, geometry.location
    for distance, and place_id for a "View on Maps" link:
    https://www.google.com/maps/place/?q=place_id:{place_id}).
 4. To show an embedded live map instead of a link-out, add the
    Maps JavaScript API script tag with your key and initialize a
    map centered on `userLoc`, dropping markers from the same
    /api/nearby response.
 ════════════════════════════════════════════════════════════════
*/
