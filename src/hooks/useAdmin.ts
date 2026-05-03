import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminService, AdminUserFilters } from "@/services/adminService";

export function useDashboard() {
  return useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => adminService.getDashboard(),
  });
}

export function useAdminUsers(filters: AdminUserFilters = {}) {
  return useQuery({
    queryKey: ["admin-users", filters],
    queryFn: () => adminService.getUsers(filters),
  });
}

export function useAuditLogs(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ["admin-audit-logs", filters],
    queryFn: () => adminService.getAuditLogs(filters),
  });
}

export function useStatistics() {
  return useQuery({
    queryKey: ["admin-statistics"],
    queryFn: () => adminService.getStatistics(),
  });
}

export function useSystemHealth() {
  return useQuery({
    queryKey: ["admin-health"],
    queryFn: () => adminService.getSystemHealth(),
    refetchInterval: 60_000,
  });
}

export function useAdminDashboardAnalytics() {
  return useQuery({
    queryKey: ["analytics-dashboard"],
    queryFn: () => adminService.getDashboardAnalytics(),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, hard }: { id: string; hard?: boolean }) =>
      adminService.deleteUser(id, hard),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

export function useToggleUserActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? adminService.activateUser(id) : adminService.deactivateUser(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}
