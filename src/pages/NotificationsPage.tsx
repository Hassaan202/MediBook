import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { request } from "@/lib/http";
import { useToast } from "@/hooks/use-toast";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";

type NotificationItem = {
  _id: string;
  title: string;
  message: string;
  type: string;
  isRead?: boolean;
  priority?: string;
  createdAt?: string;
};

type ListRes = { notifications: NotificationItem[]; pagination: { total: number } };

export default function NotificationsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => request<ListRes>("/api/notifications?limit=100&page=1"),
  });

  const items = data?.notifications ?? [];

  const markRead = useMutation({
    mutationFn: (id: string) => request(`/api/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const markAll = useMutation({
    mutationFn: () => request("/api/notifications/mark-all-read", { method: "PATCH" }),
    onSuccess: () => {
      toast({ title: "All read" });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => request(`/api/notifications/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="h-7 w-7 text-primary" />
            Notifications
          </h2>
          <p className="text-muted-foreground">
            {isLoading ? "Loading…" : `${data?.pagination?.total ?? items.length} from the database`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => markAll.mutate()} disabled={markAll.isPending || items.length === 0}>
          <CheckCheck className="h-4 w-4 mr-2" />
          Mark all read
        </Button>
      </div>

      <div className="space-y-3">
        {items.map((n) => (
          <Card key={n._id} className={n.isRead ? "opacity-80" : "border-primary/30"}>
            <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="text-base font-semibold leading-tight">{n.title}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1 capitalize">{n.type.replace(/_/g, " ")}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!n.isRead && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => markRead.mutate(n._id)} title="Mark read">
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove.mutate(n._id)} title="Delete">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-foreground whitespace-pre-wrap">{n.message}</p>
              <div className="flex flex-wrap gap-2 items-center text-xs text-muted-foreground">
                {n.priority && (
                  <Badge variant="outline" className="capitalize">
                    {n.priority}
                  </Badge>
                )}
                {n.createdAt ? (
                  <span>
                    {(() => {
                      try {
                        return format(new Date(n.createdAt), "yyyy-MM-dd HH:mm");
                      } catch {
                        return n.createdAt;
                      }
                    })()}
                  </span>
                ) : null}
                {!n.isRead && <Badge variant="secondary">Unread</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!isLoading && items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-12">No notifications yet.</p>
      )}
    </div>
  );
}
