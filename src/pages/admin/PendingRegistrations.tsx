import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { request } from "@/lib/http";
import { Check, X, Mail, Calendar, User } from "lucide-react";
import { AdminProfileFields, formatDisplayDate } from "@/components/admin/AdminProfileDisplay";

type LeanUser = {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
};

type PendingRow = { user: LeanUser; profile: Record<string, unknown> | null };

type PendingRes = { pending: PendingRow[] };

type DialogState =
  | null
  | { kind: "approve"; row: PendingRow }
  | { kind: "reject"; row: PendingRow };

export default function PendingRegistrations() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [rejectMessage, setRejectMessage] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-pending-registrations"],
    queryFn: () => request<PendingRes>("/api/admin/pending-registrations"),
  });

  const rows = data?.pending ?? [];

  const closeDialog = () => {
    setDialog(null);
    setRejectMessage("");
  };

  const approve = useMutation({
    mutationFn: (id: string) => request(`/api/admin/registrations/${id}/approve`, { method: "POST" }),
    onSuccess: () => {
      toast({ title: "Approved", description: "The applicant has been emailed and can sign in." });
      void qc.invalidateQueries({ queryKey: ["admin-pending-registrations"] });
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
      closeDialog();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const reject = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      request(`/api/admin/registrations/${id}/reject`, {
        method: "POST",
        json: { message: message.trim() },
      }),
    onSuccess: () => {
      toast({ title: "Rejected", description: "The applicant has been notified by email." });
      void qc.invalidateQueries({ queryKey: ["admin-pending-registrations"] });
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
      closeDialog();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Pending registrations</h2>
        <p className="text-muted-foreground">
          {isLoading ? "Loading…" : "These users verified their email and are waiting for your decision."}
        </p>
      </div>

      <div className="space-y-4">
        {rows.map(({ user, profile }) => (
          <Card key={user._id} className="overflow-hidden border-border/80">
            <CardHeader className="space-y-3 bg-muted/30 border-b border-border/60 pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg leading-tight">{user.name}</CardTitle>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        {user.email}
                      </span>
                      {user.createdAt ? (
                        <span className="inline-flex items-center gap-1 text-xs">
                          <Calendar className="h-3.5 w-3.5" />
                          Requested {formatDisplayDate(user.createdAt)}
                        </span>
                      ) : null}
                    </div>
                    <Badge variant="secondary" className="mt-2 capitalize">
                      {user.role}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <Button
                    size="sm"
                    disabled={approve.isPending || reject.isPending}
                    onClick={() => setDialog({ kind: "approve", row: { user, profile } })}
                  >
                    <Check className="h-4 w-4 mr-1.5" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-destructive/40 text-destructive hover:bg-destructive/10"
                    disabled={approve.isPending || reject.isPending}
                    onClick={() => {
                      setRejectMessage("");
                      setDialog({ kind: "reject", row: { user, profile } });
                    }}
                  >
                    <X className="h-4 w-4 mr-1.5" /> Reject
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Registration details
              </p>
              <AdminProfileFields role={user.role} profile={profile} />
            </CardContent>
          </Card>
        ))}
      </div>

      {!isLoading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-10 rounded-lg border border-dashed border-border">
          No pending registrations. New requests appear after users verify their email.
        </p>
      )}

      <AlertDialog open={dialog !== null} onOpenChange={(o) => !o && closeDialog()}>
        <AlertDialogContent className="max-w-md">
          {dialog?.kind === "approve" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Approve registration?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3 text-left text-muted-foreground">
                    <p>
                      You are about to approve <strong className="text-foreground">{dialog.row.user.name}</strong> (
                      {dialog.row.user.email}) as a <strong className="text-foreground capitalize">{dialog.row.user.role}</strong>.
                    </p>
                    <Separator />
                    <p className="text-sm">They will receive an email that their account is active and may sign in immediately.</p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={approve.isPending}>Cancel</AlertDialogCancel>
                <Button
                  disabled={approve.isPending}
                  onClick={() => approve.mutate(dialog.row.user._id)}
                >
                  {approve.isPending ? "Approving…" : "Confirm approval"}
                </Button>
              </AlertDialogFooter>
            </>
          )}
          {dialog?.kind === "reject" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Reject registration?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3 text-left text-muted-foreground">
                    <p>
                      This will decline <strong className="text-foreground">{dialog.row.user.name}</strong> (
                      {dialog.row.user.email}). Their account will be deactivated and they will receive an email.
                    </p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2 py-1">
                <Label htmlFor="reject-note" className="text-foreground">
                  Message to applicant (optional)
                </Label>
                <Textarea
                  id="reject-note"
                  placeholder="e.g. We could not verify your clinic affiliation. Please contact reception."
                  value={rejectMessage}
                  onChange={(e) => setRejectMessage(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">Shown in the rejection email so the user understands why.</p>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={reject.isPending}>Cancel</AlertDialogCancel>
                <Button
                  variant="destructive"
                  disabled={reject.isPending}
                  onClick={() =>
                    reject.mutate({ id: dialog.row.user._id, message: rejectMessage })
                  }
                >
                  {reject.isPending ? "Rejecting…" : "Confirm rejection"}
                </Button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
