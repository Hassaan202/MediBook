import { request } from "@/lib/http";

export interface AppointmentFilters {
  status?: string;
  doctorId?: string;
  patientId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export const appointmentService = {
  getAllAppointments: (filters: AppointmentFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== "") params.set(k, String(v));
    });
    return request(`/api/appointments?${params.toString()}`);
  },

  getAppointmentById: (id: string) =>
    request(`/api/appointments/${id}`),

  bookAppointment: (data: Record<string, unknown>) =>
    request("/api/appointments", { method: "POST", json: data }),

  updateAppointment: (id: string, data: Record<string, unknown>) =>
    request(`/api/appointments/${id}`, { method: "PUT", json: data }),

  cancelAppointment: (id: string, reason: string) =>
    request(`/api/appointments/${id}/cancel`, { method: "PATCH", json: { reason } }),

  rescheduleAppointment: (id: string, data: Record<string, unknown>) =>
    request(`/api/appointments/${id}/reschedule`, { method: "PATCH", json: data }),

  getUpcoming: () =>
    request("/api/appointments?status=scheduled&status=confirmed"),

  getPast: () =>
    request("/api/appointments?status=completed"),

  checkAvailability: (doctorId: string, date: string) =>
    request(`/api/appointments/availability?doctorId=${doctorId}&date=${date}`),
};

export default appointmentService;
