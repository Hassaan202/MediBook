import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Eye, Ban, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { request } from "@/lib/http";

type PatientRow = {
  _id: string;
  userDetails?: { name?: string; email?: string; isActive?: boolean };
};

type DoctorRow = {
  id: string;
  specialty?: string;
  user?: { id?: string; name?: string; email?: string; isActive?: boolean };
};

type ListPatients = { patients: PatientRow[]; pagination: { total: number } };
type ListDoctors = { doctors: DoctorRow[]; pagination: { total: number } };

type UserRow = {
  key: string;
  profileId: string;
  userId: string;
  name: string;
  email: string;
  role: "patient" | "doctor";
  specialty?: string;
  isActive: boolean;
};

export default function UserManagement() {
  const [search, setSearch] = useState("");
  const [viewUser, setViewUser] = useState<UserRow | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: pData } = useQuery({
    queryKey: ["admin-patients", search],
    queryFn: () =>
      request<ListPatients>(
        `/api/patients?limit=200&page=1${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ""}`
      ),
  });

  const { data: dData } = useQuery({
    queryKey: ["admin-doctors", search],
    queryFn: () =>
      request<ListDoctors>(
        `/api/doctors?limit=200&page=1${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ""}`
      ),
  });

  const users = useMemo(() => {
    const rows: UserRow[] = [];
    (pData?.patients ?? []).forEach((p) => {
      const u = p.userDetails;
      if (!u) return;
      rows.push({
        key: `p-${p._id}`,
        profileId: String(p._id),
        userId: String((u as { _id?: string })._id || ""),
        name: u.name || "—",
        email: u.email || "",
        role: "patient",
        isActive: u.isActive !== false,
      });
    });
    (dData?.doctors ?? []).forEach((d) => {
      const u = d.user;
      rows.push({
        key: `d-${d.id}`,
        profileId: String(d.id),
        userId: String(u?.id || ""),
        name: u?.name || "—",
        email: u?.email || "",
        role: "doctor",
        specialty: d.specialty,
        isActive: u?.isActive !== false,
      });
    });
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [pData, dData]);

  const toggleMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      request(`/api/users/${userId}/active`, { method: "PATCH", json: { isActive } }),
    onSuccess: () => {
      toast({ title: "Updated" });
      void qc.invalidateQueries({ queryKey: ["admin-patients"] });
      void qc.invalidateQueries({ queryKey: ["admin-doctors"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (row: UserRow) => {
      if (row.role === "patient") {
        await request(`/api/patients/${row.profileId}`, { method: "DELETE" });
      } else {
        await request(`/api/doctors/${row.profileId}`, { method: "DELETE" });
      }
    },
    onSuccess: () => {
      toast({ title: "Deleted" });
      void qc.invalidateQueries({ queryKey: ["admin-patients"] });
      void qc.invalidateQueries({ queryKey: ["admin-doctors"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">User management</h2>
          <p className="text-muted-foreground">{users.length} profiles loaded</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Filter list…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-left">
                  <th className="p-4 font-medium">User</th>
                  <th className="p-4 font-medium">Role</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.key} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {u.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className="capitalize">
                        {u.role}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge
                        variant="outline"
                        className={
                          u.isActive ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"
                        }
                      >
                        {u.isActive ? "active" : "inactive"}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewUser(u)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={!u.userId || toggleMutation.isPending}
                          onClick={() =>
                            u.userId &&
                            toggleMutation.mutate({ userId: u.userId, isActive: !u.isActive })
                          }
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (window.confirm(`Delete ${u.role} ${u.name}? This cannot be undone.`)) {
                              deleteMutation.mutate(u);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!viewUser} onOpenChange={() => setViewUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User details</DialogTitle>
          </DialogHeader>
          {viewUser && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {viewUser.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground text-base">{viewUser.name}</p>
                  <p className="text-muted-foreground">{viewUser.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Role</p>
                  <p className="font-medium capitalize text-foreground">{viewUser.role}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="font-medium capitalize text-foreground">{viewUser.isActive ? "active" : "inactive"}</p>
                </div>
                {viewUser.specialty && (
                  <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                    <p className="text-xs text-muted-foreground">Specialty</p>
                    <p className="font-medium text-foreground">{viewUser.specialty}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
