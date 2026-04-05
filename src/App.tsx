import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";

import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";

import AdminDashboard from "@/pages/admin/AdminDashboard";
import UserManagement from "@/pages/admin/UserManagement";
import AppointmentManagement from "@/pages/admin/AppointmentManagement";
import AuditLogs from "@/pages/admin/AuditLogs";

import NotFound from "@/pages/NotFound";

// TODO: Add patient and doctor routes after team member completes those modules

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

            {/* Admin Module */}
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
