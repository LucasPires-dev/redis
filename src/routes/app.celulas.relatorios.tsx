import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ArrowDown,
  ArrowUp,
  CalendarCheck,
  Download,
  HeartHandshake,
  PieChart,
  UserPlus,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DetailSkeleton } from "@/components/skeletons";
import { StatCard } from "@/components/detail/StatCard";
import { DetailSection, EmptyState } from "@/components/detail/DetailSection";
import { HEALTH_CLASS } from "@/components/cells/CellHealthBadge";
import { capabilitiesOf, useMe } from "@/lib/api/auth";
import {
  CELL_HEALTH_LABEL,
  CELL_HEALTH_ORDER,
  useCellReport,
  type CampusReportRow,
  type CellReportRow,
  type CellReportWeek,
} from "@/lib/api/cells";
import { formatDate, useCurrentSeason, useSeasons } from "@/lib/api/seasons";
import { cn } from "@/lib/utils";

const ALL = "all";
const CURRENT_SEASON = "current";

// "Relatórios": how the cells did over the season, week by week, for whoever
// coordinates them. One fetch per season; campus and cell filters are applied
// here, so switching them is instant.
export const Route = createFileRoute("/app/celulas/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios de células — Redis" }] }),
  component: CellReportsPage,
});

const EMPTY_WEEK: CellReportWeek = { held: 0, attendance: 0, visitors: 0, decisions: 0 };

function sumWeeks(cells: CellReportRow[], weekCount: number): CellReportWeek[] {
  return Array.from({ length: weekCount }, (_, i) =>
    cells.reduce(
      (acc, c) => ({
        held: acc.held + c.series[i].held,
        attendance: acc.attendance + c.series[i].attendance,
        visitors: acc.visitors + c.series[i].visitors,
        decisions: acc.decisions + c.series[i].decisions,
      }),
      EMPTY_WEEK,
    ),
  );
}

const shortDate = (iso: string) => formatDate(iso).slice(0, 5);
const fmt = (n: number | null, suffix = "") =>
  n === null ? "—" : `${n.toLocaleString("pt-BR")}${suffix}`;

