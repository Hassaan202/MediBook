export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  experience: number;
  fees: number;
  avatar: string;
  available: boolean;
  availableSlots: string[];
}

export const doctors: Doctor[] = [
  { id: "d1", name: "Dr. Michael Chen", specialty: "Cardiology", rating: 4.8, experience: 15, fees: 150, avatar: "MC", available: true, availableSlots: ["9:00 AM", "10:00 AM", "2:00 PM", "3:00 PM"] },
  { id: "d2", name: "Dr. Emily Rodriguez", specialty: "Dermatology", rating: 4.9, experience: 12, fees: 120, avatar: "ER", available: true, availableSlots: ["10:00 AM", "11:00 AM", "1:00 PM"] },
  { id: "d3", name: "Dr. James Wilson", specialty: "Orthopedics", rating: 4.7, experience: 20, fees: 180, avatar: "JW", available: false, availableSlots: [] },
  { id: "d4", name: "Dr. Priya Patel", specialty: "Pediatrics", rating: 4.9, experience: 10, fees: 100, avatar: "PP", available: true, availableSlots: ["9:00 AM", "11:00 AM", "3:00 PM", "4:00 PM"] },
  { id: "d5", name: "Dr. Robert Kim", specialty: "Neurology", rating: 4.6, experience: 18, fees: 200, avatar: "RK", available: true, availableSlots: ["10:00 AM", "2:00 PM"] },
  { id: "d6", name: "Dr. Lisa Chang", specialty: "Cardiology", rating: 4.8, experience: 14, fees: 160, avatar: "LC", available: true, availableSlots: ["9:00 AM", "1:00 PM", "4:00 PM"] },
];

export type AppointmentStatus = "upcoming" | "completed" | "cancelled";

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  notes?: string;
}

export const appointments: Appointment[] = [
  { id: "a1", patientId: "p1", patientName: "Sarah Johnson", doctorId: "d1", doctorName: "Dr. Michael Chen", specialty: "Cardiology", date: "2026-04-05", time: "10:00 AM", status: "upcoming" },
  { id: "a2", patientId: "p1", patientName: "Sarah Johnson", doctorId: "d2", doctorName: "Dr. Emily Rodriguez", specialty: "Dermatology", date: "2026-04-08", time: "2:00 PM", status: "upcoming" },
  { id: "a3", patientId: "p1", patientName: "Sarah Johnson", doctorId: "d4", doctorName: "Dr. Priya Patel", specialty: "Pediatrics", date: "2026-03-20", time: "9:00 AM", status: "completed", notes: "Routine checkup. All vitals normal." },
  { id: "a4", patientId: "p2", patientName: "John Smith", doctorId: "d1", doctorName: "Dr. Michael Chen", specialty: "Cardiology", date: "2026-04-06", time: "11:00 AM", status: "upcoming" },
  { id: "a5", patientId: "p3", patientName: "Maria Garcia", doctorId: "d5", doctorName: "Dr. Robert Kim", specialty: "Neurology", date: "2026-04-03", time: "10:00 AM", status: "upcoming" },
  { id: "a6", patientId: "p2", patientName: "John Smith", doctorId: "d2", doctorName: "Dr. Emily Rodriguez", specialty: "Dermatology", date: "2026-03-15", time: "1:00 PM", status: "completed" },
];

export interface MedicalRecord {
  id: string;
  patientId: string;
  date: string;
  diagnosis: string;
  clinicalNotes: string;
  doctor: string;
  prescriptions: Prescription[];
}

export interface Prescription {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export const medicalRecords: MedicalRecord[] = [
  {
    id: "mr1", patientId: "p1", date: "2026-03-20", diagnosis: "Seasonal Allergies", clinicalNotes: "Patient presents with nasal congestion and sneezing. No fever.", doctor: "Dr. Priya Patel",
    prescriptions: [
      { id: "rx1", medication: "Cetirizine", dosage: "10mg", frequency: "Once daily", duration: "30 days", instructions: "Take at bedtime" },
    ],
  },
  {
    id: "mr2", patientId: "p1", date: "2026-02-10", diagnosis: "Hypertension - Stage 1", clinicalNotes: "BP reading 142/90. Started on medication. Follow-up in 4 weeks.", doctor: "Dr. Michael Chen",
    prescriptions: [
      { id: "rx2", medication: "Lisinopril", dosage: "10mg", frequency: "Once daily", duration: "90 days", instructions: "Take in the morning with water" },
      { id: "rx3", medication: "Aspirin", dosage: "81mg", frequency: "Once daily", duration: "90 days", instructions: "Take with food" },
    ],
  },
];

export interface PatientProfile {
  id: string;
  name: string;
  age: number;
  gender: string;
  bloodType: string;
  allergies: string[];
  conditions: string[];
  phone: string;
  email: string;
  emergencyContact: string;
}

export const patientProfiles: PatientProfile[] = [
  { id: "p1", name: "Sarah Johnson", age: 34, gender: "Female", bloodType: "A+", allergies: ["Penicillin", "Peanuts"], conditions: ["Hypertension", "Seasonal Allergies"], phone: "(555) 123-4567", email: "sarah.j@email.com", emergencyContact: "Tom Johnson - (555) 987-6543" },
  { id: "p2", name: "John Smith", age: 45, gender: "Male", bloodType: "O-", allergies: ["Sulfa drugs"], conditions: ["Type 2 Diabetes"], phone: "(555) 234-5678", email: "john.s@email.com", emergencyContact: "Jane Smith - (555) 876-5432" },
  { id: "p3", name: "Maria Garcia", age: 28, gender: "Female", bloodType: "B+", allergies: [], conditions: ["Migraine"], phone: "(555) 345-6789", email: "maria.g@email.com", emergencyContact: "Carlos Garcia - (555) 765-4321" },
];

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
  type: "auth" | "data" | "admin" | "clinical";
}

export const auditLogs: AuditLog[] = [
  { id: "al1", userId: "a1", userName: "Admin User", action: "User Suspended", details: "Suspended user account: test_user@email.com", timestamp: "2026-04-01 09:15:00", type: "admin" },
  { id: "al2", userId: "d1", userName: "Dr. Michael Chen", action: "Prescription Created", details: "Created prescription for patient Sarah Johnson", timestamp: "2026-04-01 10:30:00", type: "clinical" },
  { id: "al3", userId: "p1", userName: "Sarah Johnson", action: "Appointment Booked", details: "Booked appointment with Dr. Emily Rodriguez", timestamp: "2026-04-01 11:00:00", type: "data" },
  { id: "al4", userId: "d2", userName: "Dr. Emily Rodriguez", action: "Login", details: "Successful login from 192.168.1.45", timestamp: "2026-04-01 08:00:00", type: "auth" },
  { id: "al5", userId: "a1", userName: "Admin User", action: "User Deleted", details: "Deleted inactive user: old_user@email.com", timestamp: "2026-03-31 16:45:00", type: "admin" },
  { id: "al6", userId: "p2", userName: "John Smith", action: "Record Accessed", details: "Viewed medical records", timestamp: "2026-03-31 14:20:00", type: "data" },
];

export const adminStats = {
  totalPatients: 1243,
  totalDoctors: 56,
  totalAppointments: 3847,
  activeAppointments: 128,
  revenue: 284500,
  satisfactionRate: 94.2,
};
