const supabase = require("../config/supabase");
const { asyncHandler } = require("../middleware/errorHandler");
const { distanceKm } = require("../utils/directoryFactory");

// Maps a free-text emergency type to the volunteer team best suited to respond
function mapEmergencyToTeam(emergencyType) {
  const type = emergencyType.toLowerCase();
  if (/fire|burn|explosion|gas leak/.test(type)) return "Fire";
  if (/flood|collapse|trapped|drown|accident|rescue/.test(type)) return "Rescue";
  return "Medical"; // default: heart attack, stroke, injury, etc.
}

// POST /api/sos/trigger
const triggerSOS = asyncHandler(async (req, res) => {
  const { latitude, longitude, emergencyType } = req.body;
  const userId = req.user?.id || null;

  const teamType = mapEmergencyToTeam(emergencyType);

  // Find the least-busy matching volunteer group
  const { data: groups, error: groupError } = await supabase
    .from("volunteer_groups")
    .select("id, group_name, team_type")
    .eq("team_type", teamType);
  if (groupError) throw groupError;
  const chosenGroup = groups?.[0] || null;

  const { data: sosEvent, error } = await supabase
    .from("sos_events")
    .insert({
      user_id: userId,
      emergency_type: emergencyType,
      latitude,
      longitude,
      status: "active",
      notified_volunteer_group: chosenGroup?.id || null
    })
    .select()
    .single();
  if (error) throw error;

  // Find nearest available volunteers in the matching team
  const { data: volunteers, error: volError } = await supabase
    .from("volunteers")
    .select("*")
    .eq("availability", "available");
  if (volError) throw volError;

  const nearestVolunteers = volunteers
    .filter((v) => v.group_id === chosenGroup?.id)
    .map((v) => ({
      ...v,
      distanceKm: v.latitude && v.longitude ? +distanceKm(latitude, longitude, v.latitude, v.longitude).toFixed(2) : null
    }))
    .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
    .slice(0, 5);

  // Find nearest hospitals (via doctors table's hospital+location, deduped)
  const { data: doctors } = await supabase.from("doctors").select("hospital, location, latitude, longitude").limit(500);
  const nearestHospitals = (doctors || [])
    .filter((d) => d.latitude && d.longitude)
    .map((d) => ({ ...d, distanceKm: +distanceKm(latitude, longitude, d.latitude, d.longitude).toFixed(2) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .filter((d, idx, arr) => arr.findIndex((x) => x.hospital === d.hospital) === idx)
    .slice(0, 5);

  // Emit real-time event to admin dashboard + volunteer app via Socket.IO
  const io = req.app.get("io");
  if (io) {
    io.emit("sos:new", { sosEvent, teamType, nearestVolunteers, nearestHospitals });
  }

  res.status(201).json({
    success: true,
    message: "Emergency activated. Nearby volunteers and hospitals notified.",
    sosEvent,
    respondingTeam: teamType,
    nearestVolunteers,
    nearestHospitals
  });
});

// POST /api/sos/:id/ping — live location update while SOS is active
const pingLocation = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.body;
  const { data, error } = await supabase
    .from("sos_location_pings")
    .insert({ sos_id: req.params.id, latitude, longitude })
    .select()
    .single();
  if (error) throw error;

  const io = req.app.get("io");
  if (io) io.emit(`sos:ping:${req.params.id}`, data);

  res.status(201).json({ success: true, data });
});

// GET /api/sos/:id — status + latest location for the live tracking screen
const getSOS = asyncHandler(async (req, res) => {
  const { data: sosEvent, error } = await supabase.from("sos_events").select("*").eq("id", req.params.id).maybeSingle();
  if (error) throw error;
  if (!sosEvent) return res.status(404).json({ success: false, message: "SOS event not found." });

  const { data: pings } = await supabase
    .from("sos_location_pings")
    .select("*")
    .eq("sos_id", req.params.id)
    .order("recorded_at", { ascending: false })
    .limit(20);

  res.json({ success: true, sosEvent, pings: pings || [] });
});

// PATCH /api/sos/:id/status — admin/volunteer updates status
const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body; // active | responding | resolved | cancelled
  const patch = { status };
  if (status === "resolved") patch.resolved_at = new Date().toISOString();

  const { data, error } = await supabase.from("sos_events").update(patch).eq("id", req.params.id).select().single();
  if (error) throw error;

  const io = req.app.get("io");
  if (io) io.emit("sos:statusUpdate", data);

  res.json({ success: true, data });
});

// GET /api/sos/active — for admin dashboard
const listActive = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from("sos_events")
    .select("*")
    .in("status", ["active", "responding"])
    .order("triggered_at", { ascending: false });
  if (error) throw error;
  res.json({ success: true, count: data.length, data });
});

module.exports = { triggerSOS, pingLocation, getSOS, updateStatus, listActive };
