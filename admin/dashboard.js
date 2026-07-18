/* =====================================================================
   dashboard.js
   MediHelp Admin Dashboard
===================================================================== */

let sosChannel = null;

(async function init() {
  const authResult = await requireAdmin();
  if (!authResult) return;

  renderSidebar("dashboard");
  renderNavbar("Dashboard", authResult.admin.email);
  renderFooter();

  await refreshDashboard();

  subscribeToRealtimeSOS();
})();

async function refreshDashboard() {
  await Promise.all([
    loadStats(),
    loadRecentSos()
  ]);
}

/* ---------------------------------------------------------------------
   Counts
--------------------------------------------------------------------- */

async function countRows(table, filter) {

  let query = supabaseClient
    .from(table)
    .select("*", {
      head: true,
      count: "exact"
    });

  if (filter) {
    query = filter(query);
  }

  const { count, error } = await query;

  if (error) {
    console.warn(error.message);
    return "—";
  }

  return count ?? 0;
}

/* ---------------------------------------------------------------------
   Dashboard Cards
--------------------------------------------------------------------- */

async function loadStats() {

  const [
    hospitals,
    doctors,
    bloodbanks,
    ambulances,
    volunteers,
    users,
    activeSOS
  ] = await Promise.all([

    countRows("hospitals"),

    countRows("doctors"),

    countRows("bloodbanks"),

    countRows("ambulances"),

    countRows("volunteers"),

    countRows("users"),

    countRows("sos_alerts",
      q => q.eq("status","active"))
  ]);

  const stats = [

    {
      label:"Hospitals",
      value:hospitals
    },

    {
      label:"Doctors",
      value:doctors
    },

    {
      label:"Blood Banks",
      value:bloodbanks
    },

    {
      label:"Ambulances",
      value:ambulances
    },

    {
      label:"Volunteers",
      value:volunteers
    },

    {
      label:"Users",
      value:users
    },

    {
      label:"Active SOS",
      value:activeSOS
    }

  ];

  document.getElementById("mh-stat-grid").innerHTML =
    stats.map(card=>`

      <div class="mh-stat-card">

        <div class="mh-stat-label">
          ${card.label}
        </div>

        <div class="mh-stat-value">
          ${card.value}
        </div>

      </div>

    `).join("");
}

/* ---------------------------------------------------------------------
   SOS Table
--------------------------------------------------------------------- */

async function loadRecentSos() {

  const tbody =
    document.getElementById("mh-recent-sos");

  const { data, error } =
    await supabaseClient

      .from("sos_alerts")

      .select("*")

      .eq("status","active")

      .order("created_at",{
        ascending:false
      })

      .limit(20);

  if(error){

    tbody.innerHTML=`

      <tr>

        <td colspan="4">

          Failed to load SOS Alerts

        </td>

      </tr>

    `;

    return;

  }

  if(!data.length){

    tbody.innerHTML=`

      <tr>

        <td colspan="4">

          No Active SOS Alerts

        </td>

      </tr>

    `;

    return;

  }

  tbody.innerHTML=data.map(row=>`

    <tr>

      <td>
        ${escapeHtml(row.emergency_type || "-")}
      </td>

      <td>

        ${
          row.lat && row.lng
          ? `${row.lat.toFixed(5)},
             ${row.lng.toFixed(5)}`
          : "-"
        }

      </td>

      <td>

        <span class="mh-badge mh-badge-red">

          Active

        </span>

      </td>

      <td>

        ${fmtDate(row.created_at)}

      </td>

    </tr>

  `).join("");

}

/* ---------------------------------------------------------------------
   Supabase Realtime
--------------------------------------------------------------------- */

function subscribeToRealtimeSOS(){

  sosChannel =
    supabaseClient

      .channel("admin-sos-live")

      .on(
        "postgres_changes",

        {

          event:"*",

          schema:"public",

          table:"sos_alerts"

        },

        async(payload)=>{

          console.log(
            "Realtime SOS:",
            payload
          );

          await refreshDashboard();

        }

      )

      .subscribe(status=>{

        console.log(
          "Realtime:",
          status
        );

      });

}

/* ---------------------------------------------------------------------
   Cleanup
--------------------------------------------------------------------- */

window.addEventListener("beforeunload",()=>{

  if(sosChannel){

    supabaseClient.removeChannel(
      sosChannel
    );

  }

});
