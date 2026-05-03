import { request } from "@/lib/http";

export interface AdminUserFilters {
  role?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export const adminService = {
  getDashboard: () =>
    request("/api/admin/dashboard"),

  getUsers: (filters: AdminUserFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== "") params.set(k, String(v));
    });
    return request(`/api/admin/users?${params.toString()}`);
  },

  getUserById: (id: string) =>
    request(`/api/admin/users/${id}`),

  createUser: (data: Record<string, unknown>) =>
    request("/api/admin/users", { method: "POST", json: data }),

  updateUser: (id: string, data: Record<string, unknown>) =>
    request(`/api/admin/users/${id}`, { method: "PUT", json: data }),

  deleteUser: (id: string, hard = false) =>
    request(`/api/admin/users/${id}?hard=${hard}`, { method: "DELETE" }),

  activateUser: (id: string) =>
    request(`/api/admin/users/${id}/activate`, { method: "PATCH", json: {} }),

  deactivateUser: (id: string) =>
    request(`/api/admin/users/${id}/deactivate`, { method: "PATCH", json: {} }),

  resetPassword: (id: string) =>
    request(`/api/admin/users/${id}/reset-password`, { method: "PATCH", json: {} }),

  getAuditLogs: (filters: Record<string, unknown> = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== "") params.set(k, String(v));
    });
    return request(`/api/admin/audit-logs?${params.toString()}`);
  },

  getActivityLogs: (filters: Record<string, unknown> = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== "") params.set(k, String(v));
    });
    return request(`/api/admin/activity-logs?${params.toString()}`);
  },

  getStatistics: () =>
    request("/api/admin/statistics"),

  getAppointmentReport: (filters: Record<string, unknown> = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== "") params.set(k, String(v));
    });
    return request(`/api/admin/reports/appointments?${params.toString()}`);
  },

  getDoctorReport: () =>
    request("/api/admin/reports/doctors"),

  getPatientReport: () =>
    request("/api/admin/reports/patients"),

  getSystemHealth: () =>
    request("/api/admin/system-health"),

  sendAnnouncement: (data: { title: string; message: string; role?: string; priority?: string }) =>
    request("/api/admin/announcements", { method: "POST", json: data }),

  getDashboardAnalytics: () =>
    request("/api/analytics/dashboard"),

  getTrends: (days = 30) =>
    request(`/api/analytics/trends?days=${days}`),

  getSpecialtyAnalytics: () =>
    request("/api/analytics/specialties"),
};

export default adminService;
