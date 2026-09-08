/* =====================================================================
   dashboard.js — Hospital Portal
   Depends on: supabase-config.js, common.js, hospital-auth.js (loaded first)
===================================================================== */

const BED_TYPES = [
  { key: "icu",        label: "ICU Beds",     icon: "🛏️", totalCol: "total_icu_beds",        availCol: "available_icu_beds" },
  { key: "general",    label: "General Beds", icon: "🏥", totalCol: "total_general_beds",    availCol: "available_general_beds" },
  { key: "oxygen",     label: "Oxygen Beds",  icon: "💨", totalCol: "total_oxygen_beds",     availCol: "available_oxygen_beds" },
  { key: "ventilator", label: "Ventilators",  icon: "🫁", totalCol: "total_ventilators",     availCol: "available_ventilators" }
];

let currentHospital = null;
let pendingChanges = {}; // { icu: 7, general: 40, ... } — only bed types the user actually changed
let realtimeChannel = null;

(async function init() {
  const auth = await requireHospitalUser();
  if (!auth) return; // requireHospitalUser() already redirected to login

  currentHospital = auth.hospital;
  renderDashboard(currentHospital);
  subscribeRealtime(currentHospital.id);

  document.getElementById("logoutLink").addEventListener("click", (e) => {
    e.preventDefault();
    logoutHospitalUser();
  });

  ["navBeds"].forEach((id) => {
    document.getElementById(id).addEventListener("click", (e) => e.preventDefault());
  });
  ["navSos", "navNotifications", "navProfile"].forEach((id) => {
    document.getElementById(id).addEventListener("click", (e) => {
      e.preventDefault();
      toast("This section is coming in the next update.", "info");
    });
  });

  document.getElementById("saveBedsBtn").addEventListener("click", saveBedChanges);
})();

window.addEventListener("beforeunload", () => {
  if (realtimeChannel) supabaseClient.removeChannel(realtimeChannel);
});

function subscribeRealtime(hospitalId) {
  realtimeChannel = supabaseClient
    .channel(`hospital-${hospitalId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "hospitals", filter: `id=eq.${hospitalId}` },
      (payload) => {
        // Only refresh from a remote change if the local user has no
        // unsaved edits in flight — otherwise we'd stomp what they're
        // mid-typing.
        if (Object.keys(pendingChanges).length === 0) {
          currentHospital = payload.new;
          renderDashboard(currentHospital);
        }
      }
    )
    .subscribe();
}

function renderDashboard(hospital) {
  document.getElementById("loadingState").style.display = "none";
  document.getElementById("errorState").style.display = "none";
  document.getElementById("dashboardContent").style.display = "";

  document.getElementById("hospitalName").textContent = hospital.name || "—";
  document.getElementById("hospitalAddress").textContent = hospital.address || "—";
  document.getElementById("hospitalPhone").textContent = hospital.phone || "—";
  document.getElementById("lastUpdated").textContent = hospital.beds_last_updated
    ? `Last updated ${fmtDate(hospital.beds_last_updated)}`
    : "Not yet reported";

  const grid = document.getElementById("bedGrid");
  grid.innerHTML = "";
  BED_TYPES.forEach((bt) => grid.appendChild(buildBedCard(bt, hospital)));

  pendingChanges = {};
  updateSaveBar();
}

function buildBedCard(bt, hospital) {
  const total = Number(hospital[bt.totalCol]) || 0;
  const available = Number(hospital[bt.availCol]) || 0;

  const card = document.createElement("div");
  card.className = "mh-bed-card";
  card.dataset.bedType = bt.key;

  card.innerHTML = `
    <div class="mh-bed-card-head">
      <h3>${bt.label}</h3>
      <span class="mh-bed-card-icon">${bt.icon}</span>
    </div>
    <div class="mh-bed-stats">
      <span>Occupied: <strong class="mh-occupied">${total - available}</strong></span>
      <span>Available: <strong class="mh-available">${available}</strong></span>
    </div>
    <div class="mh-progress-track">
      <div class="mh-progress-fill" style="width:${total ? Math.round((available / total) * 100) : 0}%"></div>
    </div>
    <div class="mh-bed-editor">
      <button type="button" class="mh-stepper-btn" data-action="dec" ${total === 0 ? "disabled" : ""}>−</button>
      <input type="number" class="mh-bed-input" min="0" max="${total}" value="${available}" ${total === 0 ? "disabled" : ""} />
      <span class="mh-bed-of-total">of ${total}</span>
      <button type="button" class="mh-stepper-btn" data-action="inc" ${total === 0 ? "disabled" : ""}>+</button>
    </div>
  `;

  const input = card.querySelector(".mh-bed-input");
  const decBtn = card.querySelector('[data-action="dec"]');
  const incBtn = card.querySelector('[data-action="inc"]');

  const applyValue = (raw) => {
    let v = Number(raw);
    if (!Number.isFinite(v)) v = available;
    v = Math.max(0, Math.min(total, Math.round(v)));
    input.value = v;
    updateCardDisplay(card, total, v);

    if (v === available) {
      delete pendingChanges[bt.key];
      card.classList.remove("mh-dirty");
    } else {
      pendingChanges[bt.key] = v;
      card.classList.add("mh-dirty");
    }
    updateSaveBar();
  };

  decBtn.addEventListener("click", () => applyValue(Number(input.value) - 1));
  incBtn.addEventListener("click", () => applyValue(Number(input.value) + 1));
  input.addEventListener("change", () => applyValue(input.value));

  return card;
}

function updateCardDisplay(card, total, available) {
  const occupied = total - available;
  card.querySelector(".mh-occupied").textContent = occupied;
  card.querySelector(".mh-available").textContent = available;

  const pct = total ? Math.round((available / total) * 100) : 0;
  const fill = card.querySelector(".mh-progress-fill");
  fill.style.width = `${pct}%`;
  fill.classList.toggle("mh-critical", pct <= 10);
  fill.classList.toggle("mh-low", pct > 10 && pct <= 30);
}

function updateSaveBar() {
  const btn = document.getElementById("saveBedsBtn");
  const note = document.getElementById("saveBarNote");
  const count = Object.keys(pendingChanges).length;

  btn.disabled = count === 0;
  note.textContent = count === 0
    ? "No unsaved changes."
    : `${count} bed type${count > 1 ? "s" : ""} changed, not yet saved.`;
}

async function saveBedChanges() {
  const btn = document.getElementById("saveBedsBtn");
  const changes = { ...pendingChanges };
  const bedTypes = Object.keys(changes);
  if (bedTypes.length === 0) return;

  btn.disabled = true;
  btn.textContent = "Saving…";

  try {
    let latest = currentHospital;
    for (const bedType of bedTypes) {
      const { data, error } = await supabaseClient.rpc("adjust_bed_availability", {
        p_hospital_id: currentHospital.id,
        p_bed_type: bedType,
        p_new_available: changes[bedType]
      });
      if (error) throw error;
      latest = data;
    }

    await logAudit("update", "hospitals", currentHospital.id);

    currentHospital = latest;
    pendingChanges = {};
    renderDashboard(currentHospital);
    toast("Bed availability saved.", "success");
  } catch (err) {
    console.error("Failed to save bed availability:", err);
    toast(`Couldn't save: ${err.message || "unknown error"}`, "error");
  } finally {
    btn.textContent = "Save bed availability";
    updateSaveBar();
  }
}
