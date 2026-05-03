import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { request } from "@/lib/http";
import {
  appointmentDoctorName,
  appointmentPatientName,
  appointmentDoctorSpecialty,
  formatAppointmentDate,
  type AppointmentApi,
} from "@/lib/appointmentsDisplay";

type ListRes = { appointments: AppointmentApi[] };

type ScheduleRes = { schedule: { date: string; slots: string[] }[] };

const UPCOMING_STATUSES = ["scheduled", "confirmed", "in-progress"];

export default function AppointmentManagement() {
  const [filter, setFilter] = useState("all");
  const [rescheduleRow, setRescheduleRow] = useState<AppointmentApi | null>(null);
  const [newDate, setNewDate] = useState<Date | undefined>();
  const [newSlot, setNewSlot] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-appts-all"],
    queryFn: () => request<ListRes>("/api/appointments?limit=200&page=1"),
  });

  const doctorIdForSchedule = rescheduleRow
    ? String((rescheduleRow as { doctorId?: string }).doctorId || "")
    : "";

  const { data: sched } = useQuery({
    queryKey: ["admin-resched-schedule", doctorIdForSchedule],
    queryFn: () => request<ScheduleRes>(`/api/doctors/${doctorIdForSchedule}/schedule`),
    enabled: Boolean(doctorIdForSchedule) && Boolean(rescheduleRow),
  });

  const dateStr = newDate ? format(newDate, "yyyy-MM-dd") : "";
  const slotsForDay = useMemo(() => {
    if (!sched?.schedule || !dateStr) return [];
    return sched.schedule.find((d) => d.date === dateStr)?.slots ?? [];
  }, [sched, dateStr]);

  const filtered = useMemo(() => {
    const all = data?.appointments ?? [];
    if (filter === "all") return all;
    if (filter === "upcoming") return all.filter((a) => UPCOMING_STATUSES.includes(a.status));
    return all.filter((a) => a.status === filter);
  }, [data, filter]);

  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      if (!rescheduleRow || !newDate || !newSlot) throw new Error("Pick date and slot");
      const appointmentDate = new Date(
        newDate.getFullYear(),
        newDate.getMonth(),
        newDate.getDate(),
        12,
        0,
        0
      ).toISOString();
      return request(`/api/appointments/${rescheduleRow._id}/reschedule`, {
        method: "POST",
        json: { appointmentDate, timeSlot: newSlot },
      });
    },
    onSuccess: () => {
      toast({ title: "Rescheduled" });
      void qc.invalidateQueries({ queryKey: ["admin-appts-all"] });
      setRescheduleRow(null);
      setNewDate(undefined);
      setNewSlot("");
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Appointment management</h2>
          <p className="text-muted-foreground">All appointments in the system</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="upcoming">Active / upcoming</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="no-show">No-show</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-left">
                  <th className="p-4 font-medium">Patient</th>
                  <th className="p-4 font-medium">Doctor</th>
                  <th className="p-4 font-medium">When</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a._id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-4 font-medium text-foreground">{appointmentPatientName(a)}</td>
                    <td className="p-4 text-foreground">
                      {appointmentDoctorName(a)}
                      <br />
                      <span className="text-xs text-muted-foreground">{appointmentDoctorSpecialty(a)}</span>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {formatAppointmentDate(a.appointmentDate)}
                      <br />
                      {a.timeSlot}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="p-4 text-right">
                      {UPCOMING_STATUSES.includes(a.status) && (
                        <Button variant="outline" size="sm" onClick={() => setRescheduleRow(a)}>
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

      <Dialog open={!!rescheduleRow} onOpenChange={() => setRescheduleRow(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reschedule appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Calendar
              mode="single"
              selected={newDate}
              onSelect={(d) => {
                setNewDate(d);
                setNewSlot("");
              }}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              className="rounded-md border mx-auto"
            />
            {newDate && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Slots</p>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {slotsForDay.map((slot) => (
                    <Button key={slot} variant={newSlot === slot ? "default" : "outline"} size="sm" onClick={() => setNewSlot(slot)}>
                      {slot}
                    </Button>
                  ))}
                </div>
                {slotsForDay.length === 0 && (
                  <p className="text-xs text-muted-foreground">No availability for this day.</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleRow(null)}>
              Cancel
            </Button>
            <Button
              disabled={!newDate || !newSlot || rescheduleMutation.isPending}
              onClick={() => rescheduleMutation.mutate()}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
