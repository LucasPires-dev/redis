import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Calendar as CalIcon, CalendarRange, Plus, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CampusCellsLeadersDialog } from "@/components/cells/CampusCellsLeadersDialog";
import { CellFormDialog } from "@/components/cells/CellFormDialog";
import { SeasonsDialog } from "@/components/cells/SeasonsDialog";
import {
  campusCellsLeaderAssignableIds,
  canCoordinateCells,
  cellCampusIds,
  useMe,
} from "@/lib/api/auth";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatSchedule,
  MEETING_DAY_LABEL,
  MEETING_DAYS,
  useCells,
  type MeetingDay,
} from "@/lib/api/cells";
import { formatDate, useCurrentSeason, useSeasons } from "@/lib/api/seasons";

const ALL_DAYS = "all";
const CURRENT_SEASON = "current";

export const Route = createFileRoute("/app/celulas")({
  head: () => ({ meta: [{ title: "Células — Redis" }] }),
  component: CellsPage,
});

function CellsPage() {
  const [meetingDay, setMeetingDay] = useState<MeetingDay | undefined>();
  // Opens on the season running today; past seasons stay reachable as history.
  const [season, setSeason] = useState<string>(CURRENT_SEASON);
  const { data: cells, isLoading } = useCells({ season, meetingDay });
  const { data: seasons } = useSeasons();
  const { data: currentSeason } = useCurrentSeason();
  const { data: me } = useMe();
  const [creating, setCreating] = useState(false);
  const [managingSeasons, setManagingSeasons] = useState(false);
  const [managingLeaders, setManagingLeaders] = useState(false);

  const createCampuses = cellCampusIds(me);
  const canCreate = createCampuses === null || createCampuses.size > 0;
  const assignCampuses = campusCellsLeaderAssignableIds(me);
  const canAssignLeaders = assignCampuses === null || assignCampuses.size > 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {(canCreate || canAssignLeaders || canCoordinateCells(me)) && (
        <div className="flex flex-wrap justify-end gap-2">
          {canCoordinateCells(me) && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => setManagingSeasons(true)}
            >
              <CalendarRange className="h-4 w-4" /> Temporadas
            </Button>
          )}
          {canAssignLeaders && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => setManagingLeaders(true)}
            >
              <UserCog className="h-4 w-4" /> Responsáveis
            </Button>
          )}
          {canCreate && (
            <Button size="sm" className="gap-1" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Nova célula
            </Button>
          )}
        </div>
      )}
      {canCreate && <CellFormDialog open={creating} onOpenChange={setCreating} />}
      {canCoordinateCells(me) && (
        <SeasonsDialog open={managingSeasons} onOpenChange={setManagingSeasons} />
      )}
      {canAssignLeaders && (
        <CampusCellsLeadersDialog open={managingLeaders} onOpenChange={setManagingLeaders} />
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Células</h1>
          <p className="text-sm text-muted-foreground">
            {(cells ?? []).length} células no escopo visível
            {season === CURRENT_SEASON &&
              (currentSeason
                ? ` · Temporada ${currentSeason.name} (${formatDate(currentSeason.start_date)} a ${formatDate(currentSeason.end_date)})`
                : " · Nenhuma temporada em andamento")}
            .
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Select value={season} onValueChange={setSeason}>
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
            value={meetingDay ? String(meetingDay) : ALL_DAYS}
            onValueChange={(v) =>
              setMeetingDay(v === ALL_DAYS ? undefined : (Number(v) as MeetingDay))
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
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(cells ?? []).map((c) => {
          const schedule = formatSchedule(c.meeting_day, c.meeting_time);
          return (
            <Link key={c.id} to="/app/celulas/$id" params={{ id: c.id }}>
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    {schedule && (
                      <Badge variant="outline" className="gap-1">
                        <CalIcon className="h-3 w-3" /> {schedule}
                      </Badge>
                    )}
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
        {!isLoading && (cells ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma célula visível para seu perfil.</p>
        )}
        {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      </div>
    </div>
  );
}
