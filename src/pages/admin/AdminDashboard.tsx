import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, Activity } from "lucide-react";
import { request } from "@/lib/http";
import {
  appointmentPatientName,
  appointmentDoctorName,
  formatAppointmentDate,
  type AppointmentApi,
} from "@/lib/appointmentsDisplay";

type Paginated<T> = { pagination: { total: number }; patients?: T; doctors?: T; appointments?: T };

export default function AdminDashboard() {
  const { data: pMeta } = useQuery({
    queryKey: ["admin-count-patients"],
    queryFn: () => request<Paginated<unknown>>("/api/patients?limit=1&page=1"),
  });
  const { data: dMeta } = useQuery({
    queryKey: ["admin-count-doctors"],
    queryFn: () => request<Paginated<unknown>>("/api/doctors?limit=1&page=1"),
  });
  const { data: aMeta } = useQuery({
    queryKey: ["admin-count-appts"],
    queryFn: () => request<Paginated<unknown>>("/api/appointments?limit=1&page=1"),
  });
  const { data: activeMeta } = useQuery({
    queryKey: ["admin-active-appts"],
    queryFn: () =>
      request<{ appointments: AppointmentApi[]; pagination: { total: number } }>(
        "/api/appointments?status=scheduled&limit=1&page=1"
      ),
  });

  const { data: recent } = useQuery({
    queryKey: ["admin-recent-appts"],
    queryFn: () =>
      request<{ appointments: AppointmentApi[] }>("/api/appointments?limit=8&page=1"),
  });

  const totalPatients = pMeta?.pagination?.total ?? 0;
  const totalDoctors = dMeta?.pagination?.total ?? 0;
  const totalAppts = aMeta?.pagination?.total ?? 0;
  const activeAppts = activeMeta?.pagination?.total ?? 0;
  const recentRows = recent?.appointments ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Admin dashboard</h2>
        <p className="text-muted-foreground">Live counts from the MediBook API</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Patients" value={totalPatients} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Doctors" value={totalDoctors} icon={<Activity className="h-5 w-5" />} />
        <StatCard title="Appointments" value={totalAppts} icon={<Calendar className="h-5 w-5" />} />
        <StatCard title="Scheduled" value={activeAppts} icon={<Calendar className="h-5 w-5" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-left">
                  <th className="pb-2 font-medium">Patient</th>
                  <th className="pb-2 font-medium">Doctor</th>
                  <th className="pb-2 font-medium">When</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentRows.map((a) => (
                  <tr key={a._id} className="border-b last:border-0">
                    <td className="py-3 text-foreground">{appointmentPatientName(a)}</td>
                    <td className="py-3 text-foreground">{appointmentDoctorName(a)}</td>
                    <td className="py-3 text-muted-foreground">
                      {formatAppointmentDate(a.appointmentDate)} {a.timeSlot}
                    </td>
                    <td className="py-3 text-xs capitalize">{a.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentRows.length === 0 && <p className="text-sm text-muted-foreground py-4">No data</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
