// login.js

const form = document.getElementById('loginForm');
const formMsg = document.getElementById('formMsg');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      formMsg.innerHTML = `<p class="error-text">${data.error}</p>`;
      return;
    }

    localStorage.setItem('mh_token', data.token);
    localStorage.setItem('mh_username', data.user.username);
    localStorage.setItem('mh_userName', data.user.fullName);
    localStorage.setItem('mh_userPhone', data.user.phone);

    formMsg.innerHTML = `<p class="success-text">Logged in! Redirecting...</p>`;
    setTimeout(() => (window.location.href = 'index.html'), 800);
  } catch (err) {
    console.error(err);
    formMsg.innerHTML = `<p class="error-text">Something went wrong. Please try again.</p>`;
  }
});
