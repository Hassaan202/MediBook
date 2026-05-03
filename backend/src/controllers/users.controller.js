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

function clientMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
    userAgent: req.get("user-agent") || null,
  };
}

async function updateProfile(req, res, next) {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return errorResponse(
        res,
        ERROR_MESSAGES.NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    if (!user.isActive) {
      return errorResponse(
        res,
        ERROR_MESSAGES.USER_INACTIVE,
        HTTP_STATUS_CODES.FORBIDDEN
      );
    }
    const { name, avatar, phone, address, emergencyContact } = req.body;
    if (name !== undefined) user.name = name;
    if (avatar !== undefined) user.avatar = avatar;
    let patient = null;
    if (req.user.role === USER_ROLES.PATIENT) {
      patient = await Patient.findOne({ userId: user._id });
      if (patient) {
        if (phone !== undefined) patient.phone = phone;
        if (address !== undefined) {
          patient.address = {
            ...(patient.address?.toObject?.() || patient.address || {}),
            ...address,
          };
          patient.markModified("address");
        }
        if (emergencyContact !== undefined) {
          const ec =
            patient.emergencyContact?.toObject?.() ||
            patient.emergencyContact ||
            {};
          const merged = {
            name:
              emergencyContact.name !== undefined
                ? emergencyContact.name
                : ec.name,
            phone:
              emergencyContact.phone !== undefined
                ? emergencyContact.phone
                : ec.phone,
            relationship:
              emergencyContact.relationship !== undefined
                ? emergencyContact.relationship
                : ec.relationship,
          };
          if (!merged.name || !merged.phone) {
            return errorResponse(
              res,
              "Emergency contact name and phone are required",
              HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY
            );
          }
          patient.emergencyContact = merged;
          patient.markModified("emergencyContact");
        }
      }
    }
    await user.save();
    if (patient) {
      await patient.save();
    }
    await auditLogger({
      userId: user._id,
      action: AUDIT_ACTIONS.PROFILE_UPDATED,
      category: AUDIT_CATEGORIES.DATA,
      description: "Profile updated",
      resourceType: "user",
      resourceId: user._id,
      severity: "info",
      ...clientMeta(req),
    });
    const u = user.toObject();
    delete u.password;
    delete u.refreshToken;
    delete u.passwordResetToken;
    delete u.passwordResetExpires;
    let profile = null;
    if (user.role === USER_ROLES.PATIENT) {
      profile = await Patient.findOne({ userId: user._id })
        .populate({
          path: "userDetails",
          select:
            "email name avatar role isActive lastLogin createdAt updatedAt",
        })
        .lean({ virtuals: true });
    } else if (user.role === USER_ROLES.DOCTOR) {
      profile = await Doctor.findOne({ userId: user._id })
        .populate({
          path: "userDetails",
          select:
            "email name avatar role isActive lastLogin createdAt updatedAt",
        })
        .lean({ virtuals: true });
    }
    return successResponse(
      res,
      {
        user: {
          id: u._id,
          email: u.email,
          name: u.name,
          role: u.role,
          avatar: u.avatar,
          isActive: u.isActive,
          lastLogin: u.lastLogin,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        },
        profile,
      },
      "Profile updated"
    );
  } catch (err) {
    return next(err);
  }
}

async function adminSetUserActive(req, res, next) {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;
    if (String(userId) === String(req.user.userId)) {
      return errorResponse(
        res,
        "You cannot change your own active status here",
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
    const user = await User.findById(userId);
    if (!user) {
      return errorResponse(
        res,
        ERROR_MESSAGES.NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    user.isActive = Boolean(isActive);
    await user.save();
    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.USER_UPDATED,
      category: AUDIT_CATEGORIES.ADMIN,
      description: `Admin set user isActive=${user.isActive}`,
      resourceType: "user",
      resourceId: user._id,
      severity: "warning",
      details: { targetUserId: String(user._id), isActive: user.isActive },
      ...clientMeta(req),
    });
    return successResponse(res, {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { updateProfile, adminSetUserActive };
