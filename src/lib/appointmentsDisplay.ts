import { format } from "date-fns";

export type PopulatedUser = { name?: string; email?: string };

export type AppointmentApi = {
  _id: string;
  appointmentDate: string;
  timeSlot: string;
  status: string;
  type?: string;
  symptoms?: string;
  notes?: string;
  amount?: number;
  patientDetails?: { userDetails?: PopulatedUser };
  doctorDetails?: { userDetails?: PopulatedUser; specialty?: string };
};

export function appointmentDoctorName(a: AppointmentApi): string {
  return a.doctorDetails?.userDetails?.name || "Doctor";
}

export function appointmentPatientName(a: AppointmentApi): string {
  return a.patientDetails?.userDetails?.name || "Patient";
}

export function appointmentDoctorSpecialty(a: AppointmentApi): string {
  return a.doctorDetails?.specialty || "";
}

export function formatAppointmentDate(iso: string): string {
  try {
    return format(new Date(iso), "MMM d, yyyy");
  } catch {
    return iso;
  }
}
