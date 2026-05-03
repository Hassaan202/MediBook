import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Clock, X } from "lucide-react";
import { format } from "date-fns";
import { request } from "@/lib/http";
import {
  appointmentDoctorName,
  appointmentDoctorSpecialty,
  formatAppointmentDate,
  type AppointmentApi,
} from "@/lib/appointmentsDisplay";

type AppointmentsRes = { appointments: AppointmentApi[]; pagination: { total: number } };
type DoctorsRes = { doctors: { id: string; available: boolean; user?: { name?: string }; specialty: string }[] };
type ScheduleRes = { schedule: { date: string; slots: string[] }[] };
type BookRes = { appointment: AppointmentApi };

const ACTIVE = ["scheduled", "confirmed", "in-progress"];

function isUpcomingPatientView(a: AppointmentApi) {
  return ACTIVE.includes(a.status);
}

function isPastPatientView(a: AppointmentApi) {
  return !ACTIVE.includes(a.status);
}

export default function AppointmentBooking() {
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState("");

  useEffect(() => {
    const d = searchParams.get("doctor");
    if (d) setSelectedDoctor(d);
  }, [searchParams]);

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ["patient-appointments"],
    queryFn: () => request<AppointmentsRes>("/api/appointments?limit=100&page=1"),
  });

  const { data: doctorsData } = useQuery({
    queryKey: ["doctors-booking"],
    queryFn: () => request<DoctorsRes>("/api/doctors?available=true&limit=100&page=1"),
    enabled: bookingOpen,
  });

  const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";

  const { data: scheduleData, isFetching: scheduleLoading } = useQuery({
    queryKey: ["doctor-schedule", selectedDoctor],
    queryFn: () => request<ScheduleRes>(`/api/doctors/${selectedDoctor}/schedule`),
    enabled: Boolean(selectedDoctor) && bookingOpen,
  });

  const slotsForDay = useMemo(() => {
    if (!scheduleData?.schedule || !dateStr) return [];
    const row = scheduleData.schedule.find((d) => d.date === dateStr);
    return row?.slots ?? [];
  }, [scheduleData, dateStr]);

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDoctor || !selectedDate || !selectedSlot) throw new Error("Missing fields");
      const appointmentDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        12,
        0,
        0
      ).toISOString();
      return request<BookRes>("/api/appointments", {
        method: "POST",
        json: {
          doctorId: selectedDoctor,
          appointmentDate,
          timeSlot: selectedSlot,
        },
      });
    },
    onSuccess: () => {
      toast({ title: "Booked", description: "Your appointment is confirmed." });
      void qc.invalidateQueries({ queryKey: ["patient-appointments"] });
      void qc.invalidateQueries({ queryKey: ["patient-upcoming"] });
      setBookingOpen(false);
      setSelectedDoctor("");
      setSelectedDate(undefined);
      setSelectedSlot("");
    },
    onError: (e: Error) => {
      toast({ title: "Booking failed", description: e.message, variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) =>
      request<unknown>(`/api/appointments/${id}`, {
        method: "DELETE",
        json: { reason: "Cancelled by patient from portal" },
      }),
    onSuccess: () => {
      toast({ title: "Cancelled" });
      void qc.invalidateQueries({ queryKey: ["patient-appointments"] });
      void qc.invalidateQueries({ queryKey: ["patient-upcoming"] });
    },
    onError: (e: Error) => {
      toast({ title: "Could not cancel", description: e.message, variant: "destructive" });
    },
  });

  const myAppointments = listData?.appointments ?? [];
  const upcoming = myAppointments.filter(isUpcomingPatientView);
  const past = myAppointments.filter(isPastPatientView);
  const availableDoctors = (doctorsData?.doctors ?? []).filter((d) => d.available);
  const selectedDocMeta = availableDoctors.find((d) => d.id === selectedDoctor);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Appointments</h2>
          <p className="text-muted-foreground">Book and manage your visits</p>
        </div>
        <Button onClick={() => setBookingOpen(true)}>
          <CalendarIcon className="h-4 w-4 mr-2" /> Book appointment
        </Button>
      </div>

      {listLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upcoming ({upcoming.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming appointments</p>
          ) : (
            upcoming.map((apt) => (
              <div key={apt._id} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{appointmentDoctorName(apt)}</p>
                  <p className="text-sm text-muted-foreground">{appointmentDoctorSpecialty(apt)}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      {formatAppointmentDate(apt.appointmentDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {apt.timeSlot}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={apt.status} />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={cancelMutation.isPending}
                    onClick={() => cancelMutation.mutate(apt._id)}
                  >
                    <X className="h-3 w-3 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Past & closed ({past.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {past.map((apt) => (
            <div key={apt._id} className="flex items-center justify-between p-4 rounded-lg border opacity-80">
              <div className="space-y-1">
                <p className="font-medium text-foreground">{appointmentDoctorName(apt)}</p>
                <p className="text-sm text-muted-foreground">
                  {appointmentDoctorSpecialty(apt)} • {formatAppointmentDate(apt.appointmentDate)} • {apt.timeSlot}
                </p>
              </div>
              <StatusBadge status={apt.status} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Book an appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Doctor</label>
              <Select value={selectedDoctor} onValueChange={(v) => { setSelectedDoctor(v); setSelectedSlot(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a doctor" />
                </SelectTrigger>
                <SelectContent>
                  {availableDoctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.user?.name || "Doctor"} — {d.specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Date</label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => {
                  setSelectedDate(d);
                  setSelectedSlot("");
                }}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                className="rounded-md border mx-auto"
              />
            </div>
            {selectedDoctor && selectedDate && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Time slot</label>
                {scheduleLoading && <p className="text-xs text-muted-foreground">Loading slots…</p>}
                {!scheduleLoading && slotsForDay.length === 0 && (
                  <p className="text-xs text-muted-foreground">No open slots for this day.</p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {slotsForDay.map((slot) => (
                    <Button
                      key={slot}
                      variant={selectedSlot === slot ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedSlot(slot)}
                    >
                      {slot}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {selectedDocMeta && (
              <p className="text-xs text-muted-foreground">
                Selected: {selectedDocMeta.user?.name} — slots come from the doctor&apos;s live schedule.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => bookMutation.mutate()}
              disabled={!selectedDoctor || !selectedDate || !selectedSlot || bookMutation.isPending}
            >
              {bookMutation.isPending ? "Booking…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
