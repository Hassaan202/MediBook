import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { auditLogs } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import { Search, Download, Shield } from "lucide-react";

export default function AuditLogs() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const { toast } = useToast();

  const filtered = auditLogs.filter((log) => {
    const matchSearch = log.userName.toLowerCase().includes(search.toLowerCase()) || log.action.toLowerCase().includes(search.toLowerCase()) || log.details.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || log.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Audit Logs</h2>
          <p className="text-muted-foreground">Track all system activities</p>
        </div>
        <Button variant="outline" onClick={() => toast({ title: "Export started", description: "Logs are being exported to CSV..." })}>
          <Download className="h-4 w-4 mr-2" /> Export
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="auth">Auth</SelectItem>
            <SelectItem value="data">Data</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="clinical">Clinical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-muted-foreground text-left">
                <th className="p-4 font-medium">User</th><th className="p-4 font-medium">Action</th><th className="p-4 font-medium">Details</th><th className="p-4 font-medium">Type</th><th className="p-4 font-medium">Timestamp</th>
              </tr></thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-4 font-medium text-foreground">{log.userName}</td>
                    <td className="p-4 text-foreground">{log.action}</td>
                    <td className="p-4 text-muted-foreground max-w-xs truncate">{log.details}</td>
                    <td className="p-4"><StatusBadge status={log.type} /></td>
                    <td className="p-4 text-muted-foreground text-xs whitespace-nowrap">{log.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
