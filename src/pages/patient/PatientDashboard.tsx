import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, Pill, AlertTriangle } from "lucide-react";
import { appointments, medicalRecords, patientProfiles } from "@/data/mockData";
import { useAuth } from "@/contexts/AuthContext";

export default function PatientDashboard() {
  const { user } = useAuth();
  const profile = patientProfiles.find((p) => p.id === "p1") || patientProfiles[0];
  const myAppointments = appointments.filter((a) => a.patientId === "p1");
  const upcoming = myAppointments.filter((a) => a.status === "upcoming");
  const records = medicalRecords.filter((r) => r.patientId === "p1");
  const prescriptionCount = records.reduce((acc, r) => acc + r.prescriptions.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Welcome back, {user?.name?.split(" ")[0]}</h2>
        <p className="text-muted-foreground">Here's an overview of your health profile</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Upcoming Appointments" value={upcoming.length} icon={<Calendar className="h-5 w-5" />} />
        <StatCard title="Medical Records" value={records.length} icon={<FileText className="h-5 w-5" />} />
        <StatCard title="Active Prescriptions" value={prescriptionCount} icon={<Pill className="h-5 w-5" />} />
        <StatCard title="Allergies" value={profile.allergies.length} icon={<AlertTriangle className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <Card>
          <CardHeader><CardTitle className="text-lg">Upcoming Appointments</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 ? (
              <p className="text-muted-foreground text-sm">No upcoming appointments</p>
            ) : (
              upcoming.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium text-sm text-foreground">{apt.doctorName}</p>
                    <p className="text-xs text-muted-foreground">{apt.specialty} • {apt.date} at {apt.time}</p>
                  </div>
                  <StatusBadge status={apt.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        
        <Card>
          <CardHeader><CardTitle className="text-lg">Health Profile</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Allergies</p>
              <div className="flex flex-wrap gap-2">
                {profile.allergies.length > 0 ? profile.allergies.map((a) => (
                  <Badge key={a} variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">{a}</Badge>
                )) : <span className="text-sm text-muted-foreground">None reported</span>}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Conditions</p>
              <div className="flex flex-wrap gap-2">
                {profile.conditions.map((c) => (
                  <Badge key={c} variant="outline" className="bg-warning/10 text-warning border-warning/20">{c}</Badge>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Blood Type</p>
                <p className="font-semibold text-foreground">{profile.bloodType}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Age</p>
                <p className="font-semibold text-foreground">{profile.age} years</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
