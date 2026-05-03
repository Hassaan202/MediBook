import { request } from "@/lib/http";

export const medicalRecordService = {
  getRecords: (filters: Record<string, unknown> = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== "") params.set(k, String(v));
    });
    return request(`/api/medical-records?${params.toString()}`);
  },

  getRecordById: (id: string) =>
    request(`/api/medical-records/${id}`),

  createRecord: (data: Record<string, unknown>) =>
    request("/api/medical-records", { method: "POST", json: data }),

  updateRecord: (id: string, data: Record<string, unknown>) =>
    request(`/api/medical-records/${id}`, { method: "PUT", json: data }),

  getPatientHistory: (patientId: string) =>
    request(`/api/medical-records?patientId=${patientId}`),
};

export default medicalRecordService;
