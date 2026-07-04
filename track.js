// track.js — Live tracking page logic

const params = new URLSearchParams(window.location.search);
const sosId = params.get('id');

const statusBanner = document.getElementById('statusBanner');
const statusText = document.getElementById('statusText');
const contactsList = document.getElementById('contactsList');
const volunteersList = document.getElementById('volunteersList');
const hospitalsList = document.getElementById('hospitalsList');
const resolveBtn = document.getElementById('resolveBtn');
const toast = document.getElementById('toast');

let map, userMarker, pathLine;
let pollTimer, watchId;

function showToast(msg, duration = 3000) {
  toast.textContent = msg;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), duration);
}

if (!sosId) {
  statusText.textContent = 'No active SOS event found.';
} else {
  initMap();
  loadEvent();
  startWatchingLocation();
  pollTimer = setInterval(loadEvent, 5000);
}

function initMap() {
  map = L.map('map').setView([11.0168, 76.9558], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);
}

async function loadEvent() {
  try {
    const res = await fetch(`/api/sos/${sosId}`);
    if (!res.ok) throw new Error('Event not found');
    const event = await res.json();
    renderEvent(event);
  } catch (err) {
    console.error(err);
  }
}

function renderEvent(event) {
  // Status
  if (event.status === 'resolved') {
    statusBanner.classList.add('resolved');
    statusText.textContent = 'Monitoring ended — you are marked safe.';
    resolveBtn.style.display = 'none';
    clearInterval(pollTimer);
    if (watchId) navigator.geolocation.clearWatch(watchId);
  } else {
    statusText.textContent = `You are under monitoring (${event.emergencyType} emergency).`;
  }

  // Map: draw path + latest marker
  const history = event.locationHistory || [];
  if (history.length) {
    const latLngs = history.map((p) => [p.lat, p.lng]);
    const latest = latLngs[latLngs.length - 1];

    if (!userMarker) {
      userMarker = L.marker(latest, { title: 'You' }).addTo(map);
      pathLine = L.polyline(latLngs, { color: '#e11d3f' }).addTo(map);
      map.setView(latest, 15);
    } else {
      userMarker.setLatLng(latest);
      pathLine.setLatLngs(latLngs);
    }
  }

  // Notified lists
  contactsList.innerHTML = (event.notified?.emergencyContacts || [])
    .map((c) => `<li>${c.name} — ${c.phone}</li>`)
    .join('') || '<li>None</li>';

  volunteersList.innerHTML = (event.notified?.volunteers || [])
    .map((v) => `<li>${v.name} — ${v.distanceKm} km away</li>`)
    .join('') || '<li>None nearby</li>';

  hospitalsList.innerHTML = (event.notified?.hospitals || [])
    .map((h) => `<li>${h.name} — ${h.distanceKm} km away</li>`)
    .join('') || '<li>None nearby</li>';
}

function startWatchingLocation() {
  if (!navigator.geolocation) return;
  watchId = navigator.geolocation.watchPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        await fetch(`/api/sos/${sosId}/location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: latitude, lng: longitude }),
        });
      } catch (err) {
        console.error('Failed to push location update', err);
      }
    },
    (err) => console.error(err),
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
  );
}

resolveBtn.addEventListener('click', async () => {
  try {
    const res = await fetch(`/api/sos/${sosId}/resolve`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to resolve');
    const event = await res.json();
    renderEvent(event);
    showToast('Marked as safe. Monitoring ended.');
  } catch (err) {
    console.error(err);
    showToast('Could not update status. Try again.');
  }
});
