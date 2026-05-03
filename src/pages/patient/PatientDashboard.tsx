import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, Pill, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { request } from "@/lib/http";
import {
  appointmentDoctorName,
  appointmentDoctorSpecialty,
  formatAppointmentDate,
  type AppointmentApi,
} from "@/lib/appointmentsDisplay";

type UpcomingRes = { appointments: AppointmentApi[]; pagination: { total: number } };
type CountRes = { records: unknown[]; pagination: { total: number } };
type RxActiveRes = { prescriptions: unknown[] };
type PatientRes = {
  patient: {
    allergies: string[];
    chronicConditions: string[];
    bloodType: string;
    age?: number | null;
  };
};

export default function PatientDashboard() {
  const { user, patientProfileId } = useAuth();
  const pid = patientProfileId;

  const { data: upcoming } = useQuery({
    queryKey: ["patient-upcoming", pid],
    enabled: Boolean(pid),
    queryFn: () => request<UpcomingRes>("/api/appointments/upcoming?limit=8"),
  });

  const { data: recordsMeta } = useQuery({
    queryKey: ["patient-records-count", pid],
    enabled: Boolean(pid),
    queryFn: () => request<CountRes>("/api/medical-records?limit=1"),
  });

  const { data: rxActive } = useQuery({
    queryKey: ["patient-rx-active", pid],
    enabled: Boolean(pid),
    queryFn: () =>
      pid
        ? request<RxActiveRes>(`/api/prescriptions/patient/${pid}/active`)
        : Promise.resolve({ prescriptions: [] }),
  });

  const { data: profileData } = useQuery({
    queryKey: ["patient-profile", pid],
    enabled: Boolean(pid),
    queryFn: () => request<PatientRes>(`/api/patients/${pid}`),
  });

  const profile = profileData?.patient;
  const upcomingList = upcoming?.appointments ?? [];
  const recordTotal = recordsMeta?.pagination?.total ?? 0;
  const activeRxTotal = rxActive?.prescriptions?.length ?? 0;
  const allergies = profile?.allergies ?? [];
  const conditions = profile?.chronicConditions ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Welcome back, {user?.name?.split(" ")[0]}</h2>
        <p className="text-muted-foreground">Overview of your care on MediBook</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Upcoming visits" value={upcomingList.length} icon={<Calendar className="h-5 w-5" />} />
        <StatCard title="Medical records" value={recordTotal} icon={<FileText className="h-5 w-5" />} />
        <StatCard title="Active prescriptions" value={activeRxTotal} icon={<Pill className="h-5 w-5" />} />
        <StatCard title="Allergies" value={allergies.length} icon={<AlertTriangle className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming appointments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!pid && <p className="text-sm text-muted-foreground">Patient profile not linked.</p>}
            {pid && upcomingList.length === 0 && (
              <p className="text-muted-foreground text-sm">No upcoming appointments</p>
            )}
            {upcomingList.map((apt) => (
              <div key={apt._id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium text-sm text-foreground">{appointmentDoctorName(apt)}</p>
                  <p className="text-xs text-muted-foreground">
                    {appointmentDoctorSpecialty(apt)} • {formatAppointmentDate(apt.appointmentDate)} • {apt.timeSlot}
                  </p>
                </div>
                <StatusBadge status={apt.status} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Health profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!profile && pid && <p className="text-sm text-muted-foreground">Loading profile…</p>}
            {profile && (
              <>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Allergies</p>
                  <div className="flex flex-wrap gap-2">
                    {allergies.length > 0 ? (
                      allergies.map((a) => (
                        <Badge
                          key={a}
                          variant="outline"
                          className="bg-destructive/10 text-destructive border-destructive/20"
                        >
                          {a}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">None reported</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Chronic conditions</p>
                  <div className="flex flex-wrap gap-2">
                    {conditions.length > 0 ? (
                      conditions.map((c) => (
                        <Badge key={c} variant="outline" className="bg-warning/10 text-warning border-warning/20">
                          {c}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">None on file</span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Blood type</p>
                    <p className="font-semibold text-foreground">{profile.bloodType}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Age</p>
                    <p className="font-semibold text-foreground">
                      {profile.age != null ? `${profile.age} years` : "—"}
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
