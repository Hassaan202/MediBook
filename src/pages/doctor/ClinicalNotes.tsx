import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { appointments } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, CheckCircle } from "lucide-react";

export default function ClinicalNotes() {
  const { toast } = useToast();
  const upcoming = appointments.filter((a) => a.doctorId === "d1" && a.status === "upcoming");
  const [selectedApt, setSelectedApt] = useState("");
  const [notes, setNotes] = useState("");
  const [completedList, setCompletedList] = useState<string[]>([]);

  const handleSave = () => {
    if (!selectedApt || !notes.trim()) return;
    toast({ title: "Clinical notes saved", description: "Notes have been added to the patient's record" });
    setNotes("");
  };

  const handleComplete = () => {
    if (!selectedApt) return;
    setCompletedList((prev) => [...prev, selectedApt]);
    toast({ title: "Appointment completed", description: "The appointment has been marked as complete" });
    setSelectedApt("");
    setNotes("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Clinical Documentation</h2>
        <p className="text-muted-foreground">Add notes and complete appointments</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Select Appointment</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {upcoming.filter((a) => !completedList.includes(a.id)).map((apt) => (
              <div key={apt.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedApt === apt.id ? "border-primary bg-accent" : "hover:bg-muted/50"}`}
                onClick={() => setSelectedApt(apt.id)}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-foreground">{apt.patientName}</p>
                    <p className="text-xs text-muted-foreground">{apt.date} at {apt.time}</p>
                  </div>
                  <StatusBadge status={apt.status} />
                </div>
              </div>
            ))}
            {upcoming.filter((a) => !completedList.includes(a.id)).length === 0 && (
              <p className="text-sm text-muted-foreground">All appointments completed!</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Add Notes</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {selectedApt ? (
              <>
                <Textarea placeholder="Enter clinical notes..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={8} />
                <div className="flex gap-2">
                  <Button onClick={handleSave} variant="outline" className="flex-1">Save Notes</Button>
                  <Button onClick={handleComplete} className="flex-1">
                    <CheckCircle className="h-4 w-4 mr-2" /> Complete
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Select an appointment to add notes</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
