import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Download } from "lucide-react";
import { format } from "date-fns";
import { request } from "@/lib/http";

type LogRow = {
  id: string;
  userName: string;
  action: string;
  details: string;
  type: string;
  timestamp: string;
};

type LogsRes = { logs: LogRow[]; pagination: { total: number } };

export default function AuditLogs() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const { toast } = useToast();

  const q = `/api/audit-logs?limit=150&page=1${typeFilter !== "all" ? `&category=${encodeURIComponent(typeFilter)}` : ""}`;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-audit", typeFilter],
    queryFn: () => request<LogsRes>(q),
  });

  const rows = data?.logs ?? [];
  const filtered = rows.filter((log) => {
    const s = search.toLowerCase();
    if (!s) return true;
    return (
      log.userName.toLowerCase().includes(s) ||
      log.action.toLowerCase().includes(s) ||
      String(log.details).toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Audit logs</h2>
          <p className="text-muted-foreground">Server-side activity from MediBook</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "audit-export.json";
            a.click();
            URL.revokeObjectURL(url);
            toast({ title: "Export", description: "Downloaded current filtered rows as JSON." });
          }}
        >
          <Download className="h-4 w-4 mr-2" /> Export JSON
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Filter loaded rows…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value="auth">Auth</SelectItem>
            <SelectItem value="data">Data</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="clinical">Clinical</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isError && (
        <p className="text-destructive text-sm">{error instanceof Error ? error.message : "Failed to load"}</p>
      )}
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-left">
                  <th className="p-4 font-medium">User</th>
                  <th className="p-4 font-medium">Action</th>
                  <th className="p-4 font-medium">Details</th>
                  <th className="p-4 font-medium">Type</th>
                  <th className="p-4 font-medium">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-4 font-medium text-foreground">{log.userName}</td>
                    <td className="p-4 text-foreground">{log.action}</td>
                    <td className="p-4 text-muted-foreground max-w-xs truncate">{log.details}</td>
                    <td className="p-4">
                      <StatusBadge status={log.type} />
                    </td>
                    <td className="p-4 text-muted-foreground text-xs whitespace-nowrap">
                      {(() => {
                        try {
                          return format(new Date(log.timestamp), "yyyy-MM-dd HH:mm");
                        } catch {
                          return log.timestamp;
                        }
                      })()}
                    </td>
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
