const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { hashPassword } = require("../utils/passwordHasher");
const {
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_EXPIRE,
  JWT_REFRESH_EXPIRE,
} = require("../config/env");
const { USER_ROLES } = require("../config/constants");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      required: true,
      enum: [USER_ROLES.PATIENT, USER_ROLES.DOCTOR, USER_ROLES.ADMIN],
    },
    name: { type: String, required: true, trim: true },
    avatar: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date, default: null },
    refreshToken: { type: String, default: null, select: false },
    passwordResetToken: { type: String, default: null, select: false },
    passwordResetExpires: { type: Date, default: null, select: false },
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

userSchema.pre("save", async function hashPasswordPreSave(next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await hashPassword(this.password);
  return next();
});

userSchema.methods.comparePassword = async function comparePasswordMethod(
  candidatePassword
) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateAuthToken = function generateAuthTokenMethod() {
  return jwt.sign(
    { sub: this._id.toString(), role: this.role, type: "access" },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE }
  );
};

userSchema.methods.generateRefreshToken =
  function generateRefreshTokenMethod() {
    return jwt.sign(
      { sub: this._id.toString(), type: "refresh" },
      JWT_REFRESH_SECRET,
      { expiresIn: JWT_REFRESH_EXPIRE }
    );
  };

const User = mongoose.model("User", userSchema);

module.exports = User;
