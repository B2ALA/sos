const supabase = require("../config/supabase");
const { asyncHandler } = require("../middleware/errorHandler");

// GET /api/admin/analytics — dashboard summary counts
const analytics = asyncHandler(async (req, res) => {
  const tables = ["users", "doctors", "pharmacies", "blood_donors", "volunteers", "shelters", "sos_events"];
  const counts = {};

  await Promise.all(
    tables.map(async (t) => {
      const { count, error } = await supabase.from(t).select("*", { count: "exact", head: true });
      if (error) throw error;
      counts[t] = count || 0;
    })
  );

  const { data: activeSOS } = await supabase.from("sos_events").select("id").in("status", ["active", "responding"]);
  const { data: recentSOS } = await supabase
    .from("sos_events")
    .select("*")
    .order("triggered_at", { ascending: false })
    .limit(10);

  res.json({
    success: true,
    counts,
    activeSOSCount: activeSOS?.length || 0,
    recentSOS: recentSOS || []
  });
});

// GET /api/admin/users — user management list
const listUsers = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from("users")
    .select("id, username, name, mobile, email, district, blood_group, role, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  res.json({ success: true, count: data.length, data });
});

// DELETE /api/admin/users/:id
const deleteUser = asyncHandler(async (req, res) => {
  const { error } = await supabase.from("users").delete().eq("id", req.params.id);
  if (error) throw error;
  res.json({ success: true, message: "User deleted." });
});

module.exports = { analytics, listUsers, deleteUser };
