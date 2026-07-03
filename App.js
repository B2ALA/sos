/* ══════════════════════════════════════════════
   MEDIHELP — app.js
   NOTE: Only one fragment of the original dashboard script was
   provided (SOS contacts, notifications, offline medical ID, init).
   That fragment is kept below UNCHANGED. Everything above the
   "═ ORIGINAL CODE" marker is new minimal scaffolding so this file
   can run standalone until the rest of the original script is
   supplied — swap these stubs out for your real implementations.
   ══════════════════════════════════════════════ */

// ── NEW: minimal data + stubs (replace with your real originals) ──
const sosContacts=[
  {name:'Amma',rel:'Mother',num:'+91 90000 00001'},
  {name:'Appa',rel:'Father',num:'+91 90000 00002'},
  {name:'Kumar',rel:'Neighbor',num:'+91 90000 00003'},
];
const medID={
  name:'Guest User',blood:'O+',allergies:'None recorded',emContact:'+91 90000 00001'
};

// modal open/close (referenced by onclick="openM('sosM')" etc. in index.html)
function openM(id){document.getElementById(id)?.classList.add('open');}
function closeM(id){document.getElementById(id)?.classList.remove('open');}

// geolocation status bar shown inside SOS / location-share modals
function geoBarUpdate(targetId){
  const el=document.getElementById(targetId);
  if(!el)return;
  el.innerHTML='📍 Getting your location…';
  if(!navigator.geolocation){el.innerHTML='⚠️ Location not supported on this device';return;}
  navigator.geolocation.getCurrentPosition(
    pos=>{el.innerHTML=`📍 Live location locked (±${Math.round(pos.coords.accuracy)}m)`;},
    ()=>{el.innerHTML='⚠️ Location permission denied — enable it to share with contacts';}
  );
}

// TODO: replace each stub with the real implementation from your existing project
function renderAmb(){ /* TODO: ambulance list render */ }
function renderPolice(){ /* TODO: nearby police stations render */ }
function renderBlood(){ /* TODO: blood bank availability render */ }
function renderBeds(){ /* TODO: hospital bed availability render */ }
function renderSymptomChips(){ /* TODO: symptom checker chips render */ }
function renderHeatmap(){ /* TODO: disease heatmap render */ }
function renderQueue(){ /* TODO: OPD/queue tracker render */ }
function renderRecords(){ /* TODO: medical records list render */ }
function renderIDCard(){ /* TODO: digital ID card render */ }
function renderDoctors(){ /* TODO: doctor directory render — see js/doctors.js in Phase 2 */ }

// ═ ORIGINAL CODE (from user-provided snippet — unchanged) ═════════

function renderLocShare(){
  const contacts=[...sosContacts,{name:'Hospital',rel:'Salem Govt Medical College',num:'+91 427 2334000'}];
  document.getElementById('locShareContacts').innerHTML=contacts.map((c,i)=>`
    <div class="loc-share-item">
      <div style="display:flex;align-items:center;gap:9px;"><span style="font-size:19px;">${i<3?'👤':'🏥'}</span>
        <div><div style="font-weight:700;font-size:13px;">${c.name}</div><div style="font-size:11px;color:var(--ink-4);">${c.rel}</div></div></div>
      <button class="toggle-btn" onclick="this.classList.toggle('on')"></button>
    </div>`).join('');
}

// ══ NOTIFICATIONS ══
const notifs=[
  {ico:'🦟',title:'Dengue Alert — Salem',detail:'Surge reported in Hasthampatty & Ammapet zones. Use mosquito repellent.',time:'2 hrs ago'},
  {ico:'⛈️',title:'Heavy Rain Warning',detail:'IMD alert: Moderate to heavy rain expected tonight near Salem district. Avoid low-lying areas.',time:'4 hrs ago'},
  {ico:'💊',title:'Medicine Reminder',detail:'Metformin 500mg — Take with dinner today at 8 PM.',time:'Scheduled'},
  {ico:'🏥',title:'Appointment Reminder',detail:'Dr. Lakshmi Narayanan — Tomorrow 10:30 AM, Salem Govt Medical College Hospital.',time:'Tomorrow'},
  {ico:'🩸',title:'Blood Donation Camp',detail:'Salem Red Cross drive at Shevapet Community Hall on Saturday.',time:'3 days ago'},
];
function renderNotifs(){
  document.getElementById('notifList').innerHTML=notifs.map(n=>`
    <div class="notif-item"><div class="notif-ico">${n.ico}</div>
      <div class="notif-text"><div class="nt">${n.title}</div><div class="nd">${n.detail}</div><div class="nt-time">${n.time}</div></div></div>`).join('');
}

// ══ OFFLINE MID ══
function initOfflineMID(){
  document.getElementById('offlineMID').innerHTML=`<strong>Name:</strong> ${medID.name}<br><strong>Blood:</strong> ${medID.blood}<br><strong>Allergies:</strong> ${medID.allergies}<br><strong>Emergency:</strong> ${medID.emContact}`;
}

// ══ INIT ══
window.addEventListener('load',()=>{
  renderAmb();renderPolice();renderBlood();renderBeds();
  renderSymptomChips();renderHeatmap();renderQueue();
  renderRecords();renderNotifs();initOfflineMID();renderIDCard();renderDoctors();
});

// attach geo-prompt to sosM and locShareM open
document.querySelectorAll('[onclick="openM(\'sosM\')"]').forEach(el=>{
  el.addEventListener('click',()=>{renderSOSContacts?.();geoBarUpdate('sosGeoBar');});
});
document.querySelectorAll('[onclick="openM(\'locShareM\')"]').forEach(el=>{
  el.addEventListener('click',renderLocShare);
});

/*
 ════════════════════════════════════════════════════════════════
 PRODUCTION NOTE — connecting real Google Places data
 ════════════════════════════════════════════════════════════════
 This demo uses a static nearbyDB scoped to Salem so it works without
 an API key. To wire up live Google Places results:

 1. Get a Google Maps Platform API key with "Places API" enabled.
 2. Create a small backend endpoint (Node/Vercel function) at /api/nearby
    that calls:
    https://maps.googleapis.com/maps/api/place/nearbysearch/json
      ?location={lat},{lng}&radius=5000&type=hospital&key=YOUR_KEY
    (NEVER call this directly from the browser — it exposes your key.)
 3. Replace openNearby() above with a fetch('/api/nearby?type=...&lat=...&lng=...')
    call, and map the returned `results[]` array into the same place-card
    markup already used here (name, vicinity, rating, opening_hours.open_now,
    geometry.location for distance, and place_id for the "View on Maps" link:
    https://www.google.com/maps/place/?q=place_id:{place_id}).
 ════════════════════════════════════════════════════════════════
*/
