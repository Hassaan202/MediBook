import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { patientProfiles, doctors } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import { Search, Eye, Ban, Trash2, Users } from "lucide-react";

interface UserItem {
  id: string; name: string; email: string; role: "patient" | "doctor"; specialty?: string; status: "active" | "suspended";
}

const initialUsers: UserItem[] = [
  ...patientProfiles.map((p) => ({ id: p.id, name: p.name, email: p.email, role: "patient" as const, status: "active" as const })),
  ...doctors.map((d) => ({ id: d.id, name: d.name, email: `${d.name.toLowerCase().replace(/[^a-z]/g, "")}@hospital.com`, role: "doctor" as const, specialty: d.specialty, status: "active" as const })),
];

export default function UserManagement() {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [viewUser, setViewUser] = useState<UserItem | null>(null);
  const { toast } = useToast();

  const filtered = users.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  const handleSuspend = (id: string) => {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, status: u.status === "active" ? "suspended" : "active" } : u));
    toast({ title: "User status updated" });
  };

  const handleDelete = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    toast({ title: "User deleted" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">User Management</h2>
          <p className="text-muted-foreground">{users.length} total users</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-muted-foreground text-left">
                <th className="p-4 font-medium">User</th><th className="p-4 font-medium">Role</th><th className="p-4 font-medium">Status</th><th className="p-4 font-medium text-right">Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/10 text-primary text-xs">{u.name.split(" ").map(n => n[0]).join("")}</AvatarFallback></Avatar>
                        <div><p className="font-medium text-foreground">{u.name}</p><p className="text-xs text-muted-foreground">{u.email}</p></div>
                      </div>
                    </td>
                    <td className="p-4"><Badge variant="outline" className="capitalize">{u.role}</Badge></td>
                    <td className="p-4">
                      <Badge variant="outline" className={u.status === "active" ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"}>
                        {u.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewUser(u)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleSuspend(u.id)}><Ban className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(u.id)}><Trash2 className="h-4 w-4" /></Button>
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
          <DialogHeader><DialogTitle>User Details</DialogTitle></DialogHeader>
          {viewUser && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12"><AvatarFallback className="bg-primary text-primary-foreground">{viewUser.name.split(" ").map(n => n[0]).join("")}</AvatarFallback></Avatar>
                <div><p className="font-semibold text-foreground text-base">{viewUser.name}</p><p className="text-muted-foreground">{viewUser.email}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground">Role</p><p className="font-medium capitalize text-foreground">{viewUser.role}</p></div>
                <div className="p-3 rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground">Status</p><p className="font-medium capitalize text-foreground">{viewUser.status}</p></div>
                {viewUser.specialty && <div className="p-3 rounded-lg bg-muted/50 col-span-2"><p className="text-xs text-muted-foreground">Specialty</p><p className="font-medium text-foreground">{viewUser.specialty}</p></div>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
