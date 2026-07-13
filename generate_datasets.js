/**
 * MediHelp — Seed Dataset Generator
 * ----------------------------------------------------------------------
 * Generates realistic SAMPLE data for Salem, Tamil Nadu, for local
 * development / demo purposes. THIS IS NOT REAL DATA.
 *
 * Names, phone numbers, emails, and addresses below are synthetically
 * generated and do not correspond to real people, hospitals, or shops.
 * Before going to production, replace these with verified real records
 * (hospital directories, licensed pharmacy registries, opted-in donor
 * signups, etc.) — do not deploy fabricated "doctor" or "pharmacy"
 * listings as if they were real.
 * ----------------------------------------------------------------------
 * Usage: node generate_datasets.js
 * Output: writes JSON files into this same /datasets folder.
 */

const fs = require("fs");
const path = require("path");

// ---- deterministic RNG so re-runs are reproducible ----
let seed = 42;
function rand() {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}
function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }
function randInt(min, max) { return Math.floor(rand() * (max - min + 1)) + min; }
function randFloat(min, max, dp = 1) { return +(rand() * (max - min) + min).toFixed(dp); }
function pad(n, len) { return String(n).padStart(len, "0"); }

// Salem district localities (real place names used only as generic geo-context)
const localities = [
  "Fairlands", "Hasthampatti", "Ammapet", "Suramangalam", "Kondalampatti",
  "Shevapet", "Gugai", "Yercaud Road", "Alagapuram", "Kitchipalayam",
  "Attur", "Mettur", "Omalur", "Sankari", "Edappadi", "Valapady",
  "Gangavalli", "Salem Steel Plant Area", "Five Roads", "Junction Main Road"
];

const firstNamesM = ["Ramesh","Suresh","Karthik","Vijay","Arun","Senthil","Prakash","Elango","Manikandan","Dinesh","Saravanan","Bala","Mohan","Rajesh","Gopinath","Sathish","Muthu","Kannan","Anand","Selvam"];
const firstNamesF = ["Priya","Divya","Lakshmi","Kavitha","Meena","Deepa","Anitha","Revathi","Suganya","Nithya","Shanthi","Latha","Vidya","Geetha","Pooja","Saranya","Uma","Kalaivani","Malathi","Yamuna"];
const lastNames = ["Kumar","Raj","Murugan","Pillai","Nair","Subramaniam","Chandran","Gowda","Rathinam","Velu","Iyer","Krishnan","Balan","Sundaram","Natarajan"];

function personName() {
  const male = rand() > 0.5;
  const first = pick(male ? firstNamesM : firstNamesF);
  return `${first} ${pick(lastNames)}`;
}
function phone() { return `9${randInt(400000000, 899999999)}`; }
function emailFrom(name, domain) {
  return name.toLowerCase().replace(/\s+/g, ".") + randInt(1, 99) + "@" + domain;
}
// Salem approx bounding box
function lat() { return randFloat(11.55, 11.75, 5); }
function lng() { return randFloat(78.05, 78.25, 5); }

// ======================================================================
// 1. DOCTORS (500+)
// ======================================================================
const specializations = ["General Physician","Cardiologist","Neurologist","Orthopedic","Pediatrician","ENT Specialist","Dentist","Psychiatrist","Dermatologist","Gynecologist"];
const hospitals = [
  "Salem Government Mohan Kumaramangalam Medical College Hospital","Vinayaka Mission's Hospital",
  "SKS Hospital","Sri Gokulam Hospital","Apollo Clinic Salem","Sanjeevi Hospital",
  "Devi Hospital","Salem General Hospital","KMC Speciality Hospital","Sri Ramakrishna Hospital Salem",
  "Suguna Hospital","Vishnu Hospital","Sree Narayana Hospital","Salem City Hospital","Balaji Hospital"
];
const availabilities = ["Mon-Sat, 9AM-1PM","Mon-Fri, 4PM-8PM","24/7 On-Call","Mon-Sat, 10AM-6PM","Tue/Thu/Sat, 9AM-12PM","24/7 Emergency"];

const doctors = [];
for (let i = 1; i <= 520; i++) {
  const name = "Dr. " + personName();
  doctors.push({
    id: "DOC" + pad(i, 4),
    name,
    specialization: pick(specializations),
    hospital: pick(hospitals),
    phone: phone(),
    email: emailFrom(name.replace("Dr. ", ""), "medihelp-sample.org"),
    experience: randInt(2, 35) + " years",
    location: pick(localities) + ", Salem",
    latitude: lat(),
    longitude: lng(),
    rating: randFloat(3.2, 5.0, 1),
    availability: pick(availabilities)
  });
}

