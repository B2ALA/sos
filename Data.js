/* ══════════════════════════════════════════════════════════════
   MediHelp — SHARED DATA LAYER
   All pages (index, admin, register, profile) read/write through
   this file's helpers, which persist to localStorage so the demo
   works with zero backend. Swap MHStore's internals for real API
   calls when you connect a database (see README "Going to production").
   ══════════════════════════════════════════════════════════════ */

/* ---------- Generic localStorage-backed store ---------- */
const MHStore = {
  _key(name){ return `medihelp_${name}`; },
  get(name, fallback){
    try{
      const raw = localStorage.getItem(this._key(name));
      return raw ? JSON.parse(raw) : (fallback ?? null);
    }catch(e){ return fallback ?? null; }
  },
  set(name, value){
    try{ localStorage.setItem(this._key(name), JSON.stringify(value)); return true; }
    catch(e){ console.error('MHStore.set failed', e); return false; }
  },
  ensureSeeded(name, seedData){
    if(this.get(name) === null) this.set(name, seedData);
    return this.get(name);
  }
};

/* ══ DOCTOR DATABASE (seed data — editable from admin.html) ══ */
const SEED_DOCTORS = [
  { id:'D001', name:'Dr. Lakshmi Narayanan', spec:'General Medicine', hospital:'Salem Govt Medical College Hospital', phone:'+91 427 2334000', availability:'Mon–Sat, 9AM–4PM', location:'Suramangalam, Salem', lat:11.6716, lng:78.1073, maps:'https://www.google.com/maps/search/?api=1&query=Salem+Govt+Medical+College+Hospital', rating:4.6, emergency:true },
  { id:'D002', name:'Dr. Karthik Subramaniam', spec:'Cardiology', hospital:'Vinayaka Mission\'s Hospital', phone:'+91 427 2660100', availability:'Mon–Fri, 10AM–6PM', location:'Sankari Main Rd, Salem', lat:11.6980, lng:78.1462, maps:'https://www.google.com/maps/search/?api=1&query=Vinayaka+Mission%27s+Hospital+Salem', rating:4.8, emergency:true },
  { id:'D003', name:'Dr. Priya Ramaswamy', spec:'Pediatrics', hospital:'SKS Hospital', phone:'+91 427 2440000', availability:'Mon–Sat, 9AM–1PM', location:'Alagapuram, Salem', lat:11.6624, lng:78.1518, maps:'https://www.google.com/maps/search/?api=1&query=SKS+Hospital+Salem', rating:4.7, emergency:false },
  { id:'D004', name:'Dr. Mohammed Iqbal', spec:'Orthopedics', hospital:'Salem Govt Medical College Hospital', phone:'+91 427 2334001', availability:'Tue–Sun, 8AM–2PM', location:'Suramangalam, Salem', lat:11.6716, lng:78.1073, maps:'https://www.google.com/maps/search/?api=1&query=Salem+Govt+Medical+College+Hospital', rating:4.5, emergency:true },
  { id:'D005', name:'Dr. Anitha Sundaram', spec:'Gynecology', hospital:'Sri Gokulam Hospital', phone:'+91 427 2445566', availability:'Mon–Sat, 11AM–5PM', location:'Ammapet, Salem', lat:11.6789, lng:78.1650, maps:'https://www.google.com/maps/search/?api=1&query=Sri+Gokulam+Hospital+Salem', rating:4.9, emergency:false },
  { id:'D006', name:'Dr. Ravi Chandran', spec:'Neurology', hospital:'Vinayaka Mission\'s Hospital', phone:'+91 427 2660101', availability:'Mon–Fri, 9AM–3PM', location:'Sankari Main Rd, Salem', lat:11.6980, lng:78.1462, maps:'https://www.google.com/maps/search/?api=1&query=Vinayaka+Mission%27s+Hospital+Salem', rating:4.7, emergency:true },
  { id:'D007', name:'Dr. Meena Krishnan', spec:'Dermatology', hospital:'SKS Hospital', phone:'+91 427 2440001', availability:'Mon–Sat, 10AM–4PM', location:'Alagapuram, Salem', lat:11.6624, lng:78.1518, maps:'https://www.google.com/maps/search/?api=1&query=SKS+Hospital+Salem', rating:4.4, emergency:false },
  { id:'D008', name:'Dr. Suresh Babu', spec:'Emergency Medicine', hospital:'Salem Govt Medical College Hospital', phone:'+91 427 2334002', availability:'24/7 Rotation', location:'Suramangalam, Salem', lat:11.6716, lng:78.1073, maps:'https://www.google.com/maps/search/?api=1&query=Salem+Govt+Medical+College+Hospital', rating:4.6, emergency:true },
  { id:'D009', name:'Dr. Divya Bharathi', spec:'Psychiatry', hospital:'Sri Gokulam Hospital', phone:'+91 427 2445567', availability:'Mon–Fri, 10AM–5PM', location:'Ammapet, Salem', lat:11.6789, lng:78.1650, maps:'https://www.google.com/maps/search/?api=1&query=Sri+Gokulam+Hospital+Salem', rating:4.8, emergency:false },
  { id:'D010', name:'Dr. Elango Perumal', spec:'ENT', hospital:'Salem ENT Care Centre', phone:'+91 427 2223344', availability:'Mon–Sat, 9AM–1PM', location:'Fairlands, Salem', lat:11.6580, lng:78.1590, maps:'https://www.google.com/maps/search/?api=1&query=Salem+ENT+Care+Centre', rating:4.5, emergency:false },
  { id:'D011', name:'Dr. Kavitha Raj', spec:'Ophthalmology', hospital:'Aravind Eye Hospital', phone:'+91 427 2669000', availability:'Mon–Sat, 8AM–5PM', location:'Kondalampatti, Salem', lat:11.7050, lng:78.1230, maps:'https://www.google.com/maps/search/?api=1&query=Aravind+Eye+Hospital+Salem', rating:4.9, emergency:false },
  { id:'D012', name:'Dr. Balaji Venkatesan', spec:'Nephrology', hospital:'Vinayaka Mission\'s Hospital', phone:'+91 427 2660102', availability:'Mon–Fri, 9AM–2PM', location:'Sankari Main Rd, Salem', lat:11.6980, lng:78.1462, maps:'https://www.google.com/maps/search/?api=1&query=Vinayaka+Mission%27s+Hospital+Salem', rating:4.6, emergency:true }
];

