import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, FileText, AlertTriangle, Pill } from "lucide-react";
import { request } from "@/lib/http";
import { format } from "date-fns";
import type { AppointmentApi } from "@/lib/appointmentsDisplay";

type ListRes = { appointments: AppointmentApi[] };

type PatientUser = { name?: string; email?: string };
type PatientDoc = {
  _id: string;
  gender?: string;
  bloodType?: string;
  phone?: string;
  allergies?: string[];
  chronicConditions?: string[];
  emergencyContact?: { name?: string; phone?: string };
  userDetails?: PatientUser;
  age?: number | null;
};

type PatientRes = { patient: PatientDoc };

type HistRes = {
  summary: {
    totalVisits?: number;
    recentDiagnoses?: string[];
    patient?: { chronicConditions?: string[] };
  };
  records: { _id: string; diagnosis: string; visitDate: string; clinicalNotes: string }[];
};

type RxRes = { prescriptions: { _id: string; medications: { medicationName: string; dosage: string; frequency: string; duration: string }[] }[] };

export default function ConsultationPage() {
  const [selectedPatient, setSelectedPatient] = useState("");

  const { data: apptData } = useQuery({
    queryKey: ["doctor-consult-appts"],
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

  const { data: patientData } = useQuery({
    queryKey: ["doctor-consult-patient", selectedPatient],
    enabled: Boolean(selectedPatient),
    queryFn: () => request<PatientRes>(`/api/patients/${selectedPatient}`),
  });

  const { data: histData } = useQuery({
    queryKey: ["doctor-consult-history", selectedPatient],
    enabled: Boolean(selectedPatient),
    queryFn: () => request<HistRes>(`/api/patients/${selectedPatient}/medical-history`),
  });

  const { data: rxData } = useQuery({
    queryKey: ["doctor-consult-rx", selectedPatient],
    enabled: Boolean(selectedPatient),
    queryFn: () => request<RxRes>(`/api/prescriptions/patient/${selectedPatient}?limit=50&page=1`),
  });

  const patient = patientData?.patient;
  const displayName = patient?.userDetails?.name || "Patient";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const records = histData?.records ?? [];
  const rxList = rxData?.prescriptions ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Consultations</h2>
        <p className="text-muted-foreground">Patients you have seen or are scheduled with</p>
      </div>

      <div className="max-w-sm">
        <Select value={selectedPatient} onValueChange={setSelectedPatient}>
          <SelectTrigger>
            <SelectValue placeholder="Select a patient" />
          </SelectTrigger>
          <SelectContent>
            {patientOptions.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedPatient && patient ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-4 w-4" /> Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground">{displayName}</p>
                  <p className="text-sm text-muted-foreground">
                    {patient.age != null ? `${patient.age} yrs` : "—"}, {patient.gender}
                  </p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Blood type</span>
                  <span className="font-medium text-foreground">{patient.bloodType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-medium text-foreground">{patient.phone}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">Emergency</span>
                  <span className="font-medium text-foreground text-xs text-right">
                    {patient.emergencyContact?.name} {patient.emergencyContact?.phone}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Allergies & conditions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Allergies</p>
                <div className="flex flex-wrap gap-2">
                  {(patient.allergies ?? []).length > 0 ? (
                    (patient.allergies ?? []).map((a) => (
                      <Badge key={a} variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                        {a}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">None</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Chronic conditions</p>
                <div className="flex flex-wrap gap-2">
                  {(patient.chronicConditions ?? []).length > 0 ? (
                    (patient.chronicConditions ?? []).map((c) => (
                      <Badge key={c} variant="outline" className="bg-warning/10 text-warning border-warning/20">
                        {c}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">None on file</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Pill className="h-4 w-4" /> Prescriptions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {rxList.length === 0 ? (
                <p className="text-sm text-muted-foreground">No prescriptions for this patient</p>
              ) : (
                rxList.flatMap((p) =>
                  (p.medications ?? []).map((med, idx) => (
                    <div key={`${p._id}-${idx}`} className="p-2 rounded border text-sm">
                      <p className="font-medium text-foreground">
                        {med.medicationName} — {med.dosage}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {med.frequency} • {med.duration}
                      </p>
                    </div>
                  ))
                )
              )}
            </CardContent>
          </Card>

          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Medical history
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {histData?.summary && (
                  <p className="text-xs text-muted-foreground">
                    Total visits (summary): {histData.summary.totalVisits ?? "—"}
                    {histData.summary.recentDiagnoses?.length
                      ? ` • Recent: ${histData.summary.recentDiagnoses.join(", ")}`
                      : ""}
                  </p>
                )}
                {records.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No medical records yet</p>
                ) : (
                  records.map((r) => (
                    <div key={r._id} className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <span className="font-medium text-foreground">{r.diagnosis}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(r.visitDate), "MMM d, yyyy")}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.clinicalNotes}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Select a patient to load live chart data</p>
        </div>
      )}
    </div>
  );
}
