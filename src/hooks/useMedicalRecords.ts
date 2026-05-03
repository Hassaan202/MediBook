import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { medicalRecordService } from "@/services/medicalRecordService";

export function useMedicalRecords(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ["medical-records", filters],
    queryFn: () => medicalRecordService.getRecords(filters),
  });
}

export function useMedicalRecord(id: string) {
  return useQuery({
    queryKey: ["medical-record", id],
    queryFn: () => medicalRecordService.getRecordById(id),
    enabled: !!id,
  });
}

export function useCreateRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => medicalRecordService.createRecord(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["medical-records"] });
    },
  });
}

export function usePatientHistory(patientId: string) {
  return useQuery({
    queryKey: ["patient-history", patientId],
    queryFn: () => medicalRecordService.getPatientHistory(patientId),
    enabled: !!patientId,
  });
}
