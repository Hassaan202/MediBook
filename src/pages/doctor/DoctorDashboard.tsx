import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckCircle, Users, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { request } from "@/lib/http";
import {
  appointmentPatientName,
  formatAppointmentDate,
  type AppointmentApi,
} from "@/lib/appointmentsDisplay";
import { startOfDay, isSameDay } from "date-fns";

type ListRes = { appointments: AppointmentApi[]; pagination: { total: number } };

export default function DoctorDashboard() {
  const { user } = useAuth();

  const { data: upcomingData } = useQuery({
    queryKey: ["doctor-upcoming"],
    queryFn: () => request<ListRes>("/api/appointments/upcoming?limit=50"),
  });

  const { data: pastData } = useQuery({
    queryKey: ["doctor-past"],
    queryFn: () => request<ListRes>("/api/appointments/past?limit=50"),
  });

  const { data: allData } = useQuery({
    queryKey: ["doctor-appts-stats"],
    queryFn: () => request<ListRes>("/api/appointments?limit=200&page=1"),
  });

  const upcoming = upcomingData?.appointments ?? [];
  const completed = (pastData?.appointments ?? []).filter((a) => a.status === "completed");

  const todayStart = startOfDay(new Date());
  const todayAppts = useMemo(() => {
    return (allData?.appointments ?? []).filter(
      (a) => isSameDay(new Date(a.appointmentDate), todayStart) && ["scheduled", "confirmed", "in-progress"].includes(a.status)
    );
  }, [allData, todayStart]);

  const uniquePatients = useMemo(() => {
    const s = new Set<string>();
    (allData?.appointments ?? []).forEach((a) => {
      const pid = (a as { patientId?: string }).patientId;
      if (pid) s.add(String(pid));
    });
    return s.size;
  }, [allData]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Welcome, {user?.name}</h2>
        <p className="text-muted-foreground">Your schedule overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Today (active)" value={todayAppts.length} icon={<Calendar className="h-5 w-5" />} />
        <StatCard title="Upcoming queue" value={upcoming.length} icon={<Calendar className="h-5 w-5" />} />
        <StatCard title="Completed (recent)" value={completed.length} icon={<CheckCircle className="h-5 w-5" />} />
        <StatCard title="Patients seen" value={uniquePatients} icon={<Users className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-4 w-4" /> Today
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayAppts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No visits scheduled for today</p>
            ) : (
              todayAppts.map((apt) => (
                <div key={apt._id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm text-foreground">{appointmentPatientName(apt)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatAppointmentDate(apt.appointmentDate)} • {apt.timeSlot}
                    </p>
                  </div>
                  <StatusBadge status={apt.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Next upcoming</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming appointments</p>
            ) : (
              upcoming.slice(0, 8).map((apt) => (
                <div key={apt._id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm text-foreground">{appointmentPatientName(apt)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatAppointmentDate(apt.appointmentDate)} • {apt.timeSlot}
                    </p>
                  </div>
                  <StatusBadge status={apt.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
