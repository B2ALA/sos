// register.js

const form = document.getElementById('registerForm');
const formMsg = document.getElementById('formMsg');
const submitBtn = document.getElementById('submitBtn');

function val(id) {
  return document.getElementById(id).value.trim();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formMsg.innerHTML = '';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account...';

  const payload = {
    username: val('username'),
    password: val('password'),
    fullName: val('fullName'),
    age: val('age'),
    gender: val('gender'),
    dob: val('dob'),
    bloodGroup: val('bloodGroup'),
    height: val('height'),
    weight: val('weight'),
    address: val('address'),
    district: val('district'),
    state: val('state'),
    pincode: val('pincode'),
    phone: val('phone'),
    email: val('email'),
    emergencyContact: {
      contactPersonName: val('contactPersonName'),
      relationship: val('relationship'),
      contactNumber: val('contactNumber'),
    },
    medicalInfo: {
      allergies: val('allergies'),
      diseases: val('diseases'),
      currentMedications: val('currentMedications'),
      disabilities: val('disabilities'),
      insuranceDetails: val('insuranceDetails'),
    },
  };

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      formMsg.innerHTML = `<p class="error-text">${data.error || 'Registration failed'}</p>`;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
      return;
    }

    // Persist session + convenience fields used by the SOS trigger page
    localStorage.setItem('mh_token', data.token);
    localStorage.setItem('mh_username', data.user.username);
    localStorage.setItem('mh_userName', data.user.fullName);
    localStorage.setItem('mh_userPhone', data.user.phone);

    formMsg.innerHTML = `<p class="success-text">Account created! Redirecting...</p>`;
    setTimeout(() => (window.location.href = 'index.html'), 1200);
  } catch (err) {
    console.error(err);
    formMsg.innerHTML = `<p class="error-text">Something went wrong. Please try again.</p>`;
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Account';
  }
});
