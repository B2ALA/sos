const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");
const { JWT_SECRET, JWT_EXPIRES_IN } = require("../config/env");
const { asyncHandler } = require("../middleware/errorHandler");

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role || "user" },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const {
    username, password, name, age, dob, gender, address, district, state,
    pincode, bloodGroup, height, weight, mobile, alternateMobile, email,
    emergencyContactName, emergencyContactRelation, emergencyContactPhone,
    allergies, existingDiseases, currentMedicines, insurance
  } = req.body;

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .or(`username.eq.${username}${email ? `,email.eq.${email}` : ""}`)
    .maybeSingle();

  if (existing) {
    return res.status(409).json({ success: false, message: "Username or email already registered." });
  }

  const password_hash = await bcrypt.hash(password, 12);

  const { data: user, error } = await supabase
    .from("users")
    .insert({
      username, password_hash, name, age, dob, gender, address, district,
      state: state || "Tamil Nadu", pincode, blood_group: bloodGroup,
      height_cm: height, weight_kg: weight, mobile, alternate_mobile: alternateMobile,
      email, emergency_contact_name: emergencyContactName,
      emergency_contact_relation: emergencyContactRelation,
      emergency_contact_phone: emergencyContactPhone,
      allergies, existing_diseases: existingDiseases,
      current_medicines: currentMedicines, insurance_provider: insurance
    })
    .select("id, username, name, role")
    .single();

  if (error) throw error;

  const token = signToken(user);
  res.status(201).json({ success: true, message: "Registration successful.", token, user });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const { data: user, error } = await supabase
    .from("users")
    .select("id, username, name, password_hash, role")
    .eq("username", username)
    .maybeSingle();

  if (error) throw error;
  if (!user) return res.status(401).json({ success: false, message: "Invalid username or password." });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ success: false, message: "Invalid username or password." });

  const token = signToken(user);
  delete user.password_hash;
  res.json({ success: true, message: "Login successful.", token, user });
});

// GET /api/auth/me
const me = asyncHandler(async (req, res) => {
  const { data: user, error } = await supabase
    .from("users")
    .select("id, username, name, email, mobile, blood_group, district, role")
    .eq("id", req.user.id)
    .maybeSingle();

  if (error) throw error;
  res.json({ success: true, user });
});

module.exports = { register, login, me };
