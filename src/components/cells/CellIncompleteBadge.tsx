import { CircleSlash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { describeMissingFields, type Cell } from "@/lib/api/cells";

// Shown on cell cards while day, time or audience is missing (the cell isn't active).
export function CellIncompleteBadge({ cell }: { cell: Pick<Cell, "missing_fields"> }) {
  if (cell.missing_fields.length === 0) return null;
  return (
    <Badge
      variant="outline"
      className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
      title={`Falta definir ${describeMissingFields(cell.missing_fields)}`}
    >
      <CircleSlash className="h-3 w-3" /> Incompleta
    </Badge>
  );
}