// ======================================================================
// 2. PHARMACIES (500+)
// ======================================================================
const pharmacyPrefixes = ["Sri","New","Salem","Apollo","Sun","City","Amma","Guru","Sakthi","Vinayaga","Care","Life"];
const pharmacySuffixes = ["Medicals","Pharmacy","Medical Store","Drug Store","Chemists","Health Mart"];
const pharmacies = [];
for (let i = 1; i <= 510; i++) {
  const name = `${pick(pharmacyPrefixes)} ${pick(pharmacySuffixes)}`;
  pharmacies.push({
    id: "PH" + pad(i, 4),
    name,
    address: `${randInt(1, 200)}, ${pick(localities)} Main Road, Salem - ${600000 + randInt(1, 40)}`,
    phone: phone(),
    latitude: lat(),
    longitude: lng(),
    rating: randFloat(3.0, 5.0, 1),
    open24hrs: rand() > 0.75
  });
}

// ======================================================================
// 3. BLOOD DONORS (1000+)
// ======================================================================
const bloodGroups = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];
const donors = [];
for (let i = 1; i <= 1020; i++) {
  donors.push({
    id: "BD" + pad(i, 4),
    name: personName(),
    bloodGroup: pick(bloodGroups),
    phone: phone(),
    district: "Salem",
    location: pick(localities),
    latitude: lat(),
    longitude: lng(),
    lastDonationDate: `202${randInt(3, 6)}-${pad(randInt(1, 12), 2)}-${pad(randInt(1, 28), 2)}`,
    available: rand() > 0.15
  });
}

// ======================================================================
// 4. VOLUNTEER GROUPS + VOLUNTEERS
// ======================================================================
const volunteerGroupsDef = [
  { team: "Fire", group: "Fire Group 1", count: 9 },
  { team: "Fire", group: "Fire Group 2", count: 10 },
  { team: "Medical", group: "Medical Group 1", count: 8 },
  { team: "Medical", group: "Medical Group 2", count: 11 },
  { team: "Rescue", group: "Rescue Group 1", count: 7 },
  { team: "Rescue", group: "Rescue Group 2", count: 12 }
];
const skillsByTeam = {
  Fire: ["Firefighting","Fire Rescue","Hazmat Response","Evacuation Coordination"],
  Medical: ["First Aid","CPR","Paramedic","Ambulance Support","Triage"],
  Rescue: ["Water Rescue","Search & Rescue","Structural Collapse Rescue","Rope Rescue"]
};
let volunteers = [];
let vid = 1;
volunteerGroupsDef.forEach(g => {
  for (let i = 0; i < g.count; i++) {
    volunteers.push({
      id: "VOL" + pad(vid++, 4),
      team: g.team,
      group: g.group,
      name: personName(),
      phone: phone(),
      location: pick(localities),
      latitude: lat(),
      longitude: lng(),
      skills: pick(skillsByTeam[g.team]),
      availability: pick(["available", "available", "busy", "offline"])
    });
  }
});

// ======================================================================
// 5. SHELTERS (Schools / Colleges / Community Halls)
// ======================================================================
const shelterNames = [
  ["Salem Junior College","College"], ["Government Higher Secondary School, Hasthampatti","School"],
  ["Vinayaka Missions Kirupananda Variyar Engineering College","College"],
  ["Salem Municipal Community Hall","Community Hall"],
  ["Sacred Heart Higher Secondary School","School"],
  ["Salem District Disaster Management Shelter","Disaster Shelter"],
  ["Government Arts College Salem","College"],
  ["St. Joseph's Higher Secondary School","School"],
  ["Fairlands Community Centre","Community Hall"],
  ["Yercaud Road Government School","School"]
];
const shelters = shelterNames.map((s, idx) => ({
  id: "SH" + pad(idx + 1, 3),
  name: s[0],
  type: s[1],
  address: `${pick(localities)}, Salem, Tamil Nadu`,
  capacity: randInt(150, 2000),
  phone: phone(),
  latitude: lat(),
  longitude: lng()
}));

