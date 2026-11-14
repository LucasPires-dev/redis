import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { CalendarX, ClipboardCheck, GraduationCap, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DetailSkeleton } from "@/components/skeletons";
import { EmptyState } from "@/components/detail/DetailSection";
import { CellHealthBadge } from "@/components/cells/CellHealthBadge";
import { capabilitiesOf, useMe } from "@/lib/api/auth";
import { CELL_HEALTH_ORDER, formatSchedule, useCells, type Cell } from "@/lib/api/cells";
import { formatDate } from "@/lib/api/seasons";

// "Supervisão": the cells the person supervises, the most urgent first, with
// what a supervisor checks: health, meetings without a record and the last
// visit. Each card opens the cell, where the visits are registered.
export const Route = createFileRoute("/app/celulas/supervisao")({
  head: () => ({ meta: [{ title: "Supervisão de células — Redis" }] }),
  component: SupervisionPage,
});

const DAY_MS = 24 * 60 * 60 * 1000;

function daysSince(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const today = new Date();
  const start = Date.UTC(y, m - 1, d);
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((now - start) / DAY_MS);
}

function lastVisitLabel(cell: Cell): { text: string; late: boolean } {
  if (!cell.last_supervision_visit) return { text: "Nenhuma visita ainda", late: true };
  const days = daysSince(cell.last_supervision_visit);
  const when = days === 0 ? "hoje" : days === 1 ? "ontem" : `há ${days} dias`;
  // A month without a visit deserves attention.
  return {
    text: `Última visita ${when} (${formatDate(cell.last_supervision_visit)})`,
    late: days > 30,
  };
}

function SupervisionPage() {
  const { data: me, isLoading: meLoading } = useMe();
  const canSee = capabilitiesOf(me).cells.supervise;
  const { data: cells, isLoading } = useCells({ season: "current", supervised: true });

  if (me && !canSee) return <Navigate to="/app/celulas" replace />;
  if (meLoading) return <DetailSkeleton />;

  const sorted = (cells ?? [])
    .slice()
    .sort(
      (a, b) =>
        CELL_HEALTH_ORDER[a.health?.status ?? "new"] -
          CELL_HEALTH_ORDER[b.health?.status ?? "new"] || a.name.localeCompare(b.name, "pt-BR"),
    );

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        As células que você supervisiona, as que precisam de atenção primeiro. Abra a célula para
        registrar uma visita.
      </p>
      {isLoading ? (
        <EmptyState>Carregando…</EmptyState>
      ) : sorted.length === 0 ? (
        <EmptyState>Você não supervisiona nenhuma célula nesta temporada.</EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sorted.map((cell) => {
            const visit = lastVisitLabel(cell);
            const schedule = formatSchedule(cell.meeting_day, cell.meeting_time);
            return (
              <Link
                key={cell.id}
                to="/app/celulas/$id"
                params={{ id: cell.id }}
                data-testid="supervised-cell"
              >
                <Card className="h-full transition-colors hover:border-primary/40">
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <CellHealthBadge cell={cell} />
                        {cell.pending_meetings > 0 && (
                          <Badge
                            variant="outline"
                            className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          >
                            <CalendarX className="h-3 w-3" /> {cell.pending_meetings} sem registro
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight">{cell.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {cell.leaders.length > 0
                          ? cell.leaders.map((l) => l.name).join(", ")
                          : "Sem líder"}
                        {schedule && ` · ${schedule}`}
                      </p>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div
                        className={
                          visit.late
                            ? "flex items-center gap-1.5 text-amber-700 dark:text-amber-400"
                            : "flex items-center gap-1.5 text-muted-foreground"
                        }
                      >
                        <ClipboardCheck className="h-4 w-4" /> {visit.text}
                      </div>
                      {cell.trainees.length > 0 && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <GraduationCap className="h-4 w-4" /> Em treinamento:{" "}
                          {cell.trainees.map((t) => t.name).join(", ")}
                        </div>
                      )}
                      <div className="text-muted-foreground">
                        <span className="font-semibold tabular-nums text-foreground">
                          {cell.participant_count}
                        </span>{" "}
                        membros
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
