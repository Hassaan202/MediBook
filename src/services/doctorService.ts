import { request } from "@/lib/http";

export interface DoctorFilters {
  specialty?: string;
  search?: string;
  available?: boolean;
  page?: number;
  limit?: number;
}

export const doctorService = {
  getAllDoctors: (filters: DoctorFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== "") params.set(k, String(v));
    });
    return request(`/api/doctors?${params.toString()}`);
  },

  getDoctorById: (id: string) =>
    request(`/api/doctors/${id}`),

  searchDoctors: (query: string) =>
    request(`/api/doctors?search=${encodeURIComponent(query)}`),

  getDoctorSchedule: (id: string, date: string) =>
    request(`/api/appointments/availability?doctorId=${id}&date=${date}`),

  updateProfile: (id: string, data: Record<string, unknown>) =>
    request(`/api/doctors/${id}`, { method: "PUT", json: data }),
};

export default doctorService;