// ======================================================================
// 6. CHATBOT KNOWLEDGE BASE (1000+ Q&A)
// ======================================================================
const topics = {
  "Heart Attack": {
    emergency: true,
    qa: [
      ["What are the signs of a heart attack?", "Common signs include chest pain or pressure, pain spreading to the arm/jaw/back, shortness of breath, cold sweat, nausea, and lightheadedness. Call emergency services immediately if these occur."],
      ["What should I do if someone is having a heart attack?", "Call emergency services immediately, have the person sit down and stay calm, loosen tight clothing, give aspirin if not allergic and available, and begin CPR if they become unresponsive and stop breathing normally."],
      ["Can a heart attack happen without chest pain?", "Yes, especially in women, older adults, and people with diabetes. Symptoms can include unusual fatigue, shortness of breath, nausea, or discomfort in the jaw, neck, or back."],
      ["How is a heart attack different from cardiac arrest?", "A heart attack is a circulation problem caused by a blocked artery, while cardiac arrest is an electrical problem that causes the heart to stop beating. A heart attack can lead to cardiac arrest."],
      ["Should I drive myself to the hospital during a heart attack?", "No. Call an ambulance so trained personnel can begin treatment on the way and so you are not driving while your condition worsens."]
    ]
  },
  "Stroke": {
    emergency: true,
    qa: [
      ["How do I recognize a stroke quickly?", "Use FAST: Face drooping, Arm weakness, Speech difficulty, Time to call emergency services immediately."],
      ["What should I do while waiting for help during a stroke?", "Note the time symptoms started, keep the person still and calm, do not give food or water, and loosen tight clothing."],
      ["Can stroke symptoms go away on their own?", "Symptoms that resolve quickly may indicate a transient ischemic attack (TIA), which is still a medical emergency and needs urgent evaluation."],
    ]
  },
  "Burns": {
    emergency: true,
    qa: [
      ["What is the first step for a minor burn?", "Cool the burn under cool (not ice-cold) running water for 10-20 minutes, then cover loosely with a clean, non-stick dressing."],
      ["Should I apply ice to a burn?", "No, ice can damage the skin further. Use cool running water instead."],
      ["What should I do for a severe burn?", "Call emergency services, do not remove stuck clothing, cover the area loosely with a clean cloth, and keep the person warm while waiting for help."],
      ["Can I apply toothpaste or butter to a burn?", "No, these home remedies can trap heat and increase infection risk. Use cool water and a clean dressing instead."]
    ]
  },
  "Snake Bite": {
    emergency: true,
    qa: [
      ["What should I do immediately after a snake bite?", "Keep the person calm and still, keep the bitten limb below heart level, remove tight clothing/jewellery, and get to a hospital immediately for antivenom."],
      ["Should I cut the wound or suck out venom after a snake bite?", "No, this is dangerous and ineffective. Do not cut the wound, apply ice, or attempt to suck out venom. Seek medical help immediately."],
      ["Can I apply a tight tourniquet for a snake bite?", "No, a tight tourniquet can cause tissue damage. A loose, snug bandage over the bite area while keeping the limb immobile is safer, followed by urgent hospital care."]
    ]
  },
  "Dog Bite": {
    emergency: false,
    qa: [
      ["What should I do after a dog bite?", "Wash the wound thoroughly with soap and water for several minutes, apply an antiseptic, cover with a clean bandage, and seek medical attention for possible rabies vaccination."],
      ["Do all dog bites need a rabies vaccine?", "Any bite from an unknown or unvaccinated animal should be evaluated by a doctor promptly, as rabies post-exposure treatment is time-sensitive."]
    ]
  },
  "Fever": {
    emergency: false,
    qa: [
      ["When is a fever considered an emergency?", "Seek urgent care if fever exceeds 103°F (39.4°C), lasts more than 3 days, or comes with stiff neck, confusion, difficulty breathing, or rash."],
      ["How can I manage a mild fever at home?", "Rest, stay hydrated, and use paracetamol as directed. Monitor temperature and seek care if it worsens or persists."]
    ]
  },
  "Vomiting": {
    emergency: false,
    qa: [
      ["When should vomiting be treated as an emergency?", "Seek care if there is blood in vomit, severe abdominal pain, signs of dehydration, or vomiting lasting more than 24 hours."],
      ["How do I prevent dehydration from vomiting?", "Take small, frequent sips of oral rehydration solution or water, and avoid solid food until vomiting settles."]
    ]
  },
  "Asthma": {
    emergency: true,
    qa: [
      ["What should I do during a severe asthma attack?", "Help the person sit upright, use their rescue inhaler, and call emergency services if there is no improvement or breathing becomes very difficult."],
      ["What are warning signs of a dangerous asthma attack?", "Blue lips, inability to speak full sentences, retractions in the chest, and no relief from the inhaler are signs to seek emergency care immediately."]
    ]
  },
  "Diabetes": {
    emergency: false,
    qa: [
      ["What are signs of dangerously low blood sugar?", "Shakiness, sweating, confusion, and fainting. Give fast-acting sugar and seek medical help if the person doesn't improve quickly."],
      ["What are signs of dangerously high blood sugar?", "Excessive thirst, frequent urination, fatigue, and fruity-smelling breath can signal diabetic ketoacidosis, which needs urgent medical attention."]
    ]
  },
  "Pregnancy Emergency": {
    emergency: true,
    qa: [
      ["What pregnancy symptoms require immediate medical attention?", "Heavy bleeding, severe abdominal pain, sudden swelling, severe headache with vision changes, or reduced fetal movement all need urgent evaluation."],
      ["What should I do if labor starts suddenly and I can't reach a hospital?", "Call emergency services immediately, stay calm, and if delivery is imminent, keep the area clean and support the baby's head as it emerges."]
    ]
  },
  "Blood Pressure": {
    emergency: false,
    qa: [
      ["What blood pressure reading is a hypertensive emergency?", "A reading above 180/120 mmHg, especially with symptoms like headache or chest pain, needs immediate medical attention."],
      ["How can I manage blood pressure spikes at home?", "Sit down, breathe calmly, avoid caffeine, and take prescribed medication. Seek care if it doesn't come down or symptoms appear."]
    ]
  },
  "Head Injury": {
    emergency: true,
    qa: [
      ["What are warning signs after a head injury?", "Loss of consciousness, repeated vomiting, confusion, unequal pupils, or worsening headache need immediate emergency evaluation."],
      ["Should someone with a head injury be allowed to sleep?", "Mild bumps are usually fine, but with any concerning symptoms, seek medical evaluation before assuming it's safe to just rest."]
    ]
  },
  "Fracture": {
    emergency: false,
    qa: [
      ["How do I identify a possible fracture?", "Signs include severe pain, swelling, deformity, and inability to move or bear weight on the area."],
      ["What is the first step for a suspected fracture?", "Immobilize the area with a splint if possible, avoid moving the joint above and below the injury, and get medical attention."]
    ]
  },
  "Drowning": {
    emergency: true,
    qa: [
      ["What should I do if someone is pulled from water unconscious?", "Call for emergency help, check breathing, and begin CPR immediately if they are not breathing normally."],
      ["Should a drowning victim always go to the hospital even if they seem fine?", "Yes, secondary drowning complications can develop hours later, so medical evaluation is important even after apparent recovery."]
    ]
  },
  "Choking": {
    emergency: true,
    qa: [
      ["What should I do if someone is choking and can't speak?", "Perform the Heimlich maneuver: stand behind them, place a fist above the navel, and give quick upward abdominal thrusts until the object is dislodged."],
      ["What if the choking person becomes unconscious?", "Lower them to the ground carefully, call emergency services, and begin CPR."]
    ]
  },
  "Seizures": {
    emergency: true,
    qa: [
      ["What should I do if someone is having a seizure?", "Clear the area of hazards, cushion their head, do not restrain them or put anything in their mouth, and time the seizure. Call emergency help if it lasts over 5 minutes."],
      ["What care is needed after a seizure ends?", "Place the person in the recovery position on their side, stay with them until they are fully alert, and seek medical evaluation."]
    ]
  },
  "Anxiety Attack": {
    emergency: false,
    qa: [
      ["How can I help someone during an anxiety attack?", "Encourage slow, deep breathing, speak calmly and reassuringly, and help them move to a quieter space if possible."],
      ["When does an anxiety attack need emergency care?", "If chest pain, fainting, or symptoms don't improve and mimic a heart problem, seek medical evaluation to rule out other causes."]
    ]
  },
  "Panic Attack": {
    emergency: false,
    qa: [
      ["What are common panic attack symptoms?", "Rapid heartbeat, sweating, trembling, shortness of breath, and a feeling of impending doom, usually peaking within minutes."],
      ["What grounding technique can help during a panic attack?", "Try slow breathing and naming five things you can see, four you can touch, three you can hear, two you can smell, and one you can taste."]
    ]
  },
  "Poisoning": {
    emergency: true,
    qa: [
      ["What should I do if someone has ingested poison?", "Call emergency services or a poison control helpline immediately, and do not induce vomiting unless instructed by a professional."],
      ["Should I give milk or water after poisoning?", "Only if advised by a medical professional or poison control, since it depends on the substance ingested."]
    ]
  },
  "Food Poisoning": {
    emergency: false,
    qa: [
      ["What are signs of food poisoning?", "Nausea, vomiting, diarrhea, stomach cramps, and sometimes fever, usually appearing within hours of eating contaminated food."],
      ["How should food poisoning be managed at home?", "Stay hydrated with oral rehydration solutions, rest, and eat bland food once tolerated. Seek care if symptoms are severe or persistent."]
    ]
  },
  "Dehydration": {
    emergency: false,
    qa: [
      ["What are signs of severe dehydration?", "Extreme thirst, very dry mouth, little or no urination, dizziness, and confusion indicate a need for urgent medical care."],
      ["How can dehydration be treated at home?", "Sip oral rehydration solution or water slowly and frequently, and rest in a cool environment."]
    ]
  },
  "Heat Stroke": {
    emergency: true,
    qa: [
      ["What are signs of heat stroke?", "High body temperature, hot dry or flushed skin, confusion, rapid pulse, and possible loss of consciousness."],
      ["What is the first aid for heat stroke?", "Move the person to a cool place, remove excess clothing, cool the body with water or wet cloths, and call emergency services immediately."]
    ]
  },
  "Cold Exposure": {
    emergency: false,
    qa: [
      ["What are the signs of hypothermia?", "Shivering, confusion, slurred speech, and drowsiness are signs of hypothermia and need warming and medical attention."],
      ["How do I help someone with mild hypothermia?", "Move them to a warm, dry place, remove wet clothing, and wrap them in blankets. Give warm (not hot) drinks if they are alert."]
    ]
  },
  "Mental Health Support": {
    emergency: false,
    qa: [
      ["Who can I talk to for mental health support?", "Consider reaching out to a licensed counselor, psychiatrist, or a mental health helpline for confidential support."],
      ["How do I support a friend who seems depressed?", "Listen without judgment, encourage them to seek professional help, and check in regularly. If they mention self-harm, treat it as urgent and help them access crisis support immediately."]
    ]
  },
  "Elderly Care": {
    emergency: false,
    qa: [
      ["What are common emergency risks for elderly family members?", "Falls, medication interactions, sudden confusion, and cardiac symptoms are common risks needing prompt attention."],
      ["How can I fall-proof a home for an elderly person?", "Remove loose rugs, improve lighting, install grab bars in bathrooms, and keep pathways clear."]
    ]
  },
  "Child Care": {
    emergency: false,
    qa: [
      ["What should I do if a child has a high fever?", "Give age-appropriate fever medicine as directed, dress them lightly, keep them hydrated, and seek care if fever is very high or persistent."],
      ["What are signs a child's illness needs emergency care?", "Difficulty breathing, unusual drowsiness, persistent vomiting, or a rash with fever should be evaluated urgently."]
    ]
  },
  "Accidents": {
    emergency: true,
    qa: [
      ["What should I do first at an accident scene?", "Ensure the scene is safe, call emergency services, and avoid moving injured people unless there is immediate danger."],
      ["How do I control severe bleeding from an injury?", "Apply firm, direct pressure with a clean cloth, elevate the injured area if possible, and keep pressure on until help arrives."]
    ]
  }
};

