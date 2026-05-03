import { useQuery } from "@tanstack/react-query";
import { doctorService, DoctorFilters } from "@/services/doctorService";

export function useDoctors(filters: DoctorFilters = {}) {
  return useQuery({
    queryKey: ["doctors", filters],
    queryFn: () => doctorService.getAllDoctors(filters),
  });
}

export function useDoctor(id: string) {
  return useQuery({
    queryKey: ["doctor", id],
    queryFn: () => doctorService.getDoctorById(id),
    enabled: !!id,
  });
}

export function useDoctorSchedule(id: string, date: string) {
  return useQuery({
    queryKey: ["doctor-schedule", id, date],
    queryFn: () => doctorService.getDoctorSchedule(id, date),
    enabled: !!id && !!date,
  });
}