/* ══ HOSPITAL DATABASE ══ */
const SEED_HOSPITALS = [
  { id:'H001', name:'Salem Govt Medical College Hospital', type:'Government', address:'Suramangalam, Salem, TN 636005', phone:'+91 427 2334000', emergency:'108 / +91 427 2334000', lat:11.6716, lng:78.1073, beds:42, icu:6, ambulance:true, maps:'https://www.google.com/maps/search/?api=1&query=Salem+Govt+Medical+College+Hospital' },
  { id:'H002', name:'Vinayaka Mission\'s Hospital', type:'Private', address:'Sankari Main Rd, Salem, TN 636308', phone:'+91 427 2660100', emergency:'+91 427 2660199', lat:11.6980, lng:78.1462, beds:18, icu:4, ambulance:true, maps:'https://www.google.com/maps/search/?api=1&query=Vinayaka+Mission%27s+Hospital+Salem' },
  { id:'H003', name:'SKS Hospital', type:'Private', address:'Alagapuram, Salem, TN 636004', phone:'+91 427 2440000', emergency:'+91 427 2440099', lat:11.6624, lng:78.1518, beds:12, icu:3, ambulance:true, maps:'https://www.google.com/maps/search/?api=1&query=SKS+Hospital+Salem' },
  { id:'H004', name:'Sri Gokulam Hospital', type:'Private', address:'Ammapet, Salem, TN 636003', phone:'+91 427 2445566', emergency:'+91 427 2445599', lat:11.6789, lng:78.1650, beds:9, icu:2, ambulance:false, maps:'https://www.google.com/maps/search/?api=1&query=Sri+Gokulam+Hospital+Salem' },
  { id:'H005', name:'Salem District Emergency Care Centre', type:'Emergency Center', address:'Hasthampatty, Salem, TN 636007', phone:'+91 427 2211200', emergency:'108', lat:11.6650, lng:78.1560, beds:6, icu:1, ambulance:true, maps:'https://www.google.com/maps/search/?api=1&query=Hasthampatty+Salem+Emergency+Care' },
  { id:'H006', name:'City Family Clinic', type:'Clinic', address:'Shevapet, Salem, TN 636002', phone:'+91 427 2229090', emergency:'—', lat:11.6690, lng:78.1490, beds:0, icu:0, ambulance:false, maps:'https://www.google.com/maps/search/?api=1&query=Shevapet+Salem+Clinic' }
];

