import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Eye, Ban, Trash2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { request } from "@/lib/http";
import { useAuth } from "@/hooks/useAuth";
import { Separator } from "@/components/ui/separator";
import {
  AdminAccountSummary,
  AdminActivityLog,
  AdminProfileFields,
  AdminProfileSection,
  AdminProfileSections,
  type ActivityEntry,
} from "@/components/admin/AdminProfileDisplay";

type AdminUser = {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive?: boolean;
  createdAt?: string;
  emailVerified?: boolean;
  registrationApproved?: boolean;
  registrationRejectedAt?: string | null;
  lastLogin?: string | null;
};

type ListUsersRes = { users: AdminUser[]; pagination: { total: number } };

type UserDetailRes = {
  user: AdminUser;
  profile: Record<string, unknown> | null;
  recentActivity: ActivityEntry[];
};

function passwordClientError(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters";
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/\d/.test(pw)) {
    return "Password must include uppercase, lowercase, and a number";
  }
  return null;
}

export default function UserManagement() {
  const [search, setSearch] = useState("");
  const [viewId, setViewId] = useState<string | null>(null);
  const [patientOpen, setPatientOpen] = useState(false);
  const [doctorOpen, setDoctorOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();
  const auth = useAuth();
  const sessionUserId = auth?.user?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: () =>
      request<ListUsersRes>(
        `/api/admin/users?limit=200&page=1${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ""}`
      ),
  });

  const { data: detail } = useQuery({
    queryKey: ["admin-user", viewId],
    queryFn: () => request<UserDetailRes>(`/api/admin/users/${viewId}`),
    enabled: Boolean(viewId),
  });

  const users = data?.users ?? [];
  const total = data?.pagination?.total ?? users.length;

  const [pEmail, setPEmail] = useState("");
  const [pPassword, setPPassword] = useState("");
  const [pName, setPName] = useState("");
  const [pDob, setPDob] = useState("1990-01-15");
  const [pGender, setPGender] = useState("Male");
  const [pBlood, setPBlood] = useState("O+");
  const [pPhone, setPPhone] = useState("");
  const [pStreet, setPStreet] = useState("");
  const [pCity, setPCity] = useState("");
  const [pState, setPState] = useState("");
  const [pZip, setPZip] = useState("");
  const [pCountry, setPCountry] = useState("");
  const [ecName, setEcName] = useState("");
  const [ecPhone, setEcPhone] = useState("");
  const [ecRel, setEcRel] = useState("Family");

  const [dEmail, setDEmail] = useState("");
  const [dPassword, setDPassword] = useState("");
  const [dName, setDName] = useState("");
  const [dSpecialty, setDSpecialty] = useState("");
  const [dExperience, setDExperience] = useState("5");
  const [dFees, setDFees] = useState("150");

  const resetPatientForm = () => {
    setPEmail("");
    setPPassword("");
    setPName("");
    setPDob("1990-01-15");
    setPGender("Male");
    setPBlood("O+");
    setPPhone("");
    setPStreet("");
    setPCity("");
    setPState("");
    setPZip("");
    setPCountry("");
    setEcName("");
    setEcPhone("");
    setEcRel("Family");
  };

  const resetDoctorForm = () => {
    setDEmail("");
    setDPassword("");
    setDName("");
    setDSpecialty("");
    setDExperience("5");
    setDFees("150");
  };

  const createPatientMutation = useMutation({
    mutationFn: () =>
      request("/api/admin/users", {
        method: "POST",
        json: {
          email: pEmail.trim(),
          password: pPassword,
          name: pName.trim(),
          role: "patient",
          dateOfBirth: pDob,
          gender: pGender,
          bloodType: pBlood,
          phone: pPhone.trim(),
          address: {
            street: pStreet.trim(),
            city: pCity.trim(),
            state: pState.trim(),
            zipCode: pZip.trim(),
            country: pCountry.trim(),
          },
          emergencyContact: {
            name: ecName.trim(),
            phone: ecPhone.trim(),
            relationship: ecRel.trim() || "Family",
          },
        },
      }),
    onSuccess: () => {
      toast({ title: "Patient created" });
      setPatientOpen(false);
      resetPatientForm();
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createDoctorMutation = useMutation({
    mutationFn: () =>
      request("/api/admin/users", {
        method: "POST",
        json: {
          email: dEmail.trim(),
          password: dPassword,
          name: dName.trim(),
          role: "doctor",
          specialty: dSpecialty.trim(),
          experience: Number(dExperience),
          fees: Number(dFees),
        },
      }),
    onSuccess: () => {
      toast({ title: "Doctor created" });
      setDoctorOpen(false);
      resetDoctorForm();
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, nextActive }: { id: string; nextActive: boolean }) => {
      const path = nextActive ? "activate" : "deactivate";
      await request(`/api/admin/users/${id}/${path}`, { method: "PATCH" });
    },
    onSuccess: () => {
      toast({ title: "Updated" });
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
      void qc.invalidateQueries({ queryKey: ["admin-user"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => request(`/api/admin/users/${id}?hard=true`, { method: "DELETE" }),
    onSuccess: () => {
      toast({ title: "Removed" });
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
      setViewId(null);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">User management</h2>
          <p className="text-muted-foreground">
            {isLoading ? "Loading…" : `${total} user${total === 1 ? "" : "s"} from the database`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setPatientOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add patient
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDoctorOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add doctor
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
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
                {users.map((u) => {
                  const active = u.isActive !== false;
                  const isAdmin = u.role === "admin";
                  const isSelf = sessionUserId && String(u._id) === String(sessionUserId);
                  return (
                    <tr key={u._id} className="border-b last:border-0 hover:bg-muted/30">
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
                            active
                              ? "bg-success/10 text-success border-success/20"
                              : "bg-warning/10 text-warning border-warning/20"
                          }
                        >
                          {active ? "active" : "inactive"}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewId(u._id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              disabled={toggleMutation.isPending}
                              onClick={() => toggleMutation.mutate({ id: u._id, nextActive: !active })}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                          {!isAdmin && !isSelf && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              disabled={deleteMutation.isPending}
                              onClick={() => {
                                if (window.confirm(`Permanently remove ${u.name} (${u.role})? This cannot be undone.`)) {
                                  deleteMutation.mutate(u._id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(viewId)} onOpenChange={(o) => !o && setViewId(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>User details</DialogTitle>
          </DialogHeader>
          {detail?.user && (
            <div className="space-y-1 text-sm pt-1">
              <div className="flex items-center gap-3 pb-2">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {detail.user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground text-base">{detail.user.name}</p>
                  <p className="text-muted-foreground text-sm">{detail.user.email}</p>
                  <Badge variant="outline" className="mt-2 capitalize">
                    {detail.user.role}
                  </Badge>
                </div>
              </div>

              <Separator />

              <AdminProfileSections>
                <AdminProfileSection title="Account">
                  <AdminAccountSummary user={detail.user} />
                </AdminProfileSection>

                {detail.user.role !== "admin" ? (
                  <AdminProfileSection title={detail.user.role === "doctor" ? "Doctor profile" : "Patient profile"}>
                    <AdminProfileFields role={detail.user.role} profile={detail.profile} />
                  </AdminProfileSection>
                ) : (
                  <AdminProfileSection title="Clinical profile">
                    <p className="text-sm text-muted-foreground">Administrators do not have a patient or doctor profile.</p>
                  </AdminProfileSection>
                )}

                <AdminProfileSection title="Recent activity">
                  <div className="max-h-56 overflow-y-auto pr-1">
                    <AdminActivityLog entries={detail.recentActivity ?? []} />
                  </div>
                </AdminProfileSection>
              </AdminProfileSections>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={patientOpen}
        onOpenChange={(o) => {
          setPatientOpen(o);
          if (!o) resetPatientForm();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create patient</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Full name</Label>
              <Input value={pName} onChange={(e) => setPName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={pEmail} onChange={(e) => setPEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={pPassword} onChange={(e) => setPPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Date of birth</Label>
              <Input type="date" value={pDob} onChange={(e) => setPDob(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={pPhone} onChange={(e) => setPPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={pGender} onValueChange={setPGender}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Male", "Female", "Other"].map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Blood type</Label>
              <Select value={pBlood} onValueChange={setPBlood}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Address</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input placeholder="Street" value={pStreet} onChange={(e) => setPStreet(e.target.value)} />
                <Input placeholder="City" value={pCity} onChange={(e) => setPCity(e.target.value)} />
                <Input placeholder="State" value={pState} onChange={(e) => setPState(e.target.value)} />
                <Input placeholder="ZIP" value={pZip} onChange={(e) => setPZip(e.target.value)} />
                <Input className="sm:col-span-2" placeholder="Country" value={pCountry} onChange={(e) => setPCountry(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2 border-t pt-3">
              <p className="text-xs font-medium text-muted-foreground">Emergency contact</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <Input placeholder="Name" value={ecName} onChange={(e) => setEcName(e.target.value)} />
                <Input placeholder="Phone" value={ecPhone} onChange={(e) => setEcPhone(e.target.value)} />
                <Input placeholder="Relationship" value={ecRel} onChange={(e) => setEcRel(e.target.value)} />
              </div>
            </div>
          </div>
          <Button
            className="w-full mt-4"
            disabled={createPatientMutation.isPending}
            onClick={() => {
              const pe = passwordClientError(pPassword);
              if (pe) {
                toast({ title: "Validation", description: pe, variant: "destructive" });
                return;
              }
              if (!pName.trim() || !pEmail.trim() || !pPhone.trim() || !ecName.trim() || !ecPhone.trim()) {
                toast({
                  title: "Validation",
                  description: "Name, email, phone, and emergency contact are required.",
                  variant: "destructive",
                });
                return;
              }
              createPatientMutation.mutate();
            }}
          >
            {createPatientMutation.isPending ? "Creating…" : "Create patient"}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog
        open={doctorOpen}
        onOpenChange={(o) => {
          setDoctorOpen(o);
          if (!o) resetDoctorForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create doctor</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input value={dName} onChange={(e) => setDName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={dEmail} onChange={(e) => setDEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={dPassword} onChange={(e) => setDPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Specialty</Label>
              <Input value={dSpecialty} onChange={(e) => setDSpecialty(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Experience (years)</Label>
                <Input value={dExperience} onChange={(e) => setDExperience(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fees</Label>
                <Input value={dFees} onChange={(e) => setDFees(e.target.value)} />
              </div>
            </div>
          </div>
          <Button
            className="w-full mt-4"
            disabled={createDoctorMutation.isPending}
            onClick={() => {
              const pe = passwordClientError(dPassword);
              if (pe) {
                toast({ title: "Validation", description: pe, variant: "destructive" });
                return;
              }
              if (!dName.trim() || !dEmail.trim() || !dSpecialty.trim()) {
                toast({ title: "Validation", description: "Name, email, and specialty are required.", variant: "destructive" });
                return;
              }
              const ex = Number(dExperience);
              const fe = Number(dFees);
              if (!Number.isFinite(ex) || ex < 0 || !Number.isFinite(fe) || fe < 0) {
                toast({ title: "Validation", description: "Experience and fees must be valid numbers.", variant: "destructive" });
                return;
              }
              createDoctorMutation.mutate();
            }}
          >
            {createDoctorMutation.isPending ? "Creating…" : "Create doctor"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
