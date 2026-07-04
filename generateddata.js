// generate-data.js
// One-time script to generate synthetic sample datasets for doctors, pharmacies,
// blood donors, shelters, volunteers, and chatbot FAQs.
// Run: node generate-data.js
// All data is FAKE/PLACEHOLDER — replace with real records before production use.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

// Base coordinates: Coimbatore, TN area — jitter around this for "nearby" realism
const BASE_LAT = 11.0168;
const BASE_LNG = 76.9558;

function jitter(base, spread) {
  return +(base + (Math.random() - 0.5) * spread).toFixed(6);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randPhone() {
  return `+91-9${Math.floor(100000000 + Math.random() * 899999999)}`;
}

const FIRST_NAMES = ['Arun','Divya','Karthik','Meena','Suresh','Priya','Vijay','Lakshmi','Ravi','Anitha','Senthil','Kavya','Manoj','Deepa','Ganesh','Nisha','Prakash','Swathi','Bala','Revathi','Ajay','Sneha','Vikram','Pooja','Harish','Anjali','Naveen','Divyabharathi','Suriya','Keerthana'];
const LAST_NAMES = ['Kumar','Raj','Nair','Iyer','Pillai','Chandran','Murugan','Subramaniam','Krishnan','Sundaram','Venkatesh','Narayan','Muthu','Selvam','Rajendran'];

function randName() {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}

const DISTRICTS = ['Coimbatore','Erode','Tirupur','Salem','Madurai','Chennai','Trichy','Namakkal','Karur','Dindigul'];
const AREAS = ['Gandhipuram','RS Puram','Peelamedu','Saibaba Colony','Race Course','Singanallur','Ukkadam','Town Hall','Ramanathapuram','Saravanampatti'];

function randLocationLine() {
  return `${pick(AREAS)}, ${pick(DISTRICTS)}`;
}

// ---------------- Doctors ----------------
const SPECIALIZATIONS = ['Cardiologist','Neurologist','Dentist','Orthopedic','Pediatrician','General Physician','Dermatologist','ENT Specialist','Psychiatrist','Gynecologist'];
const HOSPITALS = ['City General Hospital','Sunrise Multispeciality','Apex Care Hospital','Lifeline Medical Center','St. Mary\'s Hospital','Government General Hospital','Green Valley Hospital','Metro Health Institute','Sacred Heart Hospital','Wellness Care Hospital'];

function generateDoctors(count) {
  const list = [];
  for (let i = 1; i <= count; i++) {
    list.push({
      id: `D${String(i).padStart(4, '0')}`,
      name: `Dr. ${randName()}`,
      specialization: pick(SPECIALIZATIONS),
      hospital: pick(HOSPITALS),
      experience: `${1 + Math.floor(Math.random() * 30)} years`,
      phone: randPhone(),
      email: `doctor${i}@medihelp-sample.com`,
      location: randLocationLine(),
      latitude: jitter(BASE_LAT, 0.5),
      longitude: jitter(BASE_LNG, 0.5),
      availability: pick(['Mon-Sat 9AM-5PM','24x7','Mon-Fri 10AM-6PM','Weekends Only','On Call']),
      rating: (3 + Math.random() * 2).toFixed(1),
    });
  }
  return list;
}

// ---------------- Pharmacies ----------------
const PHARMACY_NAMES = ['Apollo Pharmacy','MedPlus','City Medicals','Wellness Pharmacy','Care Chemist','Life Care Pharmacy','Sri Medicals','Health Point Pharmacy','24x7 Medicals','Family Pharmacy'];

function generatePharmacies(count) {
  const list = [];
  for (let i = 1; i <= count; i++) {
    list.push({
      id: `P${String(i).padStart(4, '0')}`,
      name: `${pick(PHARMACY_NAMES)} - ${pick(AREAS)}`,
      address: `${Math.floor(Math.random() * 200) + 1}, ${randLocationLine()}`,
      phone: randPhone(),
      latitude: jitter(BASE_LAT, 0.5),
      longitude: jitter(BASE_LNG, 0.5),
      open24hrs: Math.random() < 0.3,
      rating: (3 + Math.random() * 2).toFixed(1),
    });
  }
  return list;
}

// ---------------- Blood Donors ----------------
const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

function generateDonors(count) {
  const list = [];
  for (let i = 1; i <= count; i++) {
    const lastDonation = new Date();
    lastDonation.setDate(lastDonation.getDate() - Math.floor(Math.random() * 365));
    list.push({
      id: `B${String(i).padStart(4, '0')}`,
      name: randName(),
      bloodGroup: pick(BLOOD_GROUPS),
      phone: randPhone(),
      location: randLocationLine(),
      district: pick(DISTRICTS),
      latitude: jitter(BASE_LAT, 0.6),
      longitude: jitter(BASE_LNG, 0.6),
      lastDonationDate: lastDonation.toISOString().split('T')[0],
      available: Math.random() < 0.7,
    });
  }
  return list;
}

// ---------------- Hospitals (for SOS nearest-hospital lookups) ----------------
function generateHospitals(count) {
  const list = [];
  for (let i = 1; i <= count; i++) {
    const name = `${pick(HOSPITALS)} - ${pick(AREAS)} ${i}`;
    list.push({
      id: `H${String(i).padStart(3, '0')}`,
      name,
      address: `${randLocationLine()}`,
      phone: randPhone(),
      latitude: jitter(BASE_LAT, 0.5),
      longitude: jitter(BASE_LNG, 0.5),
      emergencyServices: Math.random() < 0.6,
      rating: (3 + Math.random() * 2).toFixed(1),
    });
  }
  return list;
}

// ---------------- Shelters (schools/colleges/community halls) ----------------
const SHELTER_TYPES = ['School','College','Community Hall'];
const SHELTER_NAMES = ['Government Higher Secondary School','St. Joseph College','Community Center','Municipal Hall','PSG Polytechnic','Model School','Town Hall Auditorium','Panchayat Union School'];

function generateShelters(count) {
  const list = [];
  for (let i = 1; i <= count; i++) {
    list.push({
      id: `S${String(i).padStart(4, '0')}`,
      name: `${pick(SHELTER_NAMES)} ${i}`,
      type: pick(SHELTER_TYPES),
      address: `${randLocationLine()}`,
      capacity: 50 + Math.floor(Math.random() * 950),
      phone: randPhone(),
      latitude: jitter(BASE_LAT, 0.6),
      longitude: jitter(BASE_LNG, 0.6),
    });
  }
  return list;
}

// ---------------- Volunteers ----------------
function generateVolunteerGroup(groupName, subGroups) {
  const groups = [];
  subGroups.forEach((memberCount, idx) => {
    const members = [];
    for (let i = 1; i <= memberCount; i++) {
      members.push({
        id: `${groupName.slice(0,3).toUpperCase()}${idx + 1}-${i}`,
        name: randName(),
        phone: randPhone(),
        location: randLocationLine(),
        skills: groupName,
        availability: pick(['Available', 'On Duty', 'Off Duty']),
        latitude: jitter(BASE_LAT, 0.4),
        longitude: jitter(BASE_LNG, 0.4),
      });
    }
    groups.push({ groupNumber: idx + 1, members });
  });
  return groups;
}

function generateVolunteers() {
  return {
    fire: generateVolunteerGroup('Fire', [9, 10]),
    medical: generateVolunteerGroup('Medical', [8, 11]),
    rescue: generateVolunteerGroup('Rescue', [7, 12]),
  };
}

// ---------------- Chatbot FAQs ----------------
// Categorized, high-quality knowledge base (not padded to a raw count).
// Each entry: category, keywords (for matching), question, answer.
function generateFaqs() {
  return [
    {
      category: 'Chest Pain / Heart Attack',
      keywords: ['chest pain', 'heart attack', 'chest tightness', 'left arm pain'],
      question: 'I have chest pain, what should I do?',
      answer: "⚠️ Chest pain can be a heart attack. Call emergency services immediately. While waiting: sit down, stay calm, loosen tight clothing, and chew an aspirin if you have one and aren't allergic. Do not drive yourself to the hospital.",
    },
    {
      category: 'Fainting',
      keywords: ['fainted', 'fainting', 'unconscious', 'passed out'],
      question: 'Someone fainted, what should I do?',
      answer: 'Lay the person flat and raise their legs above heart level. Loosen tight clothing and ensure fresh air. Check breathing. If they don\'t regain consciousness within a minute, call emergency services immediately.',
    },
    {
      category: 'Bleeding',
      keywords: ['bleeding', 'stop bleeding', 'cut', 'wound'],
      question: 'How to stop bleeding?',
      answer: 'Apply firm, direct pressure on the wound with a clean cloth. Keep the injured area elevated above heart level if possible. Do not remove the cloth if it soaks through — add more layers on top. Seek medical help for deep or heavy bleeding.',
    },
    {
      category: 'Burns',
      keywords: ['burned', 'burn', 'fire injury', 'scald'],
      question: 'I got burned, what should I do?',
      answer: 'Cool the burn under running water for 10-20 minutes. Do not apply ice, butter, or ointments. Cover loosely with a clean, non-fluffy cloth. For large, deep burns or burns on the face/hands, seek emergency care immediately.',
    },
    {
      category: 'Animal Bites',
      keywords: ['dog bite', 'animal bite', 'bitten'],
      question: 'Dog bite treatment?',
      answer: 'Wash the wound thoroughly with soap and running water for several minutes. Apply an antiseptic and cover with a clean bandage. Seek medical attention promptly for rabies risk assessment and possible vaccination.',
    },
    {
      category: 'Snake Bites',
      keywords: ['snake bite', 'snakebite'],
      question: 'Snake bite first aid?',
      answer: 'Keep the person calm and still to slow venom spread. Immobilize the bitten limb below heart level. Remove tight items like rings. Do NOT cut the wound, apply ice, or attempt to suck out venom. Get to a hospital immediately.',
    },
    {
      category: 'CPR',
      keywords: ['cpr', 'cardiac arrest', 'not breathing'],
      question: 'How to perform CPR?',
      answer: 'Call for emergency help first. Push hard and fast in the center of the chest (about 2 inches deep) at 100-120 compressions per minute. Allow full chest recoil between compressions. Continue until help arrives or the person responds.',
    },
    {
      category: 'Hospital Locator',
      keywords: ['nearest hospital', 'hospital near me', 'find hospital'],
      question: 'Where is the nearest hospital?',
      answer: 'I can help locate nearby hospitals using your live location. Please open the Doctor & Hospital Locator page and allow location access, or tell me your area name.',
    },
    {
      category: 'Ambulance',
      keywords: ['ambulance number', 'emergency number', 'call ambulance'],
      question: 'What is the emergency ambulance number?',
      answer: 'In India, dial 108 for a free ambulance service, or 112 for general emergency services. If you\'ve triggered SOS in this app, help has already been notified.',
    },
    {
      category: 'Breathing Difficulty',
      keywords: ['breathing difficulty', 'cant breathe', 'shortness of breath', 'asthma attack'],
      question: 'I am having breathing difficulty, what should I do?',
      answer: 'Sit upright, loosen tight clothing, and try to stay calm — panic worsens breathlessness. If it\'s an asthma attack, use a reliever inhaler if available. If breathing doesn\'t improve within minutes or lips/face turn bluish, call emergency services immediately.',
    },
    {
      category: 'Fractures',
      keywords: ['fracture', 'broken bone', 'bone injury'],
      question: 'How to handle a suspected fracture?',
      answer: 'Do not try to realign the bone. Immobilize the area using a splint or rolled cloth/newspaper, support it in the position found, and avoid moving the person unnecessarily. Apply ice wrapped in cloth to reduce swelling. Seek medical care.',
    },
    {
      category: 'Poisoning',
      keywords: ['poisoning', 'swallowed poison', 'ingested chemical'],
      question: 'What to do in case of poisoning?',
      answer: 'Do not induce vomiting unless instructed by a professional. Try to identify what was ingested and keep the container/packaging. Call poison control or emergency services immediately and follow their guidance.',
    },
    {
      category: 'Food Poisoning',
      keywords: ['food poisoning', 'vomiting diarrhea food'],
      question: 'What helps with food poisoning symptoms?',
      answer: 'Stay hydrated with small, frequent sips of water or oral rehydration solution. Avoid solid food until vomiting subsides. Seek medical care if there is high fever, blood in stool/vomit, or symptoms lasting more than 2 days.',
    },
    {
      category: 'Diabetic Emergency',
      keywords: ['diabetic emergency', 'low blood sugar', 'hypoglycemia', 'high blood sugar'],
      question: 'What to do during a diabetic emergency?',
      answer: 'For suspected low blood sugar (shakiness, confusion, sweating): give fast-acting sugar (juice, glucose tablets) if the person is conscious and able to swallow. For suspected high blood sugar emergencies or if the person is unconscious, call emergency services immediately.',
    },
    {
      category: 'Pregnancy Emergency',
      keywords: ['pregnancy emergency', 'labor pain', 'pregnant bleeding'],
      question: 'Pregnancy-related emergency, what should I do?',
      answer: 'For heavy bleeding, severe abdominal pain, reduced fetal movement, or signs of labor, contact the woman\'s obstetrician and go to the nearest hospital with a maternity unit immediately. Keep her calm and lying on her left side while arranging transport.',
    },
    {
      category: 'Stroke',
      keywords: ['stroke', 'face drooping', 'slurred speech'],
      question: 'How do I recognize a stroke?',
      answer: 'Use FAST: Face drooping, Arm weakness, Speech difficulty, Time to call emergency services. Note the time symptoms started — this is critical for treatment. Do not give food, drink, or medication.',
    },
    {
      category: 'Child Emergency',
      keywords: ['child emergency', 'baby choking', 'infant fever'],
      question: 'What should I do in a child medical emergency?',
      answer: 'Stay calm and assess breathing and responsiveness. For choking in infants, use back blows and chest thrusts (not abdominal thrusts). For high fever, seizures, or breathing trouble, seek emergency care immediately.',
    },
    {
      category: 'Elderly Care',
      keywords: ['elderly emergency', 'fall elderly', 'old age care'],
      question: 'Emergency care tips for elderly falls?',
      answer: 'Do not rush to move them if a fracture or head injury is suspected. Check responsiveness and breathing, keep them warm and still, and call for medical help. Watch for confusion or worsening pain, which need urgent evaluation.',
    },
    {
      category: 'Mental Health',
      keywords: ['mental health', 'anxiety attack', 'panic attack', 'suicidal'],
      question: 'I need mental health support.',
      answer: 'You are not alone, and support is available. If you or someone you know is in crisis or having thoughts of self-harm, please reach out to a mental health helpline or emergency services right away, or go to the nearest hospital. Would you like me to share general grounding techniques for anxiety, or help you find nearby support resources?',
    },
    {
      category: 'Accidents',
      keywords: ['accident', 'road accident', 'car crash'],
      question: 'What to do after a road accident?',
      answer: 'Ensure the area is safe, call emergency services, and do not move injured people unless there is immediate danger (fire, traffic). Check for breathing and severe bleeding and provide first aid within your ability while waiting for help.',
    },
    {
      category: 'Natural Disasters',
      keywords: ['earthquake', 'flood', 'disaster', 'cyclone'],
      question: 'What should I do during a natural disaster?',
      answer: 'Move to higher ground for floods, or drop-cover-hold for earthquakes. Use the Shelter Locator in this app to find the nearest school, college, or community hall being used as an emergency shelter, and follow local authority instructions.',
    },
  ];
}

// ---------------- Write files ----------------
fs.writeFileSync(path.join(DATA_DIR, 'doctors.json'), JSON.stringify(generateDoctors(520), null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'pharmacies.json'), JSON.stringify(generatePharmacies(520), null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'donors.json'), JSON.stringify(generateDonors(1050), null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'shelters.json'), JSON.stringify(generateShelters(120), null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'hospitals.json'), JSON.stringify(generateHospitals(80), null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'volunteers.json'), JSON.stringify(generateVolunteers(), null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'faqs.json'), JSON.stringify(generateFaqs(), null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'users.json'), JSON.stringify({}, null, 2));

console.log('✅ Sample datasets generated in /data');
// generate-data.js
// One-time script to generate synthetic sample datasets for doctors, pharmacies,
// blood donors, shelters, volunteers, and chatbot FAQs.
// Run: node generate-data.js
// All data is FAKE/PLACEHOLDER — replace with real records before production use.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

// Base coordinates: Coimbatore, TN area — jitter around this for "nearby" realism
const BASE_LAT = 11.0168;
const BASE_LNG = 76.9558;

function jitter(base, spread) {
  return +(base + (Math.random() - 0.5) * spread).toFixed(6);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randPhone() {
  return `+91-9${Math.floor(100000000 + Math.random() * 899999999)}`;
}

const FIRST_NAMES = ['Arun','Divya','Karthik','Meena','Suresh','Priya','Vijay','Lakshmi','Ravi','Anitha','Senthil','Kavya','Manoj','Deepa','Ganesh','Nisha','Prakash','Swathi','Bala','Revathi','Ajay','Sneha','Vikram','Pooja','Harish','Anjali','Naveen','Divyabharathi','Suriya','Keerthana'];
const LAST_NAMES = ['Kumar','Raj','Nair','Iyer','Pillai','Chandran','Murugan','Subramaniam','Krishnan','Sundaram','Venkatesh','Narayan','Muthu','Selvam','Rajendran'];

function randName() {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}

const DISTRICTS = ['Coimbatore','Erode','Tirupur','Salem','Madurai','Chennai','Trichy','Namakkal','Karur','Dindigul'];
const AREAS = ['Gandhipuram','RS Puram','Peelamedu','Saibaba Colony','Race Course','Singanallur','Ukkadam','Town Hall','Ramanathapuram','Saravanampatti'];

function randLocationLine() {
  return `${pick(AREAS)}, ${pick(DISTRICTS)}`;
}

// ---------------- Doctors ----------------
const SPECIALIZATIONS = ['Cardiologist','Neurologist','Dentist','Orthopedic','Pediatrician','General Physician','Dermatologist','ENT Specialist','Psychiatrist','Gynecologist'];
const HOSPITALS = ['City General Hospital','Sunrise Multispeciality','Apex Care Hospital','Lifeline Medical Center','St. Mary\'s Hospital','Government General Hospital','Green Valley Hospital','Metro Health Institute','Sacred Heart Hospital','Wellness Care Hospital'];

function generateDoctors(count) {
  const list = [];
  for (let i = 1; i <= count; i++) {
    list.push({
      id: `D${String(i).padStart(4, '0')}`,
      name: `Dr. ${randName()}`,
      specialization: pick(SPECIALIZATIONS),
      hospital: pick(HOSPITALS),
      experience: `${1 + Math.floor(Math.random() * 30)} years`,
      phone: randPhone(),
      email: `doctor${i}@medihelp-sample.com`,
      location: randLocationLine(),
      latitude: jitter(BASE_LAT, 0.5),
      longitude: jitter(BASE_LNG, 0.5),
      availability: pick(['Mon-Sat 9AM-5PM','24x7','Mon-Fri 10AM-6PM','Weekends Only','On Call']),
      rating: (3 + Math.random() * 2).toFixed(1),
    });
  }
  return list;
}

// ---------------- Pharmacies ----------------
const PHARMACY_NAMES = ['Apollo Pharmacy','MedPlus','City Medicals','Wellness Pharmacy','Care Chemist','Life Care Pharmacy','Sri Medicals','Health Point Pharmacy','24x7 Medicals','Family Pharmacy'];

function generatePharmacies(count) {
  const list = [];
  for (let i = 1; i <= count; i++) {
    list.push({
      id: `P${String(i).padStart(4, '0')}`,
      name: `${pick(PHARMACY_NAMES)} - ${pick(AREAS)}`,
      address: `${Math.floor(Math.random() * 200) + 1}, ${randLocationLine()}`,
      phone: randPhone(),
      latitude: jitter(BASE_LAT, 0.5),
      longitude: jitter(BASE_LNG, 0.5),
      open24hrs: Math.random() < 0.3,
      rating: (3 + Math.random() * 2).toFixed(1),
    });
  }
  return list;
}

// ---------------- Blood Donors ----------------
const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

function generateDonors(count) {
  const list = [];
  for (let i = 1; i <= count; i++) {
    const lastDonation = new Date();
    lastDonation.setDate(lastDonation.getDate() - Math.floor(Math.random() * 365));
    list.push({
      id: `B${String(i).padStart(4, '0')}`,
      name: randName(),
      bloodGroup: pick(BLOOD_GROUPS),
      phone: randPhone(),
      location: randLocationLine(),
      district: pick(DISTRICTS),
      latitude: jitter(BASE_LAT, 0.6),
      longitude: jitter(BASE_LNG, 0.6),
      lastDonationDate: lastDonation.toISOString().split('T')[0],
      available: Math.random() < 0.7,
    });
  }
  return list;
}

// ---------------- Hospitals (for SOS nearest-hospital lookups) ----------------
function generateHospitals(count) {
  const list = [];
  for (let i = 1; i <= count; i++) {
    const name = `${pick(HOSPITALS)} - ${pick(AREAS)} ${i}`;
    list.push({
      id: `H${String(i).padStart(3, '0')}`,
      name,
      address: `${randLocationLine()}`,
      phone: randPhone(),
      latitude: jitter(BASE_LAT, 0.5),
      longitude: jitter(BASE_LNG, 0.5),
      emergencyServices: Math.random() < 0.6,
      rating: (3 + Math.random() * 2).toFixed(1),
    });
  }
  return list;
}

// ---------------- Shelters (schools/colleges/community halls) ----------------
const SHELTER_TYPES = ['School','College','Community Hall'];
const SHELTER_NAMES = ['Government Higher Secondary School','St. Joseph College','Community Center','Municipal Hall','PSG Polytechnic','Model School','Town Hall Auditorium','Panchayat Union School'];

function generateShelters(count) {
  const list = [];
  for (let i = 1; i <= count; i++) {
    list.push({
      id: `S${String(i).padStart(4, '0')}`,
      name: `${pick(SHELTER_NAMES)} ${i}`,
      type: pick(SHELTER_TYPES),
      address: `${randLocationLine()}`,
      capacity: 50 + Math.floor(Math.random() * 950),
      phone: randPhone(),
      latitude: jitter(BASE_LAT, 0.6),
      longitude: jitter(BASE_LNG, 0.6),
    });
  }
  return list;
}

// ---------------- Volunteers ----------------
function generateVolunteerGroup(groupName, subGroups) {
  const groups = [];
  subGroups.forEach((memberCount, idx) => {
    const members = [];
    for (let i = 1; i <= memberCount; i++) {
      members.push({
        id: `${groupName.slice(0,3).toUpperCase()}${idx + 1}-${i}`,
        name: randName(),
        phone: randPhone(),
        location: randLocationLine(),
        skills: groupName,
        availability: pick(['Available', 'On Duty', 'Off Duty']),
        latitude: jitter(BASE_LAT, 0.4),
        longitude: jitter(BASE_LNG, 0.4),
      });
    }
    groups.push({ groupNumber: idx + 1, members });
  });
  return groups;
}

function generateVolunteers() {
  return {
    fire: generateVolunteerGroup('Fire', [9, 10]),
    medical: generateVolunteerGroup('Medical', [8, 11]),
    rescue: generateVolunteerGroup('Rescue', [7, 12]),
  };
}

// ---------------- Chatbot FAQs ----------------
// Categorized, high-quality knowledge base (not padded to a raw count).
// Each entry: category, keywords (for matching), question, answer.
function generateFaqs() {
  return [
    {
      category: 'Chest Pain / Heart Attack',
      keywords: ['chest pain', 'heart attack', 'chest tightness', 'left arm pain'],
      question: 'I have chest pain, what should I do?',
      answer: "⚠️ Chest pain can be a heart attack. Call emergency services immediately. While waiting: sit down, stay calm, loosen tight clothing, and chew an aspirin if you have one and aren't allergic. Do not drive yourself to the hospital.",
    },
    {
      category: 'Fainting',
      keywords: ['fainted', 'fainting', 'unconscious', 'passed out'],
      question: 'Someone fainted, what should I do?',
      answer: 'Lay the person flat and raise their legs above heart level. Loosen tight clothing and ensure fresh air. Check breathing. If they don\'t regain consciousness within a minute, call emergency services immediately.',
    },
    {
      category: 'Bleeding',
      keywords: ['bleeding', 'stop bleeding', 'cut', 'wound'],
      question: 'How to stop bleeding?',
      answer: 'Apply firm, direct pressure on the wound with a clean cloth. Keep the injured area elevated above heart level if possible. Do not remove the cloth if it soaks through — add more layers on top. Seek medical help for deep or heavy bleeding.',
    },
    {
      category: 'Burns',
      keywords: ['burned', 'burn', 'fire injury', 'scald'],
      question: 'I got burned, what should I do?',
      answer: 'Cool the burn under running water for 10-20 minutes. Do not apply ice, butter, or ointments. Cover loosely with a clean, non-fluffy cloth. For large, deep burns or burns on the face/hands, seek emergency care immediately.',
    },
    {
      category: 'Animal Bites',
      keywords: ['dog bite', 'animal bite', 'bitten'],
      question: 'Dog bite treatment?',
      answer: 'Wash the wound thoroughly with soap and running water for several minutes. Apply an antiseptic and cover with a clean bandage. Seek medical attention promptly for rabies risk assessment and possible vaccination.',
    },
    {
      category: 'Snake Bites',
      keywords: ['snake bite', 'snakebite'],
      question: 'Snake bite first aid?',
      answer: 'Keep the person calm and still to slow venom spread. Immobilize the bitten limb below heart level. Remove tight items like rings. Do NOT cut the wound, apply ice, or attempt to suck out venom. Get to a hospital immediately.',
    },
    {
      category: 'CPR',
      keywords: ['cpr', 'cardiac arrest', 'not breathing'],
      question: 'How to perform CPR?',
      answer: 'Call for emergency help first. Push hard and fast in the center of the chest (about 2 inches deep) at 100-120 compressions per minute. Allow full chest recoil between compressions. Continue until help arrives or the person responds.',
    },
    {
      category: 'Hospital Locator',
      keywords: ['nearest hospital', 'hospital near me', 'find hospital'],
      question: 'Where is the nearest hospital?',
      answer: 'I can help locate nearby hospitals using your live location. Please open the Doctor & Hospital Locator page and allow location access, or tell me your area name.',
    },
    {
      category: 'Ambulance',
      keywords: ['ambulance number', 'emergency number', 'call ambulance'],
      question: 'What is the emergency ambulance number?',
      answer: 'In India, dial 108 for a free ambulance service, or 112 for general emergency services. If you\'ve triggered SOS in this app, help has already been notified.',
    },
    {
      category: 'Breathing Difficulty',
      keywords: ['breathing difficulty', 'cant breathe', 'shortness of breath', 'asthma attack'],
      question: 'I am having breathing difficulty, what should I do?',
      answer: 'Sit upright, loosen tight clothing, and try to stay calm — panic worsens breathlessness. If it\'s an asthma attack, use a reliever inhaler if available. If breathing doesn\'t improve within minutes or lips/face turn bluish, call emergency services immediately.',
    },
    {
      category: 'Fractures',
      keywords: ['fracture', 'broken bone', 'bone injury'],
      question: 'How to handle a suspected fracture?',
      answer: 'Do not try to realign the bone. Immobilize the area using a splint or rolled cloth/newspaper, support it in the position found, and avoid moving the person unnecessarily. Apply ice wrapped in cloth to reduce swelling. Seek medical care.',
    },
    {
      category: 'Poisoning',
      keywords: ['poisoning', 'swallowed poison', 'ingested chemical'],
      question: 'What to do in case of poisoning?',
      answer: 'Do not induce vomiting unless instructed by a professional. Try to identify what was ingested and keep the container/packaging. Call poison control or emergency services immediately and follow their guidance.',
    },
    {
      category: 'Food Poisoning',
      keywords: ['food poisoning', 'vomiting diarrhea food'],
      question: 'What helps with food poisoning symptoms?',
      answer: 'Stay hydrated with small, frequent sips of water or oral rehydration solution. Avoid solid food until vomiting subsides. Seek medical care if there is high fever, blood in stool/vomit, or symptoms lasting more than 2 days.',
    },
    {
      category: 'Diabetic Emergency',
      keywords: ['diabetic emergency', 'low blood sugar', 'hypoglycemia', 'high blood sugar'],
      question: 'What to do during a diabetic emergency?',
      answer: 'For suspected low blood sugar (shakiness, confusion, sweating): give fast-acting sugar (juice, glucose tablets) if the person is conscious and able to swallow. For suspected high blood sugar emergencies or if the person is unconscious, call emergency services immediately.',
    },
    {
      category: 'Pregnancy Emergency',
      keywords: ['pregnancy emergency', 'labor pain', 'pregnant bleeding'],
      question: 'Pregnancy-related emergency, what should I do?',
      answer: 'For heavy bleeding, severe abdominal pain, reduced fetal movement, or signs of labor, contact the woman\'s obstetrician and go to the nearest hospital with a maternity unit immediately. Keep her calm and lying on her left side while arranging transport.',
    },
    {
      category: 'Stroke',
      keywords: ['stroke', 'face drooping', 'slurred speech'],
      question: 'How do I recognize a stroke?',
      answer: 'Use FAST: Face drooping, Arm weakness, Speech difficulty, Time to call emergency services. Note the time symptoms started — this is critical for treatment. Do not give food, drink, or medication.',
    },
    {
      category: 'Child Emergency',
      keywords: ['child emergency', 'baby choking', 'infant fever'],
      question: 'What should I do in a child medical emergency?',
      answer: 'Stay calm and assess breathing and responsiveness. For choking in infants, use back blows and chest thrusts (not abdominal thrusts). For high fever, seizures, or breathing trouble, seek emergency care immediately.',
    },
    {
      category: 'Elderly Care',
      keywords: ['elderly emergency', 'fall elderly', 'old age care'],
      question: 'Emergency care tips for elderly falls?',
      answer: 'Do not rush to move them if a fracture or head injury is suspected. Check responsiveness and breathing, keep them warm and still, and call for medical help. Watch for confusion or worsening pain, which need urgent evaluation.',
    },
    {
      category: 'Mental Health',
      keywords: ['mental health', 'anxiety attack', 'panic attack', 'suicidal'],
      question: 'I need mental health support.',
      answer: 'You are not alone, and support is available. If you or someone you know is in crisis or having thoughts of self-harm, please reach out to a mental health helpline or emergency services right away, or go to the nearest hospital. Would you like me to share general grounding techniques for anxiety, or help you find nearby support resources?',
    },
    {
      category: 'Accidents',
      keywords: ['accident', 'road accident', 'car crash'],
      question: 'What to do after a road accident?',
      answer: 'Ensure the area is safe, call emergency services, and do not move injured people unless there is immediate danger (fire, traffic). Check for breathing and severe bleeding and provide first aid within your ability while waiting for help.',
    },
    {
      category: 'Natural Disasters',
      keywords: ['earthquake', 'flood', 'disaster', 'cyclone'],
      question: 'What should I do during a natural disaster?',
      answer: 'Move to higher ground for floods, or drop-cover-hold for earthquakes. Use the Shelter Locator in this app to find the nearest school, college, or community hall being used as an emergency shelter, and follow local authority instructions.',
    },
  ];
}

// ---------------- Write files ----------------
fs.writeFileSync(path.join(DATA_DIR, 'doctors.json'), JSON.stringify(generateDoctors(520), null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'pharmacies.json'), JSON.stringify(generatePharmacies(520), null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'donors.json'), JSON.stringify(generateDonors(1050), null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'shelters.json'), JSON.stringify(generateShelters(120), null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'hospitals.json'), JSON.stringify(generateHospitals(80), null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'volunteers.json'), JSON.stringify(generateVolunteers(), null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'faqs.json'), JSON.stringify(generateFaqs(), null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'users.json'), JSON.stringify({}, null, 2));

console.log('✅ Sample datasets generated in /data');
