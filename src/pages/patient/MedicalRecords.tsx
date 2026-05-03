import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Pill, Calendar } from "lucide-react";
import { format } from "date-fns";
import { request } from "@/lib/http";

type MedRecord = {
  _id: string;
  visitDate: string;
  diagnosis: string;
  clinicalNotes: string;
  doctorDetails?: { userDetails?: { name?: string } };
};

type MedRes = { records: MedRecord[]; pagination: { total: number } };

type Rx = {
  _id: string;
  medicalRecordId?: string | null;
  medications: {
    medicationName: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }[];
};

type RxRes = { prescriptions: Rx[]; pagination: { total: number } };

function formatVisit(iso: string) {
  try {
    return format(new Date(iso), "MMM d, yyyy");
  } catch {
    return iso;
  }
}

export default function MedicalRecords() {
  const { data: med } = useQuery({
    queryKey: ["patient-medical-records"],
    queryFn: () => request<MedRes>("/api/medical-records?limit=100&page=1"),
  });

  const { data: rxData } = useQuery({
    queryKey: ["patient-prescriptions-all"],
    queryFn: () => request<RxRes>("/api/prescriptions?limit=200&page=1"),
  });

  const rxByRecord = useMemo(() => {
    const m = new Map<string, Rx[]>();
    (rxData?.prescriptions ?? []).forEach((p) => {
      const rid = p.medicalRecordId ? String(p.medicalRecordId) : "";
      if (!rid) return;
      const arr = m.get(rid) ?? [];
      arr.push(p);
      m.set(rid, arr);
    });
    return m;
  }, [rxData]);

  const records = med?.records ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Medical records</h2>
        <p className="text-muted-foreground">History from your MediBook providers</p>
      </div>

      {records.length === 0 && <p className="text-muted-foreground text-sm">No records yet.</p>}

      {records.map((record) => {
        const doctorName = record.doctorDetails?.userDetails?.name || "Doctor";
        const linked = rxByRecord.get(String(record._id)) ?? [];
        return (
          <Card key={record._id} className="shadow-card">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">{record.diagnosis}</CardTitle>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatVisit(record.visitDate)}</span>
                    <span>•</span>
                    <span>{doctorName}</span>
                  </div>
                </div>
                <Badge variant="outline" className="bg-accent text-accent-foreground shrink-0">
                  <FileText className="h-3 w-3 mr-1" /> Record
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Clinical notes</p>
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg whitespace-pre-wrap">
                  {record.clinicalNotes}
                </p>
              </div>

              {linked.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-1">
                    <Pill className="h-4 w-4" /> Linked prescriptions
                  </p>
                  <div className="space-y-2">
                    {linked.flatMap((p) =>
                      (p.medications ?? []).map((med, idx) => (
                        <div key={`${p._id}-${idx}`} className="p-3 rounded-lg border text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-foreground">{med.medicationName}</span>
                            <Badge variant="secondary">{med.dosage}</Badge>
                          </div>
                          <p className="text-muted-foreground mt-1">
                            {med.frequency} • {med.duration}
                            {med.instructions ? ` • ${med.instructions}` : ""}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
