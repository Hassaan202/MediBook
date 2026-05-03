import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, CheckCircle } from "lucide-react";
import { request } from "@/lib/http";
import {
  appointmentPatientName,
  formatAppointmentDate,
  type AppointmentApi,
} from "@/lib/appointmentsDisplay";

type ListRes = { appointments: AppointmentApi[] };

const ACTIVE = ["scheduled", "confirmed", "in-progress"];

export default function ClinicalNotes() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState("");
  const [notes, setNotes] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["doctor-notes-appts"],
    queryFn: () => request<ListRes>("/api/appointments?limit=100&page=1"),
  });

  const open = useMemo(() => {
    return (data?.appointments ?? []).filter((a) => ACTIVE.includes(a.status));
  }, [data]);

  const selected = open.find((a) => a._id === selectedId);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!selectedId || !notes.trim()) throw new Error("Select appointment and enter notes");
      return request(`/api/appointments/${selectedId}`, {
        method: "PUT",
        json: { notes: notes.trim() },
      });
    },
    onSuccess: () => {
      toast({ title: "Saved", description: "Appointment notes updated." });
      void qc.invalidateQueries({ queryKey: ["doctor-notes-appts"] });
    },
    onError: (e: Error) => {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (a: AppointmentApi) => {
      let st = a.status;
      if (st === "scheduled") {
        await request(`/api/appointments/${a._id}/confirm`, { method: "PATCH", json: {} });
        st = "confirmed";
      }
      if (st === "confirmed") {
        await request(`/api/appointments/${a._id}/status`, {
          method: "PATCH",
          json: { status: "in-progress" },
        });
        st = "in-progress";
      }
      if (st === "in-progress") {
        await request(`/api/appointments/${a._id}/status`, {
          method: "PATCH",
          json: { status: "completed" },
        });
      }
    },
    onSuccess: () => {
      toast({ title: "Completed", description: "Visit marked completed." });
      void qc.invalidateQueries({ queryKey: ["doctor-notes-appts"] });
      void qc.invalidateQueries({ queryKey: ["doctor-upcoming"] });
      void qc.invalidateQueries({ queryKey: ["doctor-past"] });
      setSelectedId("");
      setNotes("");
    },
    onError: (e: Error) => {
      toast({ title: "Could not complete", description: e.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Clinical documentation</h2>
        <p className="text-muted-foreground">Update appointment notes and close visits</p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading appointments…</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Active appointments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {open.length === 0 && !isLoading && (
              <p className="text-sm text-muted-foreground">No open visits to document.</p>
            )}
            {open.map((apt) => (
              <div
                key={apt._id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedId === apt._id ? "border-primary bg-accent" : "hover:bg-muted/50"
                }`}
                onClick={() => {
                  setSelectedId(apt._id);
                  setNotes(apt.notes || "");
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm text-foreground">{appointmentPatientName(apt)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatAppointmentDate(apt.appointmentDate)} • {apt.timeSlot}
                    </p>
                  </div>
                  <StatusBadge status={apt.status} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-4 w-4" /> Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedId && selected ? (
              <>
                <Textarea
                  placeholder="Clinical notes for this visit…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={8}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={saveMutation.isPending}
                    onClick={() => saveMutation.mutate()}
                  >
                    Save notes
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={completeMutation.isPending}
                    onClick={() => completeMutation.mutate(selected)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" /> Complete visit
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Select an appointment</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
