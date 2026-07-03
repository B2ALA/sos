/* auth.js — simple registration/login/profile demo
   - registerUser(formData)
   - loginUser(email,password)
   - logoutUser()
   - loadProfile()
   - All stored in localStorage for demo only
*/

function registerUser(form) {
  const users = JSON.parse(localStorage.getItem('medi_users') || '[]');
  if (users.find(u => u.email === form.email)) {
    alert('Email already registered');
    return false;
  }
  users.push(form);
  localStorage.setItem('medi_users', JSON.stringify(users));
  localStorage.setItem('medi_user', JSON.stringify(form));
  alert('Registered successfully');
  window.location.href = 'profile.html';
  return true;
}

function loginUser(email, password) {
  const users = JSON.parse(localStorage.getItem('medi_users') || '[]');
  const u = users.find(x => x.email === email && x.password === password);
  if (!u) { alert('Invalid credentials'); return false; }
  localStorage.setItem('medi_user', JSON.stringify(u));
  window.location.href = 'profile.html';
  return true;
}

function logoutUser() {
  localStorage.removeItem('medi_user');
  window.location.href = 'index.html';
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem('medi_user') || 'null');
}
