// app.js — SOS trigger page logic

const typeGrid = document.getElementById('typeGrid');
const sosBtn = document.getElementById('sosBtn');
const confirmOverlay = document.getElementById('confirmOverlay');
const confirmBtn = document.getElementById('confirmBtn');
const cancelBtn = document.getElementById('cancelBtn');
const toast = document.getElementById('toast');

let selectedType = 'medical';

// Pre-select first chip
document.querySelector('.type-chip[data-type="medical"]').classList.add('selected');

typeGrid.addEventListener('click', (e) => {
  const chip = e.target.closest('.type-chip');
  if (!chip) return;
  document.querySelectorAll('.type-chip').forEach((c) => c.classList.remove('selected'));
  chip.classList.add('selected');
  selectedType = chip.dataset.type;
});

function showToast(msg, duration = 3000) {
  toast.textContent = msg;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), duration);
}

sosBtn.addEventListener('click', () => {
  confirmOverlay.classList.add('visible');
});

cancelBtn.addEventListener('click', () => {
  confirmOverlay.classList.remove('visible');
});

confirmBtn.addEventListener('click', () => {
  confirmOverlay.classList.remove('visible');
  triggerSOS();
});

function triggerSOS() {
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported on this device.');
    return;
  }

  showToast('Getting your location...');

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;

      try {
        const res = await fetch('/api/sos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emergencyType: selectedType,
            lat: latitude,
            lng: longitude,
            userName: localStorage.getItem('mh_userName') || 'Guest User',
            userPhone: localStorage.getItem('mh_userPhone') || null,
          }),
        });

        if (!res.ok) throw new Error('Failed to trigger SOS');
        const event = await res.json();

        // Redirect to live tracking page
        window.location.href = `/track.html?id=${event.id}`;
      } catch (err) {
        console.error(err);
        showToast('Could not send SOS. Check your connection and try again.');
      }
    },
    (err) => {
      console.error(err);
      showToast('Location access denied. Enable GPS/location permission to use SOS.');
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}
// app.js — SOS trigger page logic

const typeGrid = document.getElementById('typeGrid');
const sosBtn = document.getElementById('sosBtn');
const confirmOverlay = document.getElementById('confirmOverlay');
const confirmBtn = document.getElementById('confirmBtn');
const cancelBtn = document.getElementById('cancelBtn');
const toast = document.getElementById('toast');

let selectedType = 'medical';

// Pre-select first chip
document.querySelector('.type-chip[data-type="medical"]').classList.add('selected');

typeGrid.addEventListener('click', (e) => {
  const chip = e.target.closest('.type-chip');
  if (!chip) return;
  document.querySelectorAll('.type-chip').forEach((c) => c.classList.remove('selected'));
  chip.classList.add('selected');
  selectedType = chip.dataset.type;
});

function showToast(msg, duration = 3000) {
  toast.textContent = msg;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), duration);
}

sosBtn.addEventListener('click', () => {
  confirmOverlay.classList.add('visible');
});

cancelBtn.addEventListener('click', () => {
  confirmOverlay.classList.remove('visible');
});

confirmBtn.addEventListener('click', () => {
  confirmOverlay.classList.remove('visible');
  triggerSOS();
});

function triggerSOS() {
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported on this device.');
    return;
  }

  showToast('Getting your location...');

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;

      try {
        const res = await fetch('/api/sos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emergencyType: selectedType,
            lat: latitude,
            lng: longitude,
            userName: localStorage.getItem('mh_userName') || 'Guest User',
            userPhone: localStorage.getItem('mh_userPhone') || null,
            username: localStorage.getItem('mh_username') || null,
          }),
        });

        if (!res.ok) throw new Error('Failed to trigger SOS');
        const event = await res.json();

        // Redirect to live tracking page
        window.location.href = `/track.html?id=${event.id}`;
      } catch (err) {
        console.error(err);
        showToast('Could not send SOS. Check your connection and try again.');
      }
    },
    (err) => {
      console.error(err);
      showToast('Location access denied. Enable GPS/location permission to use SOS.');
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}
