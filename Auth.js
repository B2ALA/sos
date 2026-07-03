/* ══════════════════════════════════════════════════════════════
   MediHelp — AUTH (demo, localStorage-backed)
   In production, replace this with real API calls to your backend
   (hashed passwords, JWT/session cookies, etc). See README.
   ══════════════════════════════════════════════════════════════ */

function hashDemo(pw){
  // NOT secure — placeholder only. Use bcrypt/argon2 server-side in production.
  let h = 0;
  for(let i=0;i<pw.length;i++){ h = (h*31 + pw.charCodeAt(i)) | 0; }
  return 'demo_' + h;
}

function registerUser(e){
  e.preventDefault();
  const users = MHStore.get('users', []);
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  if(users.some(u=>u.email===email)){
    toast('An account with this email already exists.');
    return;
  }
  const user = {
    id:'U'+Date.now(),
    fullName:document.getElementById('regName').value,
    age:document.getElementById('regAge').value,
    gender:document.getElementById('regGender').value,
    dob:document.getElementById('regDob').value,
    blood:document.getElementById('regBlood').value,
    mobile:document.getElementById('regMobile').value,
    emergencyContact:document.getElementById('regEmergency').value,
    address:document.getElementById('regAddress').value,
    district:document.getElementById('regDistrict').value,
    state:document.getElementById('regState').value,
    email,
    conditions:document.getElementById('regConditions').value,
    allergies:document.getElementById('regAllergies').value,
    medications:document.getElementById('regMedications').value,
    insurance:document.getElementById('regInsurance').value,
    organDonor:document.getElementById('regOrganDonor').checked,
    photo:'', // placeholder — wire to file upload / cloud storage in production
    passwordHash: hashDemo(document.getElementById('regPassword').value),
    createdAt: new Date().toISOString()
  };
  users.push(user);
  MHStore.set('users', users);
  MHStore.set('session', { userId:user.id });
  toast('🎉 Registration successful! Welcome to MediHelp.');
  setTimeout(()=> window.location.href='profile.html', 900);
}

function loginUser(e){
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const pw = document.getElementById('loginPassword').value;
  const users = MHStore.get('users', []);
  const user = users.find(u=>u.email===email && u.passwordHash===hashDemo(pw));
  if(!user){ toast('❌ Invalid email or password.'); return; }
  MHStore.set('session', { userId:user.id });
  toast(`👋 Welcome back, ${user.fullName}!`);
  setTimeout(()=> window.location.href='profile.html', 700);
}

function logoutUser(){
  MHStore.set('session', null);
  toast('You have been logged out.');
  setTimeout(()=> window.location.href='index.html', 600);
}

function currentUser(){
  const session = MHStore.get('session', null);
  if(!session) return null;
  return MHStore.get('users', []).find(u=>u.id===session.userId) || null;
}

function requireLogin(){
  if(!currentUser()) window.location.href='login.html';
}

function saveProfileEdits(e){
  e.preventDefault();
  const user = currentUser();
  if(!user) return;
  const fields = ['fullName','age','gender','mobile','emergencyContact','address','district','state','conditions','allergies','medications','insurance'];
  fields.forEach(f=>{
    const el = document.getElementById('edit_'+f);
    if(el) user[f] = el.value;
  });
  user.organDonor = document.getElementById('edit_organDonor').checked;
  const users = MHStore.get('users', []).map(u=>u.id===user.id?user:u);
  MHStore.set('users', users);
  toast('✅ Profile updated.');
}
