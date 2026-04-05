import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminStats, appointments } from "@/data/mockData";
import { Users, Calendar, DollarSign, TrendingUp, Activity, Star } from "lucide-react";

export default function AdminDashboard() {
  const recentAppts = appointments.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Admin Dashboard</h2>
        <p className="text-muted-foreground">System overview and key metrics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Patients" value={adminStats.totalPatients.toLocaleString()} icon={<Users className="h-5 w-5" />} trend={{ value: 12, positive: true }} />
        <StatCard title="Total Doctors" value={adminStats.totalDoctors} icon={<Activity className="h-5 w-5" />} trend={{ value: 3, positive: true }} />
        <StatCard title="Total Appointments" value={adminStats.totalAppointments.toLocaleString()} icon={<Calendar className="h-5 w-5" />} trend={{ value: 8, positive: true }} />
        <StatCard title="Active Appointments" value={adminStats.activeAppointments} icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard title="Revenue" value={`$${adminStats.revenue.toLocaleString()}`} icon={<DollarSign className="h-5 w-5" />} trend={{ value: 15, positive: true }} />
        <StatCard title="Satisfaction Rate" value={`${adminStats.satisfactionRate}%`} icon={<Star className="h-5 w-5" />} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Recent Appointments</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-muted-foreground text-left">
                <th className="pb-2 font-medium">Patient</th><th className="pb-2 font-medium">Doctor</th><th className="pb-2 font-medium">Date</th><th className="pb-2 font-medium">Status</th>
              </tr></thead>
              <tbody>
                {recentAppts.map((a) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="py-3 text-foreground">{a.patientName}</td>
                    <td className="py-3 text-foreground">{a.doctorName}</td>
                    <td className="py-3 text-muted-foreground">{a.date} {a.time}</td>
                    <td className="py-3"><span className={`text-xs px-2 py-1 rounded-full ${a.status === "upcoming" ? "bg-info/10 text-info" : a.status === "completed" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
