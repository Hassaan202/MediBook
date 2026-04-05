import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  upcoming: { label: "Upcoming", className: "bg-info/10 text-info border-info/20" },
  completed: { label: "Completed", className: "bg-success/10 text-success border-success/20" },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive border-destructive/20" },
  active: { label: "Active", className: "bg-success/10 text-success border-success/20" },
  suspended: { label: "Suspended", className: "bg-warning/10 text-warning border-warning/20" },
  auth: { label: "Auth", className: "bg-info/10 text-info border-info/20" },
  data: { label: "Data", className: "bg-accent text-accent-foreground border-accent" },
  admin: { label: "Admin", className: "bg-warning/10 text-warning border-warning/20" },
  clinical: { label: "Clinical", className: "bg-success/10 text-success border-success/20" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <Badge variant="outline" className={`${config.className} font-medium text-xs`}>
      {config.label}
    </Badge>
  );
}
