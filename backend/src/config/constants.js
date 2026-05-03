const USER_ROLES = {
  PATIENT: "patient",
  DOCTOR: "doctor",
  ADMIN: "admin",
};

const AUDIT_ACTIONS = {
  LOGIN: "login",
  LOGOUT: "logout",
  USER_CREATED: "user_created",
  USER_UPDATED: "user_updated",
  USER_DELETED: "user_deleted",
  PASSWORD_CHANGED: "password_changed",
  PROFILE_UPDATED: "profile_updated",
  APPOINTMENT_CREATED: "appointment_created",
  APPOINTMENT_UPDATED: "appointment_updated",
  APPOINTMENT_CANCELLED: "appointment_cancelled",
  MEDICAL_RECORD_CREATED: "medical_record_created",
  MEDICAL_RECORD_UPDATED: "medical_record_updated",
  MEDICAL_RECORD_VIEWED: "medical_record_viewed",
  PRESCRIPTION_CREATED: "prescription_created",
  PRESCRIPTION_UPDATED: "prescription_updated",
  REVIEW_CREATED: "review_created",
  REVIEW_UPDATED: "review_updated",
};

const AUDIT_CATEGORIES = {
  AUTH: "auth",
  DATA: "data",
  ADMIN: "admin",
  CLINICAL: "clinical",
  SYSTEM: "system",
};

const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
};

const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: "Invalid email or password",
  USER_INACTIVE: "Account is inactive",
  EMAIL_EXISTS: "Email already registered",
  NOT_FOUND: "Resource not found",
  UNAUTHORIZED: "Authentication required",
  FORBIDDEN: "Insufficient permissions",
  INVALID_TOKEN: "Invalid or expired token",
  VALIDATION_FAILED: "Validation failed",
  SERVER_ERROR: "Internal server error",
  RESET_TOKEN_INVALID: "Invalid or expired reset token",
  DOCTOR_NOT_FOUND: "Doctor not found",
  PATIENT_NOT_FOUND: "Patient not found",
  APPOINTMENT_NOT_FOUND: "Appointment not found",
  SLOT_NOT_AVAILABLE: "Time slot is not available",
  PAST_DATE_BOOKING: "Appointment date must be in the future",
  DUPLICATE_APPOINTMENT: "This slot is already booked",
  INVALID_TIME_SLOT: "Invalid time slot format",
  CANCELLATION_WINDOW_EXPIRED:
    "Cancellation must be at least 24 hours before the appointment",
  INVALID_STATUS_TRANSITION: "Invalid status transition",
  MEDICAL_RECORD_NOT_FOUND: "Medical record not found",
  PRESCRIPTION_NOT_FOUND: "Prescription not found",
  REVIEW_NOT_FOUND: "Review not found",
  INVALID_VITAL_SIGNS: "Invalid vital signs data",
  PRESCRIPTION_EXPIRED: "Prescription can no longer be edited",
  REVIEW_EXISTS: "A review already exists for this appointment",
  FILE_UPLOAD_INVALID: "Invalid file type or size",
  ADMIN_USER_ROLE_FORBIDDEN:
    "Administrator accounts cannot be created through this endpoint.",
  CREATE_USER_ROLE_INVALID:
    "Only patient and doctor accounts can be created here.",
  ADMIN_ACCOUNT_PROTECTED:
    "Administrator accounts cannot be changed or removed through this endpoint.",
  CANNOT_DELETE_SELF: "You cannot delete your own user account.",
  EMAIL_NOT_VERIFIED: "Please verify your email before signing in. Check your inbox for the verification link.",
  REGISTRATION_PENDING_APPROVAL:
    "Your email is verified. An administrator must approve your account before you can sign in.",
  REGISTRATION_REJECTED:
    "Your registration was not approved. Contact the clinic if you believe this is a mistake.",
  INVALID_VERIFICATION_TOKEN: "Invalid or expired email verification link.",
};

const APPOINTMENT_STATUS = {
  SCHEDULED: "scheduled",
  CONFIRMED: "confirmed",
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "no-show",
};

module.exports = {
  USER_ROLES,
  AUDIT_ACTIONS,
  AUDIT_CATEGORIES,
  HTTP_STATUS_CODES,
  ERROR_MESSAGES,
  APPOINTMENT_STATUS,
};
