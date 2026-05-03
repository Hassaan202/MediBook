const crypto = require("crypto");
const User = require("../models/User");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const { auditLogger } = require("../middleware/logger");
const { successResponse, errorResponse } = require("../utils/responseHandler");
const {
  HTTP_STATUS_CODES,
  ERROR_MESSAGES,
  USER_ROLES,
  AUDIT_ACTIONS,
  AUDIT_CATEGORIES,
} = require("../config/constants");
const { verifyRefreshToken } = require("../utils/tokenGenerator");
const { NODE_ENV, FRONTEND_URL } = require("../config/env");
const {
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
  mailConfigured,
} = require("../services/emailService");

/**
 * Extracts meta information relating to the user's connection.
 */
function clientMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
    userAgent: req.get("user-agent") || null,
  };
}

/**
 * Hashes a reset token for secure comparison.
 */
function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function registrationStatus(user) {
  if (user.role === USER_ROLES.ADMIN) return "active";
  if (user.registrationRejectedAt) return "rejected";
  if (user.emailVerified === false) return "pending_verification";
  if (user.registrationApproved === false) return "pending_approval";
  return "active";
}

function defaultDoctorWorkingHours() {
  const day = () => ({ start: "09:00", end: "17:00" });
  return {
    monday: day(),
    tuesday: day(),
    wednesday: day(),
    thursday: day(),
    friday: day(),
    saturday: day(),
    sunday: day(),
  };
}

async function buildUserPayload(userDoc) {
  const u = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  delete u.password;
  delete u.refreshToken;
  delete u.passwordResetToken;
  delete u.passwordResetExpires;
  const base = {
    id: u._id,
    email: u.email,
    name: u.name,
    role: u.role,
    avatar: u.avatar,
    isActive: u.isActive,
    lastLogin: u.lastLogin,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    registrationStatus: registrationStatus(u),
  };
  let profile = null;
  if (u.role === USER_ROLES.DOCTOR) {
    profile = await Doctor.findOne({ userId: u._id })
      .populate({
        path: "userDetails",
        select: "email name avatar role isActive lastLogin createdAt updatedAt",
      })
      .lean({ virtuals: true });
  } else if (u.role === USER_ROLES.PATIENT) {
    profile = await Patient.findOne({ userId: u._id })
      .populate({
        path: "userDetails",
        select: "email name avatar role isActive lastLogin createdAt updatedAt",
      })
      .lean({ virtuals: true });
  }
  return { user: base, profile };
}

async function register(req, res, next) {
  try {
    const {
      email,
      password,
      name,
      role,
      specialty,
      experience,
      fees,
      dateOfBirth,
      gender,
      bloodType,
      phone,
      emergencyContact,
      address,
    } = req.body;

    if (role === USER_ROLES.ADMIN) {
      return errorResponse(res, ERROR_MESSAGES.ADMIN_USER_ROLE_FORBIDDEN, HTTP_STATUS_CODES.BAD_REQUEST);
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return errorResponse(res, ERROR_MESSAGES.EMAIL_EXISTS, HTTP_STATUS_CODES.CONFLICT);
    }

    const rawVerify = crypto.randomBytes(32).toString("hex");
    const verifyHash = hashResetToken(rawVerify);
    const verifyExpires = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const user = await User.create({
      email,
      password,
      name,
      role,
      emailVerified: false,
      registrationApproved: false,
      registrationRejectedAt: null,
      emailVerificationToken: verifyHash,
      emailVerificationExpires: verifyExpires,
    });

    try {
      if (role === USER_ROLES.DOCTOR) {
        await Doctor.create({
          userId: user._id,
          specialty: String(specialty).trim(),
          experience: Number(experience),
          fees: Number(fees),
          workingHours: defaultDoctorWorkingHours(),
          availableSlots: [],
        });
      } else if (role === USER_ROLES.PATIENT) {
        await Patient.create({
          userId: user._id,
          dateOfBirth: new Date(dateOfBirth),
          gender,
          bloodType,
          phone: String(phone).trim(),
          address: address && typeof address === "object" ? address : {},
          emergencyContact: {
            name: String(emergencyContact.name).trim(),
            phone: String(emergencyContact.phone).trim(),
            relationship: emergencyContact.relationship
              ? String(emergencyContact.relationship).trim()
              : "Family",
          },
        });
      }
    } catch (innerErr) {
      await User.deleteOne({ _id: user._id });
      throw innerErr;
    }

    const verifyUrl = `${FRONTEND_URL}/verify-email?token=${encodeURIComponent(rawVerify)}`;
    await sendEmailVerificationEmail({ name: user.name, email: user.email }, verifyUrl);

    await auditLogger({
      userId: user._id,
      action: AUDIT_ACTIONS.USER_CREATED,
      category: AUDIT_CATEGORIES.AUTH,
      description: "Self-registration (pending email verification)",
      resourceType: "user",
      resourceId: user._id,
      severity: "info",
      ...clientMeta(req),
    });

    const extra =
      NODE_ENV !== "production" && !mailConfigured()
        ? { verificationUrlForDevelopment: verifyUrl }
        : null;

    return successResponse(
      res,
      {
        message:
          "Account created. Check your email to verify your address, then wait for an administrator to approve your account.",
        ...extra,
      },
      "Registration successful",
      HTTP_STATUS_CODES.CREATED
    );
  } catch (err) {
    return next(err);
  }
}

