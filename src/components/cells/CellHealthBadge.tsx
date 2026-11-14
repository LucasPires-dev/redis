import { Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CELL_HEALTH_LABEL, type Cell, type CellHealthStatus } from "@/lib/api/cells";

export const HEALTH_CLASS: Record<CellHealthStatus, string> = {
  critical: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400",
  attention: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  healthy: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  new: "border-border bg-muted text-muted-foreground",
};

export const HEALTH_DOT: Record<CellHealthStatus, string> = {
  critical: "bg-red-500",
  attention: "bg-amber-500",
  healthy: "bg-emerald-500",
  new: "bg-muted-foreground/50",
};

// The cell's health (green/yellow/red) with its reasons on hover. Only cells
// the user manages carry health, so plain members never see it.
export function CellHealthBadge({
  cell,
  className,
}: {
  cell: Pick<Cell, "health">;
  className?: string;
}) {
  const health = cell.health;
  if (!health) return null;
  const reasons = health.reasons.map((r) => r.text).join(" · ");
  return (
    <Badge
      variant="outline"
      data-testid="cell-health"
      data-status={health.status}
      className={cn("gap-1", HEALTH_CLASS[health.status], className)}
      title={reasons || undefined}
    >
      <Activity className="h-3 w-3" /> {CELL_HEALTH_LABEL[health.status]}
    </Badge>
  );
}
