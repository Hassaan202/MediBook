export type UserRole = "patient" | "doctor" | "admin";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string | null;
  patientProfileId?: string;
  doctorProfileId?: string;
}
