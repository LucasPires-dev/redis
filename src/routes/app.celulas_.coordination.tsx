import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Sparkles,
  Users,
  AlertTriangle,
  Calendar as CalIcon,
  CalendarRange,
  CalendarX,
  Plus,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DetailHeader } from "@/components/detail/DetailHeader";
import { RouteError } from "@/components/RouteError";
import { DetailSkeleton } from "@/components/skeletons";
import { StatCard } from "@/components/detail/StatCard";
import { DetailSection, EmptyState } from "@/components/detail/DetailSection";
import { CellFormDialog } from "@/components/cells/CellFormDialog";
import { CellIncompleteBadge } from "@/components/cells/CellIncompleteBadge";
import { CampusCellsLeadersDialog } from "@/components/cells/CampusCellsLeadersDialog";
import { SeasonsDialog } from "@/components/cells/SeasonsDialog";
import {
  canCoordinateCells,
  cellCampusIds,
  campusCellsLeaderAssignableIds,
  useMe,
} from "@/lib/api/auth";
import {
  formatSchedule,
  MEETING_DAY_LABEL,
  MEETING_DAYS,
  useCells,
  type MeetingDay,
} from "@/lib/api/cells";
import { useCampuses } from "@/lib/api/ministries";
import { formatDate, useCurrentSeason, useSeasons } from "@/lib/api/seasons";

const ALL_DAYS = "all";
const CURRENT_SEASON = "current";

export const Route = createFileRoute("/app/celulas_/coordination")({
  head: () => ({ meta: [{ title: "Coordenação de Células — Redis" }] }),
  component: CellCoordinationPage,
  errorComponent: RouteError,
});

