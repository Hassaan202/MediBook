import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckCircle, Users, Clock } from "lucide-react";
import { appointments } from "@/data/mockData";
import { useAuth } from "@/contexts/AuthContext";

export default function DoctorDashboard() {
  const { user } = useAuth();
  const doctorAppts = appointments.filter((a) => a.doctorId === "d1");
  const upcoming = doctorAppts.filter((a) => a.status === "upcoming");
  const completed = doctorAppts.filter((a) => a.status === "completed");
  const uniquePatients = new Set(doctorAppts.map((a) => a.patientId)).size;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Welcome, {user?.name}</h2>
        <p className="text-muted-foreground">Here's your schedule overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Today's Appointments" value={upcoming.length} icon={<Calendar className="h-5 w-5" />} />
        <StatCard title="Completed" value={completed.length} icon={<CheckCircle className="h-5 w-5" />} />
        <StatCard title="Total Patients" value={uniquePatients} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Avg. Duration" value="25 min" icon={<Clock className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Upcoming Appointments</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 ? <p className="text-sm text-muted-foreground">No upcoming appointments</p> : upcoming.map((apt) => (
              <div key={apt.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium text-sm text-foreground">{apt.patientName}</p>
                  <p className="text-xs text-muted-foreground">{apt.date} at {apt.time}</p>
                </div>
                <StatusBadge status={apt.status} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Completed Appointments</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {completed.length === 0 ? <p className="text-sm text-muted-foreground">No completed appointments yet</p> : completed.map((apt) => (
              <div key={apt.id} className="flex items-center justify-between p-3 rounded-lg border opacity-75">
                <div>
                  <p className="font-medium text-sm text-foreground">{apt.patientName}</p>
                  <p className="text-xs text-muted-foreground">{apt.date} at {apt.time}</p>
                  {apt.notes && <p className="text-xs text-muted-foreground mt-1 italic">{apt.notes}</p>}
                </div>
                <StatusBadge status={apt.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
