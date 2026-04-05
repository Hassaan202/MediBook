import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { patientProfiles, Prescription } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pill, Trash2, FileText } from "lucide-react";

const emptyRx: Omit<Prescription, "id"> = { medication: "", dosage: "", frequency: "", duration: "", instructions: "" };

export default function PrescriptionCreation() {
  const { toast } = useToast();
  const [selectedPatient, setSelectedPatient] = useState("");
  const [prescriptions, setPrescriptions] = useState<Omit<Prescription, "id">[]>([{ ...emptyRx }]);
  const [generated, setGenerated] = useState<Omit<Prescription, "id">[] | null>(null);

  const updateRx = (index: number, field: keyof Omit<Prescription, "id">, value: string) => {
    setPrescriptions((prev) => prev.map((rx, i) => i === index ? { ...rx, [field]: value } : rx));
  };

  const addRx = () => setPrescriptions((prev) => [...prev, { ...emptyRx }]);
  const removeRx = (index: number) => setPrescriptions((prev) => prev.filter((_, i) => i !== index));

  const handleGenerate = () => {
    if (!selectedPatient) { toast({ title: "Please select a patient", variant: "destructive" }); return; }
    const valid = prescriptions.every((rx) => rx.medication && rx.dosage && rx.frequency);
    if (!valid) { toast({ title: "Please fill required fields", variant: "destructive" }); return; }
    setGenerated([...prescriptions]);
    toast({ title: "Prescription Generated!", description: "Review the prescription below" });
  };

  const patient = patientProfiles.find((p) => p.id === selectedPatient);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Create Prescription</h2>
        <p className="text-muted-foreground">Write and generate prescriptions for patients</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Patient</CardTitle></CardHeader>
            <CardContent>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>
                  {patientProfiles.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {prescriptions.map((rx, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><Pill className="h-4 w-4" /> Medication {i + 1}</CardTitle>
                  {prescriptions.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeRx(i)} className="h-8 w-8 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Medication Name *</Label>
                    <Input placeholder="e.g. Amoxicillin" value={rx.medication} onChange={(e) => updateRx(i, "medication", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Dosage *</Label>
                    <Input placeholder="e.g. 500mg" value={rx.dosage} onChange={(e) => updateRx(i, "dosage", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Frequency *</Label>
                    <Input placeholder="e.g. Twice daily" value={rx.frequency} onChange={(e) => updateRx(i, "frequency", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Duration</Label>
                    <Input placeholder="e.g. 7 days" value={rx.duration} onChange={(e) => updateRx(i, "duration", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Instructions</Label>
                    <Input placeholder="e.g. After meals" value={rx.instructions} onChange={(e) => updateRx(i, "instructions", e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex gap-2">
            <Button variant="outline" onClick={addRx} className="flex-1"><Plus className="h-4 w-4 mr-2" /> Add Medication</Button>
            <Button onClick={handleGenerate} className="flex-1"><FileText className="h-4 w-4 mr-2" /> Generate</Button>
          </div>
        </div>

        
        <Card className="h-fit">
          <CardHeader><CardTitle className="text-lg">Prescription Preview</CardTitle></CardHeader>
          <CardContent>
            {generated && patient ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg border-2 border-dashed border-primary/30 bg-accent/30">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-bold text-foreground">HealthCare Medical Center</h3>
                    <p className="text-xs text-muted-foreground">123 Medical Ave, Health City</p>
                    <Separator className="my-3" />
                  </div>
                  <div className="space-y-1 text-sm mb-4">
                    <p><span className="text-muted-foreground">Patient:</span> <span className="font-medium text-foreground">{patient.name}</span></p>
                    <p><span className="text-muted-foreground">Age/Gender:</span> <span className="font-medium text-foreground">{patient.age} / {patient.gender}</span></p>
                    <p><span className="text-muted-foreground">Date:</span> <span className="font-medium text-foreground">{new Date().toLocaleDateString()}</span></p>
                  </div>
                  <Separator className="my-3" />
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Rx</p>
                  {generated.map((rx, i) => (
                    <div key={i} className="mb-3 p-2 rounded bg-card">
                      <p className="font-medium text-foreground">{i + 1}. {rx.medication} — <Badge variant="secondary">{rx.dosage}</Badge></p>
                      <p className="text-xs text-muted-foreground mt-1">{rx.frequency} • {rx.duration} • {rx.instructions}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Fill in the form and click Generate to preview</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
