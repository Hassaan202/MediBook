import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { medicalRecords } from "@/data/mockData";
import { FileText, Download, Pill, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MedicalRecords() {
  const records = medicalRecords.filter((r) => r.patientId === "p1");
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Medical Records</h2>
          <p className="text-muted-foreground">View your complete medical history</p>
        </div>
        <Button variant="outline" onClick={() => toast({ title: "Download started", description: "Your records are being prepared..." })}>
          <Download className="h-4 w-4 mr-2" /> Download All
        </Button>
      </div>

      {records.map((record) => (
        <Card key={record.id} className="shadow-card">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{record.diagnosis}</CardTitle>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{record.date}</span>
                  <span>•</span>
                  <span>{record.doctor}</span>
                </div>
              </div>
              <Badge variant="outline" className="bg-accent text-accent-foreground">
                <FileText className="h-3 w-3 mr-1" /> Record
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Clinical Notes</p>
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">{record.clinicalNotes}</p>
            </div>

            {record.prescriptions.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-1">
                  <Pill className="h-4 w-4" /> Prescriptions
                </p>
                <div className="space-y-2">
                  {record.prescriptions.map((rx) => (
                    <div key={rx.id} className="p-3 rounded-lg border text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{rx.medication}</span>
                        <Badge variant="secondary">{rx.dosage}</Badge>
                      </div>
                      <p className="text-muted-foreground mt-1">
                        {rx.frequency} • {rx.duration} • {rx.instructions}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
