const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");
const { JWT_SECRET, JWT_EXPIRES_IN } = require("../config/env");
const { asyncHandler } = require("../middleware/errorHandler");

// POST /api/admin/login
const adminLogin = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Username and password are required." });
  }

  const { data: admin, error } = await supabase
    .from("admins")
    .select("id, username, name, password_hash")
    .eq("username", username)
    .maybeSingle();

  if (error) throw error;
  if (!admin) return res.status(401).json({ success: false, message: "Invalid admin credentials." });

  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) return res.status(401).json({ success: false, message: "Invalid admin credentials." });

  const token = jwt.sign({ id: admin.id, username: admin.username, role: "admin" }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });

  res.json({ success: true, message: "Admin login successful.", token, admin: { id: admin.id, name: admin.name } });
});

module.exports = { adminLogin };
