export type UserRole = "patient" | "doctor" | "admin";

export type RegistrationStatus =
  | "active"
  | "pending_verification"
  | "pending_approval"
  | "rejected";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string | null;
  patientProfileId?: string;
  doctorProfileId?: string;
  /** From `/api/auth/me` — useful for status UI */
  registrationStatus?: RegistrationStatus;
}
