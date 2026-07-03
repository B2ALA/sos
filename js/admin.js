/* admin.js
   Admin panel demo: loads local JSON and allows add/edit/delete operations in-memory.
   In production, these actions should call secure server APIs with authentication.
*/

async function loadAdminData(){
  const doctors = await fetch('database/doctors.json').then(r=>r.json());
  const hospitals = await fetch('database/hospitals.json').then(r=>r.json());
  const donors = await fetch('database/donors.json').then(r=>r.json());
  const users = JSON.parse(localStorage.getItem('mh_users')||'[]');

  // Render tables
  const dt = document.getElementById('doctorsTable');
  dt.innerHTML = doctors.map(d=>`<div class="list-item"><div><strong>${d.name}</strong><div class="meta">${d.specialization} • ${d.hospital}</div></div><div><button class="btn small" onclick="editDoctor('${d.id}')">Edit</button><button class="btn small" onclick="deleteDoctor('${d.id}')">Delete</button></div></div>`).join('');

  const ht = document.getElementById('hospitalsTable');
  ht.innerHTML = hospitals.map(h=>`<div class="list-item"><div><strong>${h.name}</strong><div class="meta">${h.address}</div></div><div><button class="btn small" onclick="editHospital('${h.id}')">Edit</button><button class="btn small" onclick="deleteHospital('${h.id}')">Delete</button></div></div>`).join('');

  document.getElementById('adminDonorList').innerHTML = donors.map(d=>`<div class="list-item"><div><strong>${d.name}</strong><div class="meta">${d.blood} • ${d.location}</div></div></div>`).join('');
  document.getElementById('adminUserList').innerHTML = users.map(u=>`<div class="list-item"><div><strong>${u.name}</strong><div class="meta">${u.email}</div></div></div>`).join('');
  document.getElementById('requestsList').innerHTML = (JSON.parse(localStorage.getItem('mh_sos')||'[]')).map(r=>`<div class="list-item"><div><strong>SOS ${r.id}</strong><div class="meta">${r.time} • ${r.location.lat.toFixed(4)},${r.location.lng.toFixed(4)}</div></div></div>`).join('');
}

function editDoctor(id){ alert('Edit doctor ' + id + ' (demo)'); }
function deleteDoctor(id){ if(confirm('Delete doctor?')) alert('Deleted (demo)'); }
function editHospital(id){ alert('Edit hospital ' + id + ' (demo)'); }
function deleteHospital(id){ if(confirm('Delete hospital?')) alert('Deleted (demo)'); }

document.querySelectorAll('.tab').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.admin-tab').forEach(tab=>tab.classList.remove('active'));
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

document.getElementById('addDoctorBtn')?.addEventListener('click', ()=> alert('Add doctor (demo)'));
document.getElementById('addHospitalBtn')?.addEventListener('click', ()=> alert('Add hospital (demo)'));

window.addEventListener('load', loadAdminData);
