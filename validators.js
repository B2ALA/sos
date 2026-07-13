const { body, validationResult } = require("express-validator");

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: "Validation failed.", errors: errors.array() });
  }
  next();
}

const registerValidation = [
  body("username").trim().isLength({ min: 4 }).withMessage("Username must be at least 4 characters."),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters."),
  body("name").trim().notEmpty().withMessage("Name is required."),
  body("mobile").matches(/^[6-9]\d{9}$/).withMessage("Enter a valid 10-digit Indian mobile number."),
  body("email").optional({ checkFalsy: true }).isEmail().withMessage("Enter a valid email."),
  body("bloodGroup").optional({ checkFalsy: true }).isIn(["A+","A-","B+","B-","AB+","AB-","O+","O-"]),
  handleValidation
];

const loginValidation = [
  body("username").trim().notEmpty().withMessage("Username is required."),
  body("password").notEmpty().withMessage("Password is required."),
  handleValidation
];

const sosValidation = [
  body("latitude").isFloat({ min: -90, max: 90 }).withMessage("Valid latitude required."),
  body("longitude").isFloat({ min: -180, max: 180 }).withMessage("Valid longitude required."),
  body("emergencyType").trim().notEmpty().withMessage("Emergency type is required."),
  handleValidation
];

module.exports = { registerValidation, loginValidation, sosValidation, handleValidation };