/* ══ BLOOD DONOR DATABASE ══ */
const SEED_DONORS = [
  { id:'B001', name:'Arun Kumar', blood:'O+', phone:'+91 90000 11111', location:'Ammapet, Salem', lastDonation:'2026-03-12', available:true },
  { id:'B002', name:'Deepa Rani', blood:'A+', phone:'+91 90000 22222', location:'Fairlands, Salem', lastDonation:'2026-01-05', available:true },
  { id:'B003', name:'Vignesh Raja', blood:'B+', phone:'+91 90000 33333', location:'Hasthampatty, Salem', lastDonation:'2025-11-20', available:true },
  { id:'B004', name:'Saranya M', blood:'AB+', phone:'+91 90000 44444', location:'Shevapet, Salem', lastDonation:'2026-04-02', available:false },
  { id:'B005', name:'Prakash S', blood:'O-', phone:'+91 90000 55555', location:'Suramangalam, Salem', lastDonation:'2025-09-15', available:true },
  { id:'B006', name:'Nithya Sree', blood:'B-', phone:'+91 90000 66666', location:'Alagapuram, Salem', lastDonation:'2026-02-18', available:true },
  { id:'B007', name:'Manikandan T', blood:'A-', phone:'+91 90000 77777', location:'Kondalampatti, Salem', lastDonation:'2025-12-30', available:true },
  { id:'B008', name:'Revathi K', blood:'AB-', phone:'+91 90000 88888', location:'Sankari Main Rd, Salem', lastDonation:'2026-05-01', available:false }
];

/* ══ VOLUNTEER GROUPS ══ */
const SEED_VOLUNTEER_GROUPS = [
  { id:'V001', name:'Fire Rescue Group 1', category:'Fire', members:9, area:'North Salem', contact:'+91 90111 00001' },
  { id:'V002', name:'Fire Rescue Group 2', category:'Fire', members:10, area:'South Salem', contact:'+91 90111 00002' },
  { id:'V003', name:'Medical Response Group 1', category:'Medical', members:8, area:'Central Salem', contact:'+91 90111 00003' },
  { id:'V004', name:'Medical Response Group 2', category:'Medical', members:7, area:'Hasthampatty', contact:'+91 90111 00004' },
  { id:'V005', name:'Rescue & Disaster Group 1', category:'Rescue', members:12, area:'Salem District', contact:'+91 90111 00005' },
  { id:'V006', name:'Flood Relief Group 1', category:'Disaster', members:11, area:'Riverbank Zones', contact:'+91 90111 00006' },
  { id:'V007', name:'Road Accident Response Group', category:'Accident', members:9, area:'NH44 Corridor, Salem', contact:'+91 90111 00007' }
];