function CellReportsPage() {
  const { data: me, isLoading: meLoading } = useMe();
  const canSee = capabilitiesOf(me).cells.coordinate;

  const [season, setSeason] = useState(CURRENT_SEASON);
  const [campusId, setCampusId] = useState(ALL);
  const [cellId, setCellId] = useState(ALL);
  const { data: seasons } = useSeasons();
  const { data: currentSeason } = useCurrentSeason();
  const { data: report, isLoading } = useCellReport(season, canSee);

  const weeks = report?.weeks ?? [];
  const campusCells = useMemo(
    () => (report?.cells ?? []).filter((c) => campusId === ALL || c.campus.id === campusId),
    [report, campusId],
  );
  const cells = cellId === ALL ? campusCells : campusCells.filter((c) => c.id === cellId);
  const campuses = (report?.campuses ?? []).filter((c) => campusId === ALL || c.id === campusId);
  const weekly = sumWeeks(cells, weeks.length);

  const held = cells.reduce((s, c) => s + c.meetings_held, 0);
  const attendance = cells.reduce((s, c) => s + c.attendance, 0);
  const visitors = cells.reduce((s, c) => s + c.visitors, 0);
  const decisions = cells.reduce((s, c) => s + c.decisions, 0);
  const newMembers = cells.reduce((s, c) => s + c.new_members, 0);
  const pending = cells.reduce((s, c) => s + c.meetings_pending, 0);
  const people = campuses.reduce((s, c) => s + c.people, 0);
  const inCells = campuses.reduce((s, c) => s + c.people_in_cells, 0);

  if (me && !canSee) return <Navigate to="/app/celulas" replace />;
  if (meLoading) return <DetailSkeleton />;

  const pickCampus = (v: string) => {
    setCampusId(v);
    setCellId(ALL);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Como as células foram na temporada, semana a semana, a partir dos encontros registrados.
      </p>

      <div className="flex flex-wrap items-end gap-3">
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
        {(report?.campuses.length ?? 0) > 1 && (
          <Select value={campusId} onValueChange={pickCampus}>
            <SelectTrigger className="w-full sm:w-52" aria-label="Campus">
              <SelectValue placeholder="Campus" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os campi</SelectItem>
              {report!.campuses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={cellId} onValueChange={setCellId}>
          <SelectTrigger className="w-full sm:w-60" aria-label="Célula">
            <SelectValue placeholder="Célula" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as células</SelectItem>
            {campusCells.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="gap-1 sm:ml-auto"
          disabled={campusCells.length === 0}
          onClick={() => downloadCsv(campusCells, report!.weeks, season, currentSeason?.name)}
        >
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      {season === CURRENT_SEASON && (
        <p className="text-sm text-muted-foreground">
          {currentSeason
            ? `Temporada ${currentSeason.name} (${formatDate(currentSeason.start_date)} a ${formatDate(currentSeason.end_date)})`
            : "Nenhuma temporada em andamento"}
        </p>
      )}

      {isLoading ? (
        <EmptyState>Carregando…</EmptyState>
      ) : cells.length === 0 ? (
        <EmptyState>Nenhuma célula nesta temporada.</EmptyState>
      ) : (
        <>
          <div
            className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5"
            data-testid="report-totals"
          >
            <StatCard
              icon={<CalendarCheck className="h-4 w-4" />}
              label="Encontros realizados"
              value={held}
              hint={pending > 0 ? `${pending} sem registro` : undefined}
            />
            <StatCard
              icon={<Users className="h-4 w-4" />}
              label="Presença média"
              value={
                held
                  ? (attendance / held).toLocaleString("pt-BR", { maximumFractionDigits: 1 })
                  : "—"
              }
              hint="pessoas por encontro"
            />
            <StatCard
              icon={<UserPlus className="h-4 w-4" />}
              label="Visitantes"
              value={visitors}
              hint={newMembers > 0 ? `${newMembers} viraram membros` : undefined}
            />
            <StatCard
              icon={<HeartHandshake className="h-4 w-4" />}
              label="Decisões"
              value={decisions}
            />
            <StatCard
              icon={<PieChart className="h-4 w-4" />}
              label="Em células"
              value={people ? `${Math.round((100 * inCells) / people)}%` : "—"}
              hint={people ? `${inCells} de ${people} pessoas do campus` : undefined}
            />
          </div>

          <DetailSection title="Por semana">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <WeeklyChart
                title="Presença"
                hint="pessoas presentes nos encontros"
                weeks={weeks}
                values={weekly.map((w) => w.attendance)}
                color="var(--chart-1)"
              />
              <WeeklyChart
                title="Visitantes"
                weeks={weeks}
                values={weekly.map((w) => w.visitors)}
                color="var(--chart-2)"
              />
              <WeeklyChart
                title="Decisões"
                weeks={weeks}
                values={weekly.map((w) => w.decisions)}
                color="var(--chart-4)"
              />
            </div>
          </DetailSection>

          {campuses.length > 1 && <CampusTable campuses={campuses} />}
          {cellId === ALL && <CellTable cells={campusCells} />}
        </>
      )}
    </div>
  );
}

// One measure per chart (they have different scales): weekly columns with a
// tooltip per week.
function WeeklyChart({
  title,
  hint,
  weeks,
  values,
  color,
}: {
  title: string;
  hint?: string;
  weeks: string[];
  values: number[];
  color: string;
}) {
  const config = { value: { label: title, color } } satisfies ChartConfig;
  const data = weeks.map((week, i) => ({ week, value: values[i] }));
  const total = values.reduce((s, v) => s + v, 0);
  return (
    <Card data-testid={`weekly-${title}`} className="min-w-0">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <div className="text-sm font-medium">{title}</div>
            {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold tabular-nums text-foreground">{total}</span> no total
          </div>
        </div>
        <ChartContainer config={config} className="aspect-auto h-44 w-full">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="week"
              tickLine={false}
              axisLine={false}
              tickFormatter={shortDate}
              minTickGap={12}
            />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={44} />
            <ChartTooltip
              cursor={{ fill: "var(--muted)" }}
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) =>
                    payload?.[0] ? `Semana de ${formatDate(payload[0].payload.week)}` : ""
                  }
                />
              }
            />
            <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function CoverageBar({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
      </div>
      <span className="tabular-nums">{value}%</span>
    </div>
  );
}

function CampusTable({ campuses }: { campuses: CampusReportRow[] }) {
  return (
    <DetailSection title="Comparação entre campi" count={campuses.length}>
      {/* contain: a wide table scrolls inside the card instead of widening the page. */}
      <Card className="overflow-x-auto [contain:inline-size]">
        <Table data-testid="report-campuses">
          <TableHeader>
            <TableRow>
              <TableHead>Campus</TableHead>
              <TableHead className="text-right">Células</TableHead>
              <TableHead className="text-right">Participantes</TableHead>
              <TableHead>Pessoas em células</TableHead>
              <TableHead className="text-right">Encontros</TableHead>
              <TableHead className="text-right">Presença média</TableHead>
              <TableHead className="text-right">Visitantes</TableHead>
              <TableHead className="text-right">Decisões</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campuses.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-right tabular-nums">{c.cells}</TableCell>
                <TableCell className="text-right tabular-nums">{c.participants}</TableCell>
                <TableCell title={`${c.people_in_cells} de ${c.people} pessoas`}>
                  <CoverageBar value={c.coverage} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{c.meetings_held}</TableCell>
                <TableCell className="text-right tabular-nums">{fmt(c.avg_attendance)}</TableCell>
                <TableCell className="text-right tabular-nums">{c.visitors}</TableCell>
                <TableCell className="text-right tabular-nums">{c.decisions}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </DetailSection>
  );
}

type SortKey =
  | "name"
  | "health"
  | "participants"
  | "meetings_held"
  | "attendance_rate"
  | "avg_attendance"
  | "visitors"
  | "decisions"
  | "new_members";

const CELL_COLUMNS: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: "name", label: "Célula" },
  { key: "health", label: "Saúde" },
  { key: "participants", label: "Participantes", numeric: true },
  { key: "meetings_held", label: "Encontros", numeric: true },
  { key: "attendance_rate", label: "Frequência", numeric: true },
  { key: "avg_attendance", label: "Presença média", numeric: true },
  { key: "visitors", label: "Visitantes", numeric: true },
  { key: "decisions", label: "Decisões", numeric: true },
  { key: "new_members", label: "Novos membros", numeric: true },
];

function sortValue(c: CellReportRow, key: SortKey): string | number {
  if (key === "name") return c.name.toLocaleLowerCase("pt-BR");
  if (key === "health") return CELL_HEALTH_ORDER[c.health];
  return c[key] ?? -1;
}

function CellTable({ cells }: { cells: CellReportRow[] }) {
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "name", desc: false });
  const sorted = cells.slice().sort((a, b) => {
    const x = sortValue(a, sort.key);
    const y = sortValue(b, sort.key);
    const cmp = x < y ? -1 : x > y ? 1 : 0;
    return sort.desc ? -cmp : cmp;
  });
  const toggle = (key: SortKey, numeric?: boolean) =>
    setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: !!numeric }));

  return (
    <DetailSection title="Comparação entre células" count={cells.length}>
      <Card className="overflow-x-auto [contain:inline-size]">
        <Table data-testid="report-cells">
          <TableHeader>
            <TableRow>
              {CELL_COLUMNS.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(col.numeric && "text-right")}
                  aria-sort={
                    sort.key === col.key ? (sort.desc ? "descending" : "ascending") : undefined
                  }
                >
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    onClick={() => toggle(col.key, col.numeric)}
                  >
                    {col.label}
                    {sort.key === col.key &&
                      (sort.desc ? (
                        <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUp className="h-3 w-3" />
                      ))}
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((c) => (
              <TableRow key={c.id} data-testid="report-cell">
                <TableCell>
                  <Link
                    to="/app/celulas/$id"
                    params={{ id: c.id }}
                    className="font-medium hover:underline"
                  >
                    {c.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {c.campus.name}
                    {c.leaders.length > 0 && ` · ${c.leaders.join(", ")}`}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={HEALTH_CLASS[c.health]}>
                    {CELL_HEALTH_LABEL[c.health]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{c.participants}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {c.meetings_held}
                  {c.meetings_pending > 0 && (
                    <div className="text-xs text-amber-700 dark:text-amber-400">
                      {c.meetings_pending} sem registro
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmt(c.attendance_rate, "%")}
                </TableCell>
                <TableCell className="text-right tabular-nums">{fmt(c.avg_attendance)}</TableCell>
                <TableCell className="text-right tabular-nums">{c.visitors}</TableCell>
                <TableCell className="text-right tabular-nums">{c.decisions}</TableCell>
                <TableCell className="text-right tabular-nums">{c.new_members}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </DetailSection>
  );
}

// Spreadsheet-friendly for Excel in Portuguese: ";" separator, decimal comma
// and a BOM so accents survive. One row per cell, then one column per week
// with the attendance.
function downloadCsv(cells: CellReportRow[], weeks: string[], season: string, seasonName?: string) {
  const num = (n: number | null) => (n === null ? "" : String(n).replace(".", ","));
  const quote = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const header = [
    "Célula",
    "Campus",
    "Líderes",
    "Saúde",
    "Participantes",
    "Encontros realizados",
    "Sem registro",
    "Frequência (%)",
    "Presença média",
    "Visitantes",
    "Decisões",
    "Novos membros",
    "Encaminhados à Reconciliação",
    ...weeks.map((w) => `Presença ${formatDate(w)}`),
  ];
  const rows = cells.map((c) => [
    quote(c.name),
    quote(c.campus.name),
    quote(c.leaders.join(", ")),
    CELL_HEALTH_LABEL[c.health],
    c.participants,
    c.meetings_held,
    c.meetings_pending,
    num(c.attendance_rate),
    num(c.avg_attendance),
    c.visitors,
    c.decisions,
    c.new_members,
    c.forwarded,
    ...c.series.map((w) => (w.held ? w.attendance : "")),
  ]);
  const csv = [header.map(quote), ...rows].map((r) => r.join(";")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const label = season === CURRENT_SEASON ? (seasonName ?? "atual") : season.slice(0, 8);
  a.href = url;
  a.download = `relatorio-celulas-${label.replace(/[^\w.-]+/g, "-").toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
