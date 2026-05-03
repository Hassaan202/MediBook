import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { prescriptionService } from "@/services/prescriptionService";

export function usePrescriptions(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ["prescriptions", filters],
    queryFn: () => prescriptionService.getPrescriptions(filters),
  });
}

export function usePrescription(id: string) {
  return useQuery({
    queryKey: ["prescription", id],
    queryFn: () => prescriptionService.getPrescriptionById(id),
    enabled: !!id,
  });
}

export function useCreatePrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => prescriptionService.createPrescription(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["prescriptions"] });
    },
  });
}