/* ══ SCHOOLS & COLLEGES (emergency shelters) ══ */
const SEED_SHELTERS = [
  { id:'S001', name:'Salem Government Higher Secondary School', type:'School', address:'Shevapet, Salem', phone:'+91 427 2245001', lat:11.6690, lng:78.1490 },
  { id:'S002', name:'St. Joseph\'s Higher Secondary School', type:'School', address:'Ammapet, Salem', phone:'+91 427 2445100', lat:11.6789, lng:78.1650 },
  { id:'S003', name:'Government Arts College, Salem', type:'College', address:'Suramangalam, Salem', phone:'+91 427 2335200', lat:11.6716, lng:78.1073 },
  { id:'S004', name:'Sona College of Technology', type:'College', address:'Junction Main Rd, Salem', phone:'+91 427 2440392', lat:11.6602, lng:78.1462 },
  { id:'S005', name:'Vinayaka Missions Kirupananda Variyar Engineering College', type:'College', address:'Sankari Main Rd, Salem', phone:'+91 427 2985001', lat:11.6980, lng:78.1462 },
  { id:'S006', name:'Salem Municipal Higher Secondary School', type:'School', address:'Hasthampatty, Salem', phone:'+91 427 2211500', lat:11.6650, lng:78.1560 }
];

/* Seed everything into localStorage on first load */
MHStore.ensureSeeded('doctors', SEED_DOCTORS);
MHStore.ensureSeeded('hospitals', SEED_HOSPITALS);
MHStore.ensureSeeded('donors', SEED_DONORS);
MHStore.ensureSeeded('volunteerGroups', SEED_VOLUNTEER_GROUPS);
MHStore.ensureSeeded('shelters', SEED_SHELTERS);
MHStore.ensureSeeded('emergencyRequests', []);
MHStore.ensureSeeded('volunteerRequests', []);
MHStore.ensureSeeded('users', []);
MHStore.ensureSeeded('bloodRequests', []);

/* ══════════════════════════════════════════════════════════════
   AI CHATBOT KNOWLEDGE BASE
   Keyword-matched FAQ engine — categorized, easy to extend.
   Each entry: keys (matched against user text) + emoji + answer.
   Add more rows any time; no code changes needed elsewhere.
   ══════════════════════════════════════════════════════════════ */
