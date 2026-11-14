import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
import { EmptyState } from "@/components/detail/DetailSection";
import { formatBRL } from "@/lib/api/payments";
import { useEventSeries } from "@/lib/api/production";
import { formatBRLShort, useEventReports, type EventReportRow } from "@/lib/api/reports";

// "Relatórios": the events the person organizes, side by side — attendance,
// revenue and balance — with a chart to compare them. Picking a recurring
// event compares its dates (how the Sunday service is going week by week).
export const Route = createFileRoute("/app/eventos/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios de eventos — Redis" }] }),
  validateSearch: (search: Record<string, unknown>): { serie?: string } => ({
    serie:
      typeof search.serie === "string" && /^[0-9a-f-]{36}$/i.test(search.serie)
        ? search.serie
        : undefined,
  }),
  component: EventReportsPage,
});

const ALL = "all";
const MAX_COMPARED = 12;

type Metric = "present" | "registrations" | "net_cents" | "balance_cents";

const METRICS: { value: Metric; label: string; money?: boolean }[] = [
  { value: "present", label: "Presentes" },
  { value: "registrations", label: "Inscrições" },
  { value: "net_cents", label: "Receita líquida", money: true },
  { value: "balance_cents", label: "Saldo", money: true },
];

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

function EventReportsPage() {
  const { serie } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: series } = useEventSeries();
  const { data: rows, isLoading } = useEventReports({ series: serie });
  const [metric, setMetric] = useState<Metric>("present");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  // Compared: the picked ones (2+), otherwise the latest; oldest first.
  const compared = useMemo(() => {
    const list = rows ?? [];
    const chosen = picked.size >= 2 ? list.filter((r) => picked.has(r.event.id)) : list;
    return chosen.slice(0, MAX_COMPARED).reverse();
  }, [rows, picked]);

  const toggle = (id: string, on: boolean) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Os eventos que você organiza, lado a lado. Abra um evento para ver o relatório completo,
        lançar despesas e exportar planilhas.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={serie ?? ALL}
          onValueChange={(v) => {
            setPicked(new Set());
            navigate({ search: { serie: v === ALL ? undefined : v } });
          }}
        >
          <SelectTrigger className="w-full sm:w-64" aria-label="Eventos">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os eventos</SelectItem>
            {(series ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.title} (recorrente)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 sm:ml-auto"
          disabled={!rows?.length}
          onClick={() => downloadComparison(rows ?? [])}
        >
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !rows?.length ? (
        <EmptyState>Nenhum evento realizado para mostrar.</EmptyState>
      ) : (
        <>
          <ComparisonChart
            rows={compared}
            metric={metric}
            onMetric={setMetric}
            picked={picked.size >= 2}
          />

          <div className="space-y-2" data-testid="report-rows">
            <p className="text-xs text-muted-foreground">
              Marque dois ou mais para comparar só esses.
            </p>
            {rows.map((r) => (
              <ReportRow
                key={r.event.id}
                row={r}
                checked={picked.has(r.event.id)}
                onCheck={(on) => toggle(r.event.id, on)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ComparisonChart({
  rows,
  metric,
  onMetric,
  picked,
}: {
  rows: EventReportRow[];
  metric: Metric;
  onMetric: (m: Metric) => void;
  picked: boolean;
}) {
  const spec = METRICS.find((m) => m.value === metric)!;
  const config = { value: { label: spec.label, color: "var(--chart-1)" } } satisfies ChartConfig;
  const data = rows.map((r) => ({
    id: r.event.id,
    date: r.event.starts_at,
    title: r.event.title,
    value: r[metric] ?? 0,
    missing: r[metric] === null,
  }));
  const format = (v: number) => (spec.money ? formatBRL(v) : v.toLocaleString("pt-BR"));

  return (
    <Card className="min-w-0" data-testid="comparison">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-medium">
            {picked
              ? "Eventos marcados"
              : rows.length === 1
                ? "Último evento"
                : `Últimos ${rows.length} eventos`}
          </div>
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            value={metric}
            onValueChange={(v) => v && onMetric(v as Metric)}
            className="flex-wrap justify-start"
          >
            {METRICS.map((m) => (
              <ToggleGroupItem key={m.value} value={m.value} className="text-xs">
                {m.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <ChartContainer config={config} className="aspect-auto h-52 w-full">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickFormatter={shortDate}
              minTickGap={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              width={spec.money ? 64 : 44}
              tickFormatter={(v: number) => (spec.money ? formatBRLShort(v) : String(v))}
            />
            <ChartTooltip
              cursor={{ fill: "var(--muted)" }}
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const p = payload?.[0]?.payload;
                    return p ? `${p.title} · ${shortDate(p.date)}` : "";
                  }}
                  formatter={(value, _name, item) => (
                    <div className="flex w-full justify-between gap-3">
                      <span className="text-muted-foreground">{spec.label}</span>
                      <span className="font-mono tabular-nums text-foreground">
                        {item.payload.missing ? "sem dado" : format(Number(value))}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={32}>
              {data.map((d) => (
                <Cell
                  key={d.id}
                  fill={d.value < 0 ? "var(--chart-5)" : "var(--color-value)"}
                  fillOpacity={d.missing ? 0.25 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function ReportRow({
  row,
  checked,
  onCheck,
}: {
  row: EventReportRow;
  checked: boolean;
  onCheck: (on: boolean) => void;
}) {
  const hasMoney = row.gross_cents > 0 || row.expenses_cents > 0;
  return (
    <Card data-testid="report-row">
      <CardContent className="flex items-start gap-3 p-3">
        <Checkbox
          className="mt-1"
          checked={checked}
          onCheckedChange={(v) => onCheck(v === true)}
          aria-label={`Comparar ${row.event.title}`}
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="min-w-0">
            <Link
              to="/app/eventos/$id/relatorio"
              params={{ id: row.event.id }}
              className="block truncate text-sm font-medium hover:underline"
            >
              {row.event.title}
            </Link>
            <div className="truncate text-xs text-muted-foreground">
              {longDate(row.event.starts_at)}
              {row.event.campus ? ` · ${row.event.campus}` : ""}
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <dt className="text-muted-foreground">Presentes</dt>
              <dd className="text-sm font-medium tabular-nums">
                {row.present === null ? "—" : row.present.toLocaleString("pt-BR")}
                {row.attendance_rate !== null && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    {row.attendance_rate}%
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Receita líquida</dt>
              <dd className="truncate text-sm font-medium tabular-nums">
                {hasMoney ? formatBRL(row.net_cents) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Saldo</dt>
              <dd className="truncate text-sm font-medium tabular-nums">
                {hasMoney ? formatBRL(row.balance_cents) : "—"}
              </dd>
            </div>
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}

// ";" and decimal comma with a BOM: what Excel in Portuguese opens right.
function downloadComparison(rows: EventReportRow[]) {
  const quote = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const money = (c: number) => (c / 100).toFixed(2).replace(".", ",");
  const header = [
    "Evento",
    "Data",
    "Campus",
    "Inscrições",
    "Vagas confirmadas",
    "Presentes",
    "Comparecimento (%)",
    "Receita bruta (R$)",
    "Reembolsos (R$)",
    "Receita líquida (R$)",
    "Despesas (R$)",
    "Saldo (R$)",
  ];
  const lines = rows.map((r) => [
    quote(r.event.title),
    new Date(r.event.starts_at).toLocaleDateString("pt-BR"),
    quote(r.event.campus ?? ""),
    r.registrations,
    r.confirmed_seats,
    r.present ?? "",
    r.attendance_rate ?? "",
    money(r.gross_cents),
    money(r.refunded_cents),
    money(r.net_cents),
    money(r.expenses_cents),
    money(r.balance_cents),
  ]);
  const csv = [header.map(quote), ...lines].map((l) => l.join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "comparacao-eventos.csv";
  a.click();
  URL.revokeObjectURL(url);
}
