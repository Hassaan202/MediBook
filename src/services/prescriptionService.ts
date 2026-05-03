import { request } from "@/lib/http";

export const prescriptionService = {
  getPrescriptions: (filters: Record<string, unknown> = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== "") params.set(k, String(v));
    });
    return request(`/api/prescriptions?${params.toString()}`);
  },

  getPrescriptionById: (id: string) =>
    request(`/api/prescriptions/${id}`),

  createPrescription: (data: Record<string, unknown>) =>
    request("/api/prescriptions", { method: "POST", json: data }),

  getActivePrescriptions: (patientId: string) =>
    request(`/api/prescriptions?patientId=${patientId}&status=active`),
};

export default prescriptionService;