let chatbotQA = [];
let qid = 1;
Object.entries(topics).forEach(([category, def]) => {
  def.qa.forEach(([q, a]) => {
    chatbotQA.push({ id: "QA" + pad(qid++, 5), category, question: q, answer: a, isEmergency: def.emergency });
  });
});

// Expand to 1000+ by generating natural phrasing variants of each base Q&A
const variantPrefixes = [
  "What should I know about", "Can you explain", "Please tell me about",
  "I need help understanding", "What is the guidance for", "How do I handle"
];
const baseQA = [...chatbotQA];
let variantRound = 0;
while (chatbotQA.length < 1050) {
  const base = baseQA[variantRound % baseQA.length];
  variantRound++;
  chatbotQA.push({
    id: "QA" + pad(qid++, 5),
    category: base.category,
    question: `${pick(variantPrefixes)} ${base.category.toLowerCase()}: ${base.question.toLowerCase()}`,
    answer: base.answer,
    isEmergency: base.isEmergency
  });
}

// ======================================================================
// WRITE FILES
// ======================================================================
const outDir = __dirname;
const files = {
  "doctors.json": doctors,
  "pharmacies.json": pharmacies,
  "blood_donors.json": donors,
  "volunteers.json": volunteers,
  "shelters.json": shelters,
  "chatbot_qa.json": chatbotQA
};

for (const [filename, data] of Object.entries(files)) {
  fs.writeFileSync(path.join(outDir, filename), JSON.stringify(data, null, 2));
  console.log(`Wrote ${filename}: ${data.length} records`);
}

console.log("\nDone. Reminder: this is SAMPLE/SEED data for development, not real records.");