const CHATBOT_KB = [
  /* ---- First Aid ---- */
  { cat:'First Aid', emoji:'🩹', keys:['cut','bleeding','wound'], a:'Apply firm, direct pressure with a clean cloth for at least 10 minutes. Raise the injured area above heart level if possible. If bleeding soaks through, add more cloth on top — don\'t remove the first layer. Seek medical help if bleeding won\'t stop after 15 minutes or the cut is deep.' },
  { cat:'First Aid', emoji:'🔥', keys:['burn'], a:'Cool a burn under running water for 10–20 minutes. Don\'t apply ice, butter, or toothpaste. Cover loosely with a clean, non-stick cloth. Seek emergency care for burns larger than your palm, on the face/hands, or that look white/charred.' },
  { cat:'First Aid', emoji:'🦴', keys:['fracture','broken bone','sprain'], a:'Keep the area still — don\'t try to realign it. Immobilize with a splint or sling if you can. Apply ice wrapped in cloth to reduce swelling. Get an X-ray at a hospital as soon as possible.' },
  { cat:'First Aid', emoji:'😮‍💨', keys:['choking'], a:'For an adult/child who can\'t cough, speak, or breathe: give 5 back blows between the shoulder blades, then 5 abdominal thrusts (Heimlich maneuver). Repeat until the object clears or emergency help arrives. Call 108 immediately.' },
  { cat:'First Aid', emoji:'🧊', keys:['fainted','fainting','unconscious'], a:'Lay the person flat, raise their legs about 30cm, and loosen tight clothing. Check breathing. If they don\'t regain consciousness within a minute, call 108 and start CPR if you\'re trained and there\'s no breathing.' },
  { cat:'First Aid', emoji:'❤️', keys:['cpr'], a:'CPR steps: 1) Check responsiveness & call 108. 2) Push hard and fast in the center of the chest, about 5–6cm deep, 100–120 compressions/minute. 3) If trained, give 2 rescue breaths after every 30 compressions. Continue until help arrives.' },

  { cat:'First Aid', emoji:'🩹', keys:['first aid'], a:'First aid basics: stay calm, check the scene is safe, check breathing/responsiveness, control bleeding with pressure, immobilize suspected fractures, and call 108 for anything serious. Ask me about a specific situation — cuts, burns, choking, CPR, fractures — for detailed steps!' },

  /* ---- Common Diseases ---- */
  { cat:'Diseases', emoji:'🦟', keys:['dengue'], a:'Dengue symptoms: high fever, severe headache, joint/muscle pain, rash, and low platelet count. There\'s no specific antiviral — rest, fluids, and paracetamol (avoid aspirin/ibuprofen) are used. Seek immediate care for bleeding, persistent vomiting, or severe abdominal pain.' },
  { cat:'Diseases', emoji:'🦟', keys:['malaria'], a:'Malaria causes fever with chills, sweating, headache, and nausea, typically in cycles. It\'s diagnosed with a blood smear/rapid test and treated with antimalarial medicine prescribed by a doctor. Seek testing promptly if you\'ve had fever after a mosquito-prone area visit.' },
  { cat:'Diseases', emoji:'🤒', keys:['typhoid'], a:'Typhoid causes sustained high fever, weakness, stomach pain, and headache. It\'s spread through contaminated food/water. See a doctor for blood testing and antibiotics — don\'t self-medicate.' },
  { cat:'Diseases', emoji:'🩸', keys:['diabetes','sugar level'], a:'Diabetes management centers on monitoring blood sugar, medication/insulin as prescribed, diet control, and regular activity. Watch for signs of low blood sugar (shakiness, sweating, confusion) which need immediate glucose.' },
  { cat:'Diseases', emoji:'💓', keys:['blood pressure','hypertension','bp high'], a:'High blood pressure is often symptomless — regular checks matter. Warning signs needing urgent care: severe headache, chest pain, vision changes, or shortness of breath with very high readings.' },
  { cat:'Diseases', emoji:'😮‍💨', keys:['asthma'], a:'For an asthma attack: sit upright, use the prescribed reliever inhaler (usually blue), and stay calm with slow breaths. If there\'s no improvement after 2 doses or lips/fingertips turn blue, call 108 immediately.' },
  { cat:'Diseases', emoji:'🤧', keys:['covid','coronavirus'], a:'Common COVID symptoms include fever, cough, fatigue, and loss of taste/smell. Isolate, rest, stay hydrated, and monitor oxygen levels if possible. Seek urgent care for breathing difficulty or oxygen saturation below 94%.' },

  /* ---- Emergency Procedures ---- */
  { cat:'Emergency', emoji:'🚨', keys:['heart attack'], a:'Heart attack warning signs: chest pain/pressure, pain radiating to arm/jaw, sweating, nausea, breathlessness. Call 108 immediately, keep the person seated and calm, and give aspirin only if not allergic and advised by emergency services.' },
  { cat:'Emergency', emoji:'🧠', keys:['stroke'], a:'Use FAST: Face drooping, Arm weakness, Speech difficulty, Time to call 108. Note the time symptoms started — this affects treatment options. Don\'t give food or water.' },
  { cat:'Emergency', emoji:'🌊', keys:['drowning'], a:'Remove the person from water safely, check breathing, and start CPR if they\'re not breathing. Call 108 immediately even if they seem to recover — water in the lungs can cause delayed complications.' },
  { cat:'Emergency', emoji:'⚡', keys:['electric shock','electrocution'], a:'Do not touch the person until the power source is switched off. Once safe, check breathing and start CPR if needed. Call 108. Do not move someone with a suspected spinal injury unless there\'s immediate danger.' },
  { cat:'Emergency', emoji:'🐍', keys:['snake bite'], a:'Keep the person still and calm, keep the bitten limb below heart level, and remove tight items like rings. Do NOT cut the wound, apply ice, or try to suck out venom. Get to a hospital immediately for antivenom.' },

  /* ---- Poison Emergencies ---- */
  { cat:'Poison', emoji:'☠️', keys:['poison','swallowed chemical','overdose'], a:'Call 108 or a poison control center immediately. Do not induce vomiting unless a professional tells you to. Keep the container/substance to show medical staff. Keep the person calm and monitor breathing.' },
  { cat:'Poison', emoji:'💊', keys:['medicine overdose','pill overdose'], a:'Call emergency services immediately and provide the medicine name and approximate amount taken if known. Do not induce vomiting unless instructed. Keep the person awake and monitored until help arrives.' },
  { cat:'Poison', emoji:'🧪', keys:['gas leak','inhaled fumes'], a:'Move the person to fresh air immediately, away from the source. Avoid open flames or switches (fire risk). Call 108. If breathing stops, begin CPR once safely away from the gas source.' },

  /* ---- Accident Procedures ---- */
  { cat:'Accident', emoji:'🚗', keys:['road accident','car accident','bike accident'], a:'Ensure your own safety first (hazard lights, move to the side if possible). Call 108. Do not move a seriously injured person unless there\'s fire/danger risk — spinal injuries can worsen with movement. Control visible bleeding with pressure while waiting.' },
  { cat:'Accident', emoji:'🏗️', keys:['fall from height','fell down'], a:'Keep the person still, especially if head/neck/back injury is suspected. Check breathing and responsiveness. Call 108 rather than trying to move them yourself.' },

  /* ---- Mental Health ---- */
  { cat:'Mental Health', emoji:'💙', keys:['mental health'], a:'Your mental health matters as much as your physical health 💙. I can share general guidance on anxiety, low mood, sleep, or panic attacks — or if you\'re in crisis, please contact AASRA (+91 98204 66726) or iCall (+91 9152987821) right away.' },
  { cat:'Mental Health', emoji:'💚', keys:['anxiety','panic attack'], a:'During a panic attack: breathe slowly (in for 4, hold 4, out 4), ground yourself by naming 5 things you can see, and remind yourself it will pass, usually within 20–30 minutes. If this is frequent, please talk to a doctor or counselor.' },
  { cat:'Mental Health', emoji:'💙', keys:['depression','feeling low','sad all the time'], a:'What you\'re feeling is valid, and support is available. Talking to a mental health professional can really help. If you\'re in India, iCall (+91 9152987821) and Vandrevala Foundation (1860-2662-345) offer free, confidential support.' },
  { cat:'Mental Health', emoji:'🆘', keys:['suicide','self harm','end my life','want to die'], a:'I\'m really concerned about you, and I want you to get support right now. Please reach out to a crisis line immediately: AASRA +91 98204 66726 (24/7), or call 108 / go to your nearest emergency room. You deserve support, and you don\'t have to go through this alone.' },
  { cat:'Mental Health', emoji:'😴', keys:['insomnia','cant sleep','can\'t sleep'], a:'Try a consistent sleep schedule, limiting screens/caffeine before bed, and relaxation breathing. If sleeplessness persists for weeks or affects daily life, it\'s worth discussing with a doctor.' },

  /* ---- Medicine Information ---- */
  { cat:'Medicine', emoji:'💊', keys:['paracetamol'], a:'Paracetamol is used for fever and mild-moderate pain. Standard adult dose is typically 500–1000mg every 4–6 hours, not exceeding 4g/day — but always follow your doctor\'s or the package\'s specific guidance, especially for children or with liver conditions.' },
  { cat:'Medicine', emoji:'💊', keys:['antibiotic'], a:'Antibiotics treat bacterial infections only (not viral ones like flu/colds). Always complete the full prescribed course even if you feel better, and never self-prescribe — a doctor should choose the right one for your infection.' },
  { cat:'Medicine', emoji:'💉', keys:['vaccination','vaccine schedule'], a:'Vaccination schedules vary by age and country. In India, the National Immunization Schedule covers BCG, OPV, DPT, Hepatitis B, Measles, and more for children. Ask your pediatrician or nearest PHC for the current schedule.' },
  { cat:'Medicine', emoji:'🌡️', keys:['fever medicine','fever treatment'], a:'For fever: rest, fluids, and paracetamol as needed for comfort. Seek care if fever exceeds 103°F/39.4°C, lasts more than 3 days, or comes with rash, stiff neck, or difficulty breathing.' },

  /* ---- Hospital / Ambulance Guidance ---- */
  { cat:'Hospital', emoji:'🏥', keys:['nearest hospital','find hospital'], a:'Open the "Nearby" section on the home screen and tap Hospitals — I\'ll show hospitals near your live location with beds, ICU availability, and directions. You can also just say "show me nearby hospitals".' },
  { cat:'Hospital', emoji:'🛏️', keys:['bed availability','icu bed'], a:'Bed and ICU availability for each hospital is shown on their card in the Hospitals list, updated by hospital admins. For the most current count during an emergency, please also call the hospital directly.' },
  { cat:'Ambulance', emoji:'🚑', keys:['ambulance','108'], a:'Dial 108 for a free government ambulance anywhere in Tamil Nadu, 24/7. You can also tap the SOS button in this app to alert nearby hospitals and your emergency contacts with your live location.' },

  /* ---- Blood Donation ---- */
  { cat:'Blood', emoji:'🩸', keys:['blood donation','donate blood'], a:'You can register as a donor in the Blood Donor section — just add your blood group, phone, and location. To request blood, use "Request Blood" and search by blood group; nearby available donors will be shown.' },
  { cat:'Blood', emoji:'🩸', keys:['who can donate blood','eligibility'], a:'General eligibility: age 18–65, weight above 50kg, hemoglobin above 12.5g/dL, and no recent major illness/surgery/tattoo in the last 6 months. A doctor at the donation camp does a final check before donation.' },

  /* ---- SOS / App usage ---- */
  { cat:'App', emoji:'🆘', keys:['sos','emergency button'], a:'Tap the red SOS button on the home screen. It will start tracking your live location, alert your emergency contacts and nearby volunteer groups, and show you "You are under monitoring" once tracking is active.' },
  { cat:'App', emoji:'👥', keys:['volunteer group','join volunteer'], a:'Head to the Volunteers section to see active groups like Fire Rescue, Medical Response, and Disaster Relief. Tap "Join" on any group to receive emergency alerts relevant to that category.' }
];

const CHATBOT_FALLBACKS = [
  "I'm not fully sure about that one 🤔 — for anything urgent, please call 108 or use the SOS button. Could you rephrase, or ask about first aid, diseases, medicines, hospitals, or mental health?",
  "I don't have a confident answer for that yet 📚. If this is an emergency, tap SOS or dial 108 right now. Otherwise try asking in a different way!"
];

function chatbotReply(userText){
  const text = userText.toLowerCase();
  let best = null, bestScore = 0;
  for(const entry of CHATBOT_KB){
    for(const key of entry.keys){
      if(text.includes(key)){
        const score = key.length;
        if(score > bestScore){ bestScore = score; best = entry; }
      }
    }
  }
  if(best) return { emoji:best.emoji, cat:best.cat, text:best.a };
  return { emoji:'🤖', cat:'General', text: CHATBOT_FALLBACKS[Math.floor(Math.random()*CHATBOT_FALLBACKS.length)] };
}

const CHATBOT_QUICK_REPLIES = ['First Aid 🩹','Snake Bite 🐍','Heart Attack 🚨','Blood Donation 🩸','Nearest Hospital 🏥','Mental Health 💙','Call Ambulance 🚑'];
