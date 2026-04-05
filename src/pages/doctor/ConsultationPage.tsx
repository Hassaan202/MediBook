import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { patientProfiles, appointments, medicalRecords } from "@/data/mockData";
import { User, FileText, AlertTriangle, Pill } from "lucide-react";

export default function ConsultationPage() {
  const [selectedPatient, setSelectedPatient] = useState("");
  const patient = patientProfiles.find((p) => p.id === selectedPatient);
  const patientRecords = medicalRecords.filter((r) => r.patientId === selectedPatient);
  const patientAppts = appointments.filter((a) => a.patientId === selectedPatient && a.doctorId === "d1");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Consultations</h2>
        <p className="text-muted-foreground">View patient details and medical history</p>
      </div>

      <div className="max-w-sm">
        <Select value={selectedPatient} onValueChange={setSelectedPatient}>
          <SelectTrigger><SelectValue placeholder="Select a patient" /></SelectTrigger>
          <SelectContent>
            {patientProfiles.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {patient ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><User className="h-4 w-4" /> Profile</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-primary-foreground">{patient.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground">{patient.name}</p>
                  <p className="text-sm text-muted-foreground">{patient.age} yrs, {patient.gender}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Blood Type</span><span className="font-medium text-foreground">{patient.bloodType}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="font-medium text-foreground">{patient.phone}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Emergency</span><span className="font-medium text-foreground text-xs">{patient.emergencyContact}</span></div>
              </div>
            </CardContent>
          </Card>

          
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Allergies & Conditions</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Allergies</p>
                <div className="flex flex-wrap gap-2">
                  {patient.allergies.length > 0 ? patient.allergies.map((a) => (
                    <Badge key={a} variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">{a}</Badge>
                  )) : <span className="text-sm text-muted-foreground">None</span>}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Conditions</p>
                <div className="flex flex-wrap gap-2">
                  {patient.conditions.map((c) => (
                    <Badge key={c} variant="outline" className="bg-warning/10 text-warning border-warning/20">{c}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Pill className="h-4 w-4" /> Prescriptions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {patientRecords.flatMap((r) => r.prescriptions).length === 0 ? (
                <p className="text-sm text-muted-foreground">No prescriptions on file</p>
              ) : patientRecords.flatMap((r) => r.prescriptions).map((rx) => (
                <div key={rx.id} className="p-2 rounded border text-sm">
                  <p className="font-medium text-foreground">{rx.medication} — {rx.dosage}</p>
                  <p className="text-xs text-muted-foreground">{rx.frequency} • {rx.duration}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          
          <div className="lg:col-span-3">
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><FileText className="h-4 w-4" /> Medical History</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {patientRecords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No records found</p>
                ) : patientRecords.map((r) => (
                  <div key={r.id} className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-foreground">{r.diagnosis}</span>
                      <span className="text-xs text-muted-foreground">{r.date} • {r.doctor}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{r.clinicalNotes}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Select a patient to view their details</p>
        </div>
      )}
    </div>
  );
}
