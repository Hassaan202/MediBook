import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pill, Trash2, FileText } from "lucide-react";
import { request, requestBlob } from "@/lib/http";
import type { AppointmentApi } from "@/lib/appointmentsDisplay";

type ListRes = { appointments: AppointmentApi[] };

type MedForm = {
  medicationName: string;
  genericName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
};

const emptyMed = (): MedForm => ({
  medicationName: "",
  genericName: "",
  dosage: "",
  frequency: "",
  duration: "",
  instructions: "",
});

export default function PrescriptionCreation() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedPatient, setSelectedPatient] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [meds, setMeds] = useState<MedForm[]>([emptyMed()]);
  const [createdPreview, setCreatedPreview] = useState<{
    id: string;
    medications: MedForm[];
    patientName: string;
    diagnosis: string;
  } | null>(null);

  const { data: apptData } = useQuery({
    queryKey: ["doctor-rx-patients"],
    queryFn: () => request<ListRes>("/api/appointments?limit=200&page=1"),
  });

  const patientOptions = useMemo(() => {
    const m = new Map<string, string>();
    (apptData?.appointments ?? []).forEach((a) => {
      const pid = (a as { patientId?: string }).patientId;
      if (!pid) return;
      const name = a.patientDetails?.userDetails?.name || "Patient";
      m.set(String(pid), name);
    });
    return Array.from(m.entries()).map(([id, name]) => ({ id, name }));
  }, [apptData]);

  const patientName = patientOptions.find((p) => p.id === selectedPatient)?.name || "";

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPatient) throw new Error("Select a patient");
      if (!diagnosis.trim()) throw new Error("Diagnosis is required");
      const medications = meds
        .filter((m) => m.medicationName && m.dosage && m.frequency && m.duration)
        .map((m) => ({
          medicationName: m.medicationName.trim(),
          genericName: m.genericName.trim() || undefined,
          dosage: m.dosage.trim(),
          frequency: m.frequency.trim(),
          duration: m.duration.trim(),
          instructions: m.instructions.trim() || undefined,
        }));
      if (!medications.length) throw new Error("Add at least one complete medication");
      return request<{ prescription: { _id: string } }>("/api/prescriptions", {
        method: "POST",
        json: {
          patientId: selectedPatient,
          diagnosis: diagnosis.trim(),
          medications,
        },
      });
    },
    onSuccess: (res) => {
      const diag = diagnosis.trim();
      const medRows = meds.filter((m) => m.medicationName && m.dosage && m.frequency && m.duration);
      toast({ title: "Prescription created", description: "The patient has been notified." });
      void qc.invalidateQueries({ queryKey: ["doctor-consult-rx"] });
      setCreatedPreview({
        id: String(res.prescription._id),
        medications: medRows,
        patientName,
        diagnosis: diag,
      });
      setMeds([emptyMed()]);
      setDiagnosis("");
    },
    onError: (e: Error) => {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    },
  });

  const updateMed = (i: number, patch: Partial<MedForm>) => {
    setMeds((prev) => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Create prescription</h2>
        <p className="text-muted-foreground">Issued to MediBook patients you have access to</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Patient & diagnosis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patientOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="space-y-1">
                <Label>Diagnosis</Label>
                <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Required" />
              </div>
            </CardContent>
          </Card>

          {meds.map((rx, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Pill className="h-4 w-4" /> Medication {i + 1}
                  </CardTitle>
                  {meds.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => setMeds((p) => p.filter((_, j) => j !== i))} className="h-8 w-8 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Medication name</Label>
                    <Input value={rx.medicationName} onChange={(e) => updateMed(i, { medicationName: e.target.value })} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Generic name (optional)</Label>
                    <Input value={rx.genericName} onChange={(e) => updateMed(i, { genericName: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Dosage</Label>
                    <Input value={rx.dosage} onChange={(e) => updateMed(i, { dosage: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Frequency</Label>
                    <Input value={rx.frequency} onChange={(e) => updateMed(i, { frequency: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Duration</Label>
                    <Input value={rx.duration} onChange={(e) => updateMed(i, { duration: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Instructions (optional)</Label>
                    <Input value={rx.instructions} onChange={(e) => updateMed(i, { instructions: e.target.value })} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setMeds((p) => [...p, emptyMed()])} className="flex-1">
              <Plus className="h-4 w-4 mr-2" /> Add medication
            </Button>
            <Button className="flex-1" disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>
              <FileText className="h-4 w-4 mr-2" /> Submit to server
            </Button>
          </div>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {createdPreview ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg border-2 border-dashed border-primary/30 bg-accent/30">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-bold text-foreground">MediBook</h3>
                    <Separator className="my-3" />
                  </div>
                  <div className="space-y-1 text-sm mb-4">
                    <p>
                      <span className="text-muted-foreground">Patient:</span>{" "}
                      <span className="font-medium text-foreground">{createdPreview.patientName}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Diagnosis:</span>{" "}
                      <span className="font-medium text-foreground">{createdPreview.diagnosis || "—"}</span>
                    </p>
                  </div>
                  <Separator className="my-3" />
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Rx</p>
                  {createdPreview.medications.map((rx, idx) => (
                    <div key={idx} className="mb-3 p-2 rounded bg-card">
                      <p className="font-medium text-foreground">
                        {idx + 1}. {rx.medicationName} — <Badge variant="secondary">{rx.dosage}</Badge>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {rx.frequency} • {rx.duration}
                        {rx.instructions ? ` • ${rx.instructions}` : ""}
                      </p>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    className="w-full mt-2"
                    onClick={async () => {
                      try {
                        const blob = await requestBlob(`/api/prescriptions/${createdPreview.id}/pdf`);
                        const url = URL.createObjectURL(blob);
                        window.open(url, "_blank", "noopener,noreferrer");
                        setTimeout(() => URL.revokeObjectURL(url), 60_000);
                      } catch {
                        toast({ title: "PDF failed", variant: "destructive" });
                      }
                    }}
                  >
                    Open PDF
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Submit a prescription to see confirmation and PDF link</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
