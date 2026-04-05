import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";

import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";

import PatientDashboard from "@/pages/patient/PatientDashboard";
import DoctorDirectory from "@/pages/patient/DoctorDirectory";
import AppointmentBooking from "@/pages/patient/AppointmentBooking";
import MedicalRecords from "@/pages/patient/MedicalRecords";

import DoctorDashboard from "@/pages/doctor/DoctorDashboard";
import ConsultationPage from "@/pages/doctor/ConsultationPage";
import ClinicalNotes from "@/pages/doctor/ClinicalNotes";
import PrescriptionCreation from "@/pages/doctor/PrescriptionCreation";

import AdminDashboard from "@/pages/admin/AdminDashboard";
import UserManagement from "@/pages/admin/UserManagement";
import AppointmentManagement from "@/pages/admin/AppointmentManagement";
import AuditLogs from "@/pages/admin/AuditLogs";

import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            
            <Route path="/patient" element={<DashboardLayout allowedRoles={["patient"]}><PatientDashboard /></DashboardLayout>} />
            <Route path="/patient/doctors" element={<DashboardLayout allowedRoles={["patient"]}><DoctorDirectory /></DashboardLayout>} />
            <Route path="/patient/appointments" element={<DashboardLayout allowedRoles={["patient"]}><AppointmentBooking /></DashboardLayout>} />
            <Route path="/patient/records" element={<DashboardLayout allowedRoles={["patient"]}><MedicalRecords /></DashboardLayout>} />

            
            <Route path="/doctor" element={<DashboardLayout allowedRoles={["doctor"]}><DoctorDashboard /></DashboardLayout>} />
            <Route path="/doctor/consultations" element={<DashboardLayout allowedRoles={["doctor"]}><ConsultationPage /></DashboardLayout>} />
            <Route path="/doctor/notes" element={<DashboardLayout allowedRoles={["doctor"]}><ClinicalNotes /></DashboardLayout>} />
            <Route path="/doctor/prescriptions" element={<DashboardLayout allowedRoles={["doctor"]}><PrescriptionCreation /></DashboardLayout>} />

            
            <Route path="/admin" element={<DashboardLayout allowedRoles={["admin"]}><AdminDashboard /></DashboardLayout>} />
            <Route path="/admin/users" element={<DashboardLayout allowedRoles={["admin"]}><UserManagement /></DashboardLayout>} />
            <Route path="/admin/appointments" element={<DashboardLayout allowedRoles={["admin"]}><AppointmentManagement /></DashboardLayout>} />
            <Route path="/admin/audit" element={<DashboardLayout allowedRoles={["admin"]}><AuditLogs /></DashboardLayout>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;