async function verifyEmail(req, res, next) {
  try {
    const { token } = req.body;
    const hashed = hashResetToken(token);
    const user = await User.findOne({
      emailVerificationToken: hashed,
      emailVerificationExpires: { $gt: new Date() },
    }).select("+emailVerificationToken +emailVerificationExpires");

    if (!user) {
      return errorResponse(res, ERROR_MESSAGES.INVALID_VERIFICATION_TOKEN, HTTP_STATUS_CODES.BAD_REQUEST);
    }

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    await auditLogger({
      userId: user._id,
      action: AUDIT_ACTIONS.PROFILE_UPDATED,
      category: AUDIT_CATEGORIES.AUTH,
      description: "Email address verified",
      resourceType: "user",
      resourceId: user._id,
      severity: "info",
      ...clientMeta(req),
    });

    return successResponse(res, null, "Email verified. You can sign in once an administrator approves your account.");
  } catch (err) {
    return next(err);
  }
}

async function resendVerification(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email }).select("+emailVerificationToken +emailVerificationExpires");
    const privacyMsg =
      "If an account exists and still needs verification, a new email has been sent.";

    if (!user || user.role === USER_ROLES.ADMIN) {
      return successResponse(res, null, privacyMsg);
    }
    if (user.registrationRejectedAt || user.emailVerified !== false) {
      return successResponse(res, null, privacyMsg);
    }

    const rawVerify = crypto.randomBytes(32).toString("hex");
    user.emailVerificationToken = hashResetToken(rawVerify);
    user.emailVerificationExpires = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await user.save();

    const verifyUrl = `${FRONTEND_URL}/verify-email?token=${encodeURIComponent(rawVerify)}`;
    await sendEmailVerificationEmail({ name: user.name, email: user.email }, verifyUrl);

    return successResponse(res, { emailed: true }, privacyMsg);
  } catch (err) {
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return errorResponse(
        res,
        ERROR_MESSAGES.INVALID_CREDENTIALS,
        HTTP_STATUS_CODES.UNAUTHORIZED
      );
    }
    if (!user.isActive) {
      return errorResponse(
        res,
        ERROR_MESSAGES.USER_INACTIVE,
        HTTP_STATUS_CODES.FORBIDDEN
      );
    }
    if (user.role !== USER_ROLES.ADMIN) {
      if (user.registrationRejectedAt) {
        return errorResponse(
          res,
          ERROR_MESSAGES.REGISTRATION_REJECTED,
          HTTP_STATUS_CODES.FORBIDDEN
        );
      }
      if (user.emailVerified === false) {
        return errorResponse(
          res,
          ERROR_MESSAGES.EMAIL_NOT_VERIFIED,
          HTTP_STATUS_CODES.FORBIDDEN
        );
      }
      if (user.registrationApproved === false) {
        return errorResponse(
          res,
          ERROR_MESSAGES.REGISTRATION_PENDING_APPROVAL,
          HTTP_STATUS_CODES.FORBIDDEN
        );
      }
    }
    const ok = await user.comparePassword(password);
    if (!ok) {
      return errorResponse(
        res,
        ERROR_MESSAGES.INVALID_CREDENTIALS,
        HTTP_STATUS_CODES.UNAUTHORIZED
      );
    }
    const accessToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();
    user.lastLogin = new Date();
    user.refreshToken = refreshToken;
    await user.save();
    await auditLogger({
      userId: user._id,
      action: AUDIT_ACTIONS.LOGIN,
      category: AUDIT_CATEGORIES.AUTH,
      description: "User logged in",
      severity: "info",
      ...clientMeta(req),
    });
    const payload = await buildUserPayload(user);
    return successResponse(res, {
      ...payload,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    return next(err);
  }
}

