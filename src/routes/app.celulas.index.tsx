import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar as CalIcon, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CellIncompleteBadge } from "@/components/cells/CellIncompleteBadge";
import { EmptyState } from "@/components/detail/DetailSection";
import { CardGridSkeleton } from "@/components/skeletons";
import { useAuth } from "@/lib/api/auth";
import { formatSchedule, useCells, type Cell } from "@/lib/api/cells";
import { formatDate, useCurrentSeason, useSeasons } from "@/lib/api/seasons";

const CURRENT_SEASON = "current";

// "Minhas células": the cells the person leads, co-leads or belongs to — even
// for a coordinator, whose campus-wide view lives in the "Coordenação" tab.
export const Route = createFileRoute("/app/celulas/")({
  component: MyCells,
});

function MyCells() {
  const { me } = useAuth();
  // Opens on the season running today; past seasons stay reachable as history.
  const [season, setSeason] = useState<string>(CURRENT_SEASON);
  const { data: cells, isLoading } = useCells({ season, mine: true });
  const { data: seasons } = useSeasons();
  const { data: currentSeason } = useCurrentSeason();

  const roleOf = (cell: Cell) => {
    if (cell.leaders.some((p) => p.id === me?.id)) return "Líder";
    if (cell.co_leaders.some((p) => p.id === me?.id)) return "Co-líder";
    return "Membro";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {season === CURRENT_SEASON
            ? currentSeason
              ? `Temporada ${currentSeason.name} (${formatDate(currentSeason.start_date)} a ${formatDate(currentSeason.end_date)})`
              : "Nenhuma temporada em andamento"
            : "Temporada anterior"}
        </p>
        <Select value={season} onValueChange={setSeason}>
          <SelectTrigger className="w-full sm:w-52" aria-label="Temporada">
            <SelectValue placeholder="Temporada" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CURRENT_SEASON}>Temporada atual</SelectItem>
            {(seasons ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
                {s.is_current ? " (atual)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <CardGridSkeleton />}
      {!isLoading && (cells ?? []).length === 0 && (
        <EmptyState>Você não participa de nenhuma célula nesta temporada.</EmptyState>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(cells ?? []).map((c) => {
          const schedule = formatSchedule(c.meeting_day, c.meeting_time);
          return (
            <Link key={c.id} to="/app/celulas/$id" params={{ id: c.id }} data-testid="my-cell">
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <Badge variant="secondary">{roleOf(c)}</Badge>
                      {schedule && (
                        <Badge variant="outline" className="gap-1">
                          <CalIcon className="h-3 w-3" /> {schedule}
                        </Badge>
                      )}
                      <CellIncompleteBadge cell={c} />
                    </div>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight">{c.name}</h3>
                  <p className="text-sm text-muted-foreground">{c.campus.name}</p>
                  <div className="mt-3 text-sm">
                    <span className="font-semibold tabular-nums">{c.member_count}</span>{" "}
                    <span className="text-muted-foreground">membros</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
