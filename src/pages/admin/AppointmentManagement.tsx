import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { appointments as initialAppts, Appointment, doctors } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Clock, RotateCcw } from "lucide-react";

export default function AppointmentManagement() {
  const [appts, setAppts] = useState<Appointment[]>(initialAppts);
  const [filter, setFilter] = useState("all");
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState<Date | undefined>();
  const [newSlot, setNewSlot] = useState("");
  const { toast } = useToast();

  const filtered = filter === "all" ? appts : appts.filter((a) => a.status === filter);

  const handleReschedule = () => {
    if (!rescheduleId || !newDate || !newSlot) return;
    setAppts((prev) => prev.map((a) => a.id === rescheduleId ? { ...a, date: newDate.toISOString().split("T")[0], time: newSlot } : a));
    toast({ title: "Appointment rescheduled" });
    setRescheduleId(null); setNewDate(undefined); setNewSlot("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Appointment Management</h2>
          <p className="text-muted-foreground">View and manage all appointments</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-muted-foreground text-left">
                <th className="p-4 font-medium">Patient</th><th className="p-4 font-medium">Doctor</th><th className="p-4 font-medium">Date & Time</th><th className="p-4 font-medium">Status</th><th className="p-4 font-medium text-right">Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-4 font-medium text-foreground">{a.patientName}</td>
                    <td className="p-4 text-foreground">{a.doctorName}<br /><span className="text-xs text-muted-foreground">{a.specialty}</span></td>
                    <td className="p-4 text-muted-foreground">{a.date}<br />{a.time}</td>
                    <td className="p-4"><StatusBadge status={a.status} /></td>
                    <td className="p-4 text-right">
                      {a.status === "upcoming" && (
                        <Button variant="outline" size="sm" onClick={() => setRescheduleId(a.id)}>
                          <RotateCcw className="h-3 w-3 mr-1" /> Reschedule
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!rescheduleId} onOpenChange={() => setRescheduleId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Reschedule Appointment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Calendar mode="single" selected={newDate} onSelect={setNewDate}
              disabled={(date) => date < new Date() || date.getDay() === 0}
              className="rounded-md border mx-auto" />
            <div className="grid grid-cols-4 gap-2">
              {["9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"].map((slot) => (
                <Button key={slot} variant={newSlot === slot ? "default" : "outline"} size="sm" onClick={() => setNewSlot(slot)} className="text-xs">{slot}</Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleId(null)}>Cancel</Button>
            <Button onClick={handleReschedule} disabled={!newDate || !newSlot}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