function CellCoordinationPage() {
  const navigate = useNavigate();
  const { data: me, isLoading: meLoading } = useMe();
  const { data: campuses } = useCampuses();

  const isCoordinator = canCoordinateCells(me);
  const ledCampusCells = me?.led_campuses_cells ?? [];
  const hasAccess = isCoordinator || ledCampusCells.length > 0;

  useEffect(() => {
    if (!meLoading && !hasAccess) {
      navigate({ to: "/app/celulas" });
    }
  }, [meLoading, hasAccess, navigate]);

  const campusOptions = isCoordinator
    ? (campuses ?? [])
    : (campuses ?? []).filter((c) => ledCampusCells.some((lc) => lc.id === c.id));

  const [selectedCampusId, setSelectedCampusId] = useState<string>("");
  const activeCampusId = selectedCampusId || campusOptions[0]?.id || "";
  const activeCampus = campusOptions.find((c) => c.id === activeCampusId);

  const [selectedSeason, setSelectedSeason] = useState<string>(CURRENT_SEASON);
  const [selectedDay, setSelectedDay] = useState<MeetingDay | undefined>();

  const { data: cells, isLoading: cellsLoading } = useCells({
    season: selectedSeason,
    meetingDay: selectedDay,
    campusId: activeCampusId,
  });
  const { data: seasons } = useSeasons();
  const { data: currentSeason } = useCurrentSeason();

  const [isCreating, setIsCreating] = useState(false);
  const [isSeasonsOpen, setIsSeasonsOpen] = useState(false);
  const [isLeadersOpen, setIsLeadersOpen] = useState(false);

  const allowedCampuses = cellCampusIds(me);
  const canCreate = allowedCampuses === null || allowedCampuses.size > 0;
  const assignableCampuses = campusCellsLeaderAssignableIds(me);
  const canAssignLeaders = assignableCampuses === null || assignableCampuses.size > 0;

  const cellList = cells ?? [];
  const totalMembers = cellList.reduce((sum, c) => sum + c.member_count, 0);
  const leaderlessCount = cellList.filter((c) => c.leaders.length === 0).length;
  const pendingMeetings = cellList.reduce((sum, c) => sum + c.pending_meetings, 0);
  const cellsWithPending = cellList.filter((c) => c.pending_meetings > 0).length;

  if (meLoading || !hasAccess) {
    return <DetailSkeleton />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <DetailHeader
        backTo="/app/celulas"
        backLabel="Células"
        icon={<Sparkles className="h-6 w-6" />}
        title="Coordenação de Células"
        subtitle={campusOptions.length === 1 ? activeCampus?.name : undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isCoordinator && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => setIsSeasonsOpen(true)}
              >
                <CalendarRange className="h-4 w-4" /> Temporadas
              </Button>
            )}
            {canAssignLeaders && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => setIsLeadersOpen(true)}
              >
                <UserCog className="h-4 w-4" /> Responsáveis
              </Button>
            )}
            {canCreate && (
              <Button size="sm" className="gap-1" onClick={() => setIsCreating(true)}>
                <Plus className="h-4 w-4" /> Nova célula
              </Button>
            )}
          </div>
        }
      />

      {canCreate && <CellFormDialog open={isCreating} onOpenChange={setIsCreating} />}
      {isCoordinator && <SeasonsDialog open={isSeasonsOpen} onOpenChange={setIsSeasonsOpen} />}
      {canAssignLeaders && (
        <CampusCellsLeadersDialog open={isLeadersOpen} onOpenChange={setIsLeadersOpen} />
      )}

      <div className="flex flex-wrap items-end gap-3">
        {campusOptions.length > 1 && (
          <Select value={activeCampusId} onValueChange={setSelectedCampusId}>
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="Campus" />
            </SelectTrigger>
            <SelectContent>
              {campusOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={selectedSeason} onValueChange={setSelectedSeason}>
          <SelectTrigger className="w-full sm:w-52">
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
        <Select
          value={selectedDay ? String(selectedDay) : ALL_DAYS}
          onValueChange={(v) =>
            setSelectedDay(v === ALL_DAYS ? undefined : (Number(v) as MeetingDay))
          }
        >
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Dia do encontro" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_DAYS}>Todos os dias</SelectItem>
            {MEETING_DAYS.map((d) => (
              <SelectItem key={d} value={String(d)}>
                {MEETING_DAY_LABEL[d]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedSeason === CURRENT_SEASON && (
        <p className="text-sm text-muted-foreground">
          {currentSeason
            ? `Temporada ${currentSeason.name} (${formatDate(currentSeason.start_date)} a ${formatDate(currentSeason.end_date)})`
            : "Nenhuma temporada em andamento"}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={<Sparkles className="h-4 w-4" />} label="Células" value={cellList.length} />
        <StatCard icon={<Users className="h-4 w-4" />} label="Membros" value={totalMembers} />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Sem líder"
          value={leaderlessCount}
          hint={leaderlessCount > 0 ? "Atenção" : undefined}
        />
        <StatCard
          icon={<CalendarX className="h-4 w-4" />}
          label="Encontros sem registro"
          value={pendingMeetings}
          hint={
            cellsWithPending > 0
              ? `${cellsWithPending} ${cellsWithPending === 1 ? "célula" : "células"}`
              : undefined
          }
        />
      </div>

      <DetailSection title="Células" count={cellList.length}>
        {cellsLoading ? (
          <EmptyState>Carregando…</EmptyState>
        ) : cellList.length === 0 ? (
          <EmptyState>Nenhuma célula encontrada para os filtros selecionados.</EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cellList.map((cell) => (
              <CellCard key={cell.id} cell={cell} />
            ))}
          </div>
        )}
      </DetailSection>
    </div>
  );
}

function CellCard({
  cell,
}: {
  cell: ReturnType<typeof useCells>["data"] extends (infer T)[] | undefined ? T : never;
}) {
  const schedule = formatSchedule(cell.meeting_day, cell.meeting_time);
  const hasNoLeader = cell.leaders.length === 0;

  return (
    <Link to="/app/celulas/$id" params={{ id: cell.id }}>
      <Card className="h-full transition-colors hover:border-primary/40">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {schedule && (
                <Badge variant="outline" className="gap-1">
                  <CalIcon className="h-3 w-3" /> {schedule}
                </Badge>
              )}
              {hasNoLeader && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" /> Sem líder
                </Badge>
              )}
              {cell.pending_meetings > 0 && (
                <Badge
                  variant="outline"
                  className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                >
                  <CalendarX className="h-3 w-3" /> {cell.pending_meetings} sem registro
                </Badge>
              )}
              <CellIncompleteBadge cell={cell} />
            </div>
          </div>
          <h3 className="mt-4 text-lg font-semibold tracking-tight">{cell.name}</h3>
          {(cell.leaders.length > 0 || cell.co_leaders.length > 0) && (
            <p className="text-sm text-muted-foreground">
              {[...cell.leaders, ...cell.co_leaders].map((l) => l.name).join(", ")}
            </p>
          )}
          <div className="mt-3 text-sm">
            <span className="font-semibold tabular-nums">{cell.member_count}</span>{" "}
            <span className="text-muted-foreground">membros</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
