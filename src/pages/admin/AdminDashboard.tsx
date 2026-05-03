import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, Activity, FileText, Pill, Info } from "lucide-react";
import { request } from "@/lib/http";
import { format } from "date-fns";

type DashboardPayload = {
  users: { total: number; active: number; byRole: Record<string, number> };
  doctors: { total: number; active: number; inactive: number };
  patients: { total: number };
  appointments: {
    total: number;
    scheduled: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    byStatus: Record<string, number>;
  };
  medicalRecords: { total: number };
  prescriptions: { active: number };
  recentActivity: {
    id: string;
    action: string;
    category: string;
    description?: string;
    user: { name?: string; email?: string } | null;
    timestamp: string;
    severity?: string;
  }[];
  revenue?: { placeholder?: boolean; note?: string };
};

export default function AdminDashboard() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => request<DashboardPayload>("/api/admin/dashboard"),
  });

  const u = data?.users;
  const ap = data?.appointments;
  const recent = data?.recentActivity ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Admin dashboard</h2>
        <p className="text-muted-foreground">
          {isLoading ? "Loading…" : isError ? (error instanceof Error ? error.message : "Failed to load") : "Aggregated data from the MediBook API"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Patients" value={data?.patients?.total ?? 0} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Doctors" value={data?.doctors?.total ?? 0} icon={<Activity className="h-5 w-5" />} />
        <StatCard title="Appointments" value={ap?.total ?? 0} icon={<Calendar className="h-5 w-5" />} />
        <StatCard title="Scheduled / confirmed" value={ap?.scheduled ?? 0} icon={<Calendar className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Users (total)" value={u?.total ?? 0} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Active users (30d)" value={u?.active ?? 0} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Medical records" value={data?.medicalRecords?.total ?? 0} icon={<FileText className="h-5 w-5" />} />
        <StatCard title="Active prescriptions" value={data?.prescriptions?.active ?? 0} icon={<Pill className="h-5 w-5" />} />
      </div>

      {data?.revenue?.placeholder && (
        <Card className="border-dashed">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base font-medium">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{data.revenue.note ?? "Not connected to billing data yet."}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent system activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-left">
                  <th className="pb-2 font-medium">User</th>
                  <th className="pb-2 font-medium">Action</th>
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((row) => (
                  <tr key={String(row.id)} className="border-b last:border-0">
                    <td className="py-3 text-foreground">
                      {row.user?.name ?? "—"}
                      {row.user?.email ? (
                        <span className="block text-xs text-muted-foreground">{row.user.email}</span>
                      ) : null}
                    </td>
                    <td className="py-3 text-xs capitalize">{row.action}</td>
                    <td className="py-3 text-muted-foreground max-w-xs truncate">{row.description ?? "—"}</td>
                    <td className="py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {(() => {
                        try {
                          return format(new Date(row.timestamp), "yyyy-MM-dd HH:mm");
                        } catch {
                          return String(row.timestamp);
                        }
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recent.length === 0 && !isLoading && (
              <p className="text-sm text-muted-foreground py-4">No recent audit entries</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
