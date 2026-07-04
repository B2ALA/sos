// finder.js — Doctor / Pharmacy / Blood Donor / Shelter locator

let userLat = null;
let userLng = null;
let currentTab = 'doctors';
let map, markersLayer;

const locStatus = document.getElementById('locStatus');
const tabsEl = document.getElementById('tabs');
const filtersEl = document.getElementById('filters');
const resultsEl = document.getElementById('results');

function initMap() {
  map = L.map('map').setView([11.0168, 76.9558], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);
}

function updateMapMarkers(items) {
  markersLayer.clearLayers();
  const bounds = [];
  items.forEach((item) => {
    if (item.latitude === undefined || item.longitude === undefined) return;
    const marker = L.marker([item.latitude, item.longitude]).bindPopup(
      `<strong>${item.name}</strong><br/>${item.distanceKm !== undefined ? item.distanceKm + ' km away' : ''}`
    );
    marker.addTo(markersLayer);
    bounds.push([item.latitude, item.longitude]);
  });
  if (bounds.length) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
}

navigator.geolocation.getCurrentPosition(
  (pos) => {
    userLat = pos.coords.latitude;
    userLng = pos.coords.longitude;
    locStatus.textContent = 'Showing results sorted by distance from you.';
    loadResults();
  },
  () => {
    locStatus.textContent = 'Location unavailable — showing unsorted results.';
    loadResults();
  }
);

initMap();

tabsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  currentTab = btn.dataset.tab;
  renderFilters();
  loadResults();
});

function renderFilters() {
  if (currentTab === 'doctors') {
    filtersEl.innerHTML = `
      <div class="field">
        <label>Specialization</label>
        <select id="filterSpecialization">
          <option value="">All</option>
          ${['Cardiologist','Neurologist','Dentist','Orthopedic','Pediatrician','General Physician','Dermatologist','ENT Specialist','Psychiatrist','Gynecologist']
            .map((s) => `<option value="${s}">${s}</option>`).join('')}
        </select>
      </div>`;
    document.getElementById('filterSpecialization').addEventListener('change', loadResults);
  } else if (currentTab === 'pharmacies') {
    filtersEl.innerHTML = `
      <div class="field">
        <label><input type="checkbox" id="filterOpen24" style="width:auto; margin-right:6px;"/>Open 24 hours only</label>
      </div>`;
    document.getElementById('filterOpen24').addEventListener('change', loadResults);
  } else if (currentTab === 'donors') {
    filtersEl.innerHTML = `
      <div class="row-2">
        <div class="field">
          <label>Blood Group</label>
          <select id="filterBloodGroup">
            <option value="">All</option>
            ${['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((b) => `<option value="${b}">${b}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>District</label>
          <select id="filterDistrict">
            <option value="">All</option>
            ${['Coimbatore','Erode','Tirupur','Salem','Madurai','Chennai','Trichy','Namakkal','Karur','Dindigul'].map((d) => `<option value="${d}">${d}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="field"><label><input type="checkbox" id="filterAvailable" style="width:auto; margin-right:6px;" checked/>Available donors only</label></div>`;
    document.getElementById('filterBloodGroup').addEventListener('change', loadResults);
    document.getElementById('filterDistrict').addEventListener('change', loadResults);
    document.getElementById('filterAvailable').addEventListener('change', loadResults);
  } else {
    filtersEl.innerHTML = `<p style="color:var(--muted); font-size:13px; margin:0;">Nearest schools, colleges, and community halls used as emergency shelters.</p>`;
  }
}

function buildQuery() {
  const params = new URLSearchParams();
  if (userLat !== null) {
    params.set('lat', userLat);
    params.set('lng', userLng);
  }
  params.set('limit', 20);

  if (currentTab === 'doctors') {
    const spec = document.getElementById('filterSpecialization')?.value;
    if (spec) params.set('specialization', spec);
  } else if (currentTab === 'pharmacies') {
    const open24 = document.getElementById('filterOpen24')?.checked;
    if (open24) params.set('open24hrs', 'true');
  } else if (currentTab === 'donors') {
    const bg = document.getElementById('filterBloodGroup')?.value;
    const dist = document.getElementById('filterDistrict')?.value;
    const avail = document.getElementById('filterAvailable')?.checked;
    if (bg) params.set('bloodGroup', bg);
    if (dist) params.set('district', dist);
    if (avail) params.set('availableOnly', 'true');
  }
  return params.toString();
}

function endpointFor(tab) {
  return { doctors: '/api/doctors', pharmacies: '/api/pharmacies', donors: '/api/donors', shelters: '/api/shelters' }[tab];
}

async function loadResults() {
  resultsEl.innerHTML = '<p style="color:var(--muted);">Loading...</p>';
  try {
    const res = await fetch(`${endpointFor(currentTab)}?${buildQuery()}`);
    const data = await res.json();
    renderResults(data.results);
    updateMapMarkers(data.results);
  } catch (err) {
    resultsEl.innerHTML = '<p class="error-text">Failed to load results.</p>';
    console.error(err);
  }
}

function renderResults(items) {
  if (!items.length) {
    resultsEl.innerHTML = '<p style="color:var(--muted);">No results found.</p>';
    return;
  }

  resultsEl.innerHTML = items.map((item) => renderCard(item)).join('');
}

function renderCard(item) {
  const distance = item.distanceKm !== undefined ? `<span>📍 ${item.distanceKm} km</span>` : '';

  if (currentTab === 'doctors') {
    return `<div class="result-card">
      <div class="title">${item.name}</div>
      <div class="subtitle">${item.specialization} · ${item.hospital}</div>
      <div class="meta">${distance}<span>⭐ ${item.rating}</span><span>${item.availability}</span></div>
      <div class="meta" style="margin-top:6px;"><span>📞 ${item.phone}</span></div>
    </div>`;
  }
  if (currentTab === 'pharmacies') {
    return `<div class="result-card">
      <div class="title">${item.name}</div>
      <div class="subtitle">${item.address}</div>
      <div class="meta">${distance}<span>⭐ ${item.rating}</span>
        <span class="badge ${item.open24hrs ? '' : 'off'}">${item.open24hrs ? 'Open 24hrs' : 'Regular hours'}</span>
      </div>
      <div class="meta" style="margin-top:6px;"><span>📞 ${item.phone}</span></div>
    </div>`;
  }
  if (currentTab === 'donors') {
    return `<div class="result-card">
      <div class="title">${item.name} — ${item.bloodGroup}</div>
      <div class="subtitle">${item.location}</div>
      <div class="meta">${distance}
        <span class="badge ${item.available ? '' : 'off'}">${item.available ? 'Available' : 'Unavailable'}</span>
        <span>Last donated: ${item.lastDonationDate}</span>
      </div>
      <div class="meta" style="margin-top:6px;"><span>📞 ${item.phone}</span></div>
    </div>`;
  }
  // shelters
  return `<div class="result-card">
    <div class="title">${item.name}</div>
    <div class="subtitle">${item.type} · ${item.address}</div>
    <div class="meta">${distance}<span>Capacity: ${item.capacity}</span></div>
    <div class="meta" style="margin-top:6px;"><span>📞 ${item.phone}</span></div>
  </div>`;
}

renderFilters();
