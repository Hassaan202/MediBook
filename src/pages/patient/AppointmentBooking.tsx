import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { appointments as initialAppointments, doctors, Appointment } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Clock, X, RotateCcw } from "lucide-react";

export default function AppointmentBooking() {
  const [myAppointments, setMyAppointments] = useState<Appointment[]>(initialAppointments.filter((a) => a.patientId === "p1"));
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState("");
  const { toast } = useToast();

  const availableDoctors = doctors.filter((d) => d.available);
  const doctor = doctors.find((d) => d.id === selectedDoctor);

  const handleBook = () => {
    if (!doctor || !selectedDate || !selectedSlot) return;
    const newApt: Appointment = {
      id: `a${Date.now()}`, patientId: "p1", patientName: "Sarah Johnson",
      doctorId: doctor.id, doctorName: doctor.name, specialty: doctor.specialty,
      date: selectedDate.toISOString().split("T")[0], time: selectedSlot, status: "upcoming",
    };
    setMyAppointments((prev) => [...prev, newApt]);
    setBookingOpen(false);
    setSelectedDoctor(""); setSelectedDate(undefined); setSelectedSlot("");
    toast({ title: "Appointment Booked!", description: `${doctor.name} on ${newApt.date} at ${selectedSlot}` });
  };

  const handleCancel = (id: string) => {
    setMyAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: "cancelled" as const } : a));
    toast({ title: "Appointment Cancelled" });
  };

  const upcoming = myAppointments.filter((a) => a.status === "upcoming");
  const past = myAppointments.filter((a) => a.status !== "upcoming");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Appointments</h2>
          <p className="text-muted-foreground">Manage your appointments</p>
        </div>
        <Button onClick={() => setBookingOpen(true)}>
          <CalendarIcon className="h-4 w-4 mr-2" /> Book Appointment
        </Button>
      </div>

      
      <Card>
        <CardHeader><CardTitle className="text-lg">Upcoming ({upcoming.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming appointments</p>
          ) : upcoming.map((apt) => (
            <div key={apt.id} className="flex items-center justify-between p-4 rounded-lg border">
              <div className="space-y-1">
                <p className="font-medium text-foreground">{apt.doctorName}</p>
                <p className="text-sm text-muted-foreground">{apt.specialty}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" />{apt.date}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{apt.time}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={apt.status} />
                <Button variant="outline" size="sm" onClick={() => handleCancel(apt.id)}>
                  <X className="h-3 w-3 mr-1" /> Cancel
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      
      <Card>
        <CardHeader><CardTitle className="text-lg">Past Appointments ({past.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {past.map((apt) => (
            <div key={apt.id} className="flex items-center justify-between p-4 rounded-lg border opacity-75">
              <div className="space-y-1">
                <p className="font-medium text-foreground">{apt.doctorName}</p>
                <p className="text-sm text-muted-foreground">{apt.specialty} • {apt.date} at {apt.time}</p>
              </div>
              <StatusBadge status={apt.status} />
            </div>
          ))}
        </CardContent>
      </Card>

      
      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Book an Appointment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Select Doctor</label>
              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger><SelectValue placeholder="Choose a doctor" /></SelectTrigger>
                <SelectContent>
                  {availableDoctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name} — {d.specialty}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Select Date</label>
              <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate}
                disabled={(date) => date < new Date() || date.getDay() === 0}
                className="rounded-md border mx-auto" />
            </div>
            {doctor && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Select Time Slot</label>
                <div className="grid grid-cols-3 gap-2">
                  {doctor.availableSlots.map((slot) => (
                    <Button key={slot} variant={selectedSlot === slot ? "default" : "outline"} size="sm"
                      onClick={() => setSelectedSlot(slot)}>{slot}</Button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingOpen(false)}>Cancel</Button>
            <Button onClick={handleBook} disabled={!selectedDoctor || !selectedDate || !selectedSlot}>Confirm Booking</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