async function logout(req, res, next) {
  try {
    await User.findByIdAndUpdate(req.user.userId, { refreshToken: null });
    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.LOGOUT,
      category: AUDIT_CATEGORIES.AUTH,
      description: "User logged out",
      severity: "info",
      ...clientMeta(req),
    });
    return successResponse(res, null, "Logged out successfully");
  } catch (err) {
    return next(err);
  }
}

async function refreshToken(req, res, next) {
  try {
    const { refreshToken: token } = req.body;
    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      return errorResponse(
        res,
        ERROR_MESSAGES.INVALID_TOKEN,
        HTTP_STATUS_CODES.UNAUTHORIZED
      );
    }
    if (decoded.type !== "refresh") {
      return errorResponse(
        res,
        ERROR_MESSAGES.INVALID_TOKEN,
        HTTP_STATUS_CODES.UNAUTHORIZED
      );
    }
    const user = await User.findById(decoded.sub).select("+refreshToken");
    if (!user || !user.refreshToken || user.refreshToken !== token) {
      return errorResponse(
        res,
        ERROR_MESSAGES.INVALID_TOKEN,
        HTTP_STATUS_CODES.UNAUTHORIZED
      );
    }
    if (!user.isActive) {
      return errorResponse(
        res,
        ERROR_MESSAGES.USER_INACTIVE,
        HTTP_STATUS_CODES.FORBIDDEN
      );
    }
    if (user.role !== USER_ROLES.ADMIN) {
      if (user.registrationRejectedAt) {
        return errorResponse(
          res,
          ERROR_MESSAGES.REGISTRATION_REJECTED,
          HTTP_STATUS_CODES.FORBIDDEN
        );
      }
      if (user.emailVerified === false) {
        return errorResponse(
          res,
          ERROR_MESSAGES.EMAIL_NOT_VERIFIED,
          HTTP_STATUS_CODES.FORBIDDEN
        );
      }
      if (user.registrationApproved === false) {
        return errorResponse(
          res,
          ERROR_MESSAGES.REGISTRATION_PENDING_APPROVAL,
          HTTP_STATUS_CODES.FORBIDDEN
        );
      }
    }
    const accessToken = user.generateAuthToken();
    return successResponse(res, { accessToken }, "Token refreshed");
  } catch (err) {
    return next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    const message =
      "If an account exists for this email, password reset instructions have been sent";
    if (!user) {
      return successResponse(res, null, message);
    }
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashed = hashResetToken(resetToken);
    user.passwordResetToken = hashed;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    const resetLink = `${FRONTEND_URL}/login?resetToken=${encodeURIComponent(resetToken)}`;
    await sendPasswordResetEmail({ name: user.name, email: user.email }, resetLink);
    const data =
      NODE_ENV !== "production"
        ? { resetTokenForDevelopment: resetToken }
        : null;
    return successResponse(res, data, message);
  } catch (err) {
    return next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    const hashed = hashResetToken(token);
    const user = await User.findOne({
      passwordResetToken: hashed,
      passwordResetExpires: { $gt: new Date() },
    }).select("+passwordResetToken +passwordResetExpires");
    if (!user) {
      return errorResponse(
        res,
        ERROR_MESSAGES.RESET_TOKEN_INVALID,
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
    user.password = password;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    user.refreshToken = null;
    await user.save();
    await auditLogger({
      userId: user._id,
      action: AUDIT_ACTIONS.PASSWORD_CHANGED,
      category: AUDIT_CATEGORIES.AUTH,
      description: "Password reset completed",
      severity: "warning",
      ...clientMeta(req),
    });
    return successResponse(res, null, "Password reset successful");
  } catch (err) {
    return next(err);
  }
}

async function getCurrentUser(req, res, next) {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return errorResponse(
        res,
        ERROR_MESSAGES.NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    const payload = await buildUserPayload(user);
    return successResponse(res, payload, "Current user");
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  register,
  verifyEmail,
  resendVerification,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  getCurrentUser,
};
