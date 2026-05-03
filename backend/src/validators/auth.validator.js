const { body } = require("express-validator");
const { USER_ROLES } = require("../config/constants");

const PHONE_REGEX =
  /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;

function ageFromDob(d) {
  const birth = new Date(d);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

/** Self-service sign-up: patient or doctor only (not admin). */
const registerValidator = [
  body("email").isEmail().normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must be at least 8 characters and include uppercase, lowercase, and a number"
    ),
  body("name").trim().notEmpty(),
  body("role").isIn([USER_ROLES.PATIENT, USER_ROLES.DOCTOR]),
  body("specialty")
    .if(body("role").equals(USER_ROLES.DOCTOR))
    .trim()
    .notEmpty(),
  body("experience")
    .if(body("role").equals(USER_ROLES.DOCTOR))
    .isFloat({ min: 0 })
    .toFloat(),
  body("fees")
    .if(body("role").equals(USER_ROLES.DOCTOR))
    .isFloat({ min: 0 })
    .toFloat(),
  body("dateOfBirth")
    .if(body("role").equals(USER_ROLES.PATIENT))
    .isISO8601()
    .toDate()
    .custom((value) => {
      const age = ageFromDob(value);
      if (age < 0 || age > 150) {
        throw new Error("Invalid date of birth");
      }
      return true;
    }),
  body("gender")
    .if(body("role").equals(USER_ROLES.PATIENT))
    .isIn(["Male", "Female", "Other"]),
  body("bloodType")
    .if(body("role").equals(USER_ROLES.PATIENT))
    .isIn(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]),
  body("phone")
    .if(body("role").equals(USER_ROLES.PATIENT))
    .trim()
    .matches(PHONE_REGEX)
    .withMessage("Invalid phone number"),
  body("emergencyContact")
    .if(body("role").equals(USER_ROLES.PATIENT))
    .isObject()
    .custom((value) => {
      if (!value || !value.name || !value.phone) {
        throw new Error("emergencyContact name and phone are required");
      }
      if (!PHONE_REGEX.test(String(value.phone).trim())) {
        throw new Error("Invalid emergency contact phone");
      }
      return true;
    }),
];

const verifyEmailValidator = [body("token").trim().notEmpty()];

const resendVerificationValidator = [body("email").isEmail().normalizeEmail()];

const loginValidator = [
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty(),
];

const forgotPasswordValidator = [
  body("email").isEmail().normalizeEmail(),
];

const resetPasswordValidator = [
  body("token").trim().notEmpty(),
  body("password")
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must be at least 8 characters and include uppercase, lowercase, and a number"
    ),
];

const refreshTokenValidator = [
  body("refreshToken").trim().notEmpty(),
];

const updateProfileValidator = [
  body("name").optional().trim().notEmpty(),
  body("avatar").optional({ nullable: true }),
  body("phone")
    .optional()
    .trim()
    .matches(PHONE_REGEX)
    .withMessage("Invalid phone number"),
  body("address").optional().isObject(),
  body("emergencyContact").optional().isObject(),
  body().custom((value, { req }) => {
    const b = req.body || {};
    const keys = ["name", "avatar", "phone", "address", "emergencyContact"];
    if (!keys.some((k) => Object.prototype.hasOwnProperty.call(b, k))) {
      throw new Error("At least one profile field is required");
    }
    return true;
  }),
];

module.exports = {
  registerValidator,
  verifyEmailValidator,
  resendVerificationValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  refreshTokenValidator,
  updateProfileValidator,
};
