import { request } from "@/lib/http";

export const patientService = {
  getAllPatients: (filters: Record<string, unknown> = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== "") params.set(k, String(v));
    });
    return request(`/api/patients?${params.toString()}`);
  },

  getPatientById: (id: string) =>
    request(`/api/patients/${id}`),

  updateProfile: (id: string, data: Record<string, unknown>) =>
    request(`/api/patients/${id}`, { method: "PUT", json: data }),

  getMedicalHistory: (id: string) =>
    request(`/api/medical-records?patientId=${id}`),
};

export default patientService;
