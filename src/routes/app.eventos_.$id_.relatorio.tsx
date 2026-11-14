import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import {
  BarChart3,
  Download,
  Pencil,
  Percent,
  Plus,
  Receipt,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DetailHeader } from "@/components/detail/DetailHeader";
import { DetailSection, EmptyState } from "@/components/detail/DetailSection";
import { StatCard } from "@/components/detail/StatCard";
import { DetailSkeleton } from "@/components/skeletons";
import { RouteError } from "@/components/RouteError";
import { ApiError, apiErrorMessage } from "@/lib/api/client";
import { formatBRL } from "@/lib/api/payments";
import { useEvent } from "@/lib/api/production";
import {
  EXPENSE_CATEGORY_LABEL,
  downloadEventCsv,
  useDeleteExpense,
  useEventReport,
  useExpenses,
  useSaveExpense,
  useSetHeadcount,
  type CsvKind,
  type EventExpense,
  type EventReport,
  type ExpenseCategory,
} from "@/lib/api/reports";
import { cn } from "@/lib/utils";

// An event's report, for its organizers: who came, what came in and went out
// (revenue, refunds, expenses) and the spreadsheets to take it elsewhere.
export const Route = createFileRoute("/app/eventos_/$id_/relatorio")({
  head: () => ({ meta: [{ title: "Relatório do evento — Redis" }] }),
  component: EventReportPage,
  errorComponent: RouteError,
});

const num = (n: number | null) => (n === null ? "—" : n.toLocaleString("pt-BR"));
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function EventReportPage() {
  const { id } = Route.useParams();
  const { data: event, error: eventError } = useEvent(id);
  const { data: report, error, isLoading } = useEventReport(id);

  for (const e of [eventError, error]) {
    if (e instanceof ApiError && [404, 403].includes(e.status)) throw notFound();
  }
  if (isLoading || !report || !event) return <DetailSkeleton />;

  const { attendance: att, finance: fin } = report;
  const started = new Date(report.event.starts_at) <= new Date();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6" data-testid="event-report">
      <DetailHeader
        backTo="/app/eventos/$id/producao"
        backParams={{ id }}
        backLabel="Produção"
        icon={<BarChart3 className="h-6 w-6" />}
        title={report.event.title}
        subtitle={
          <>
            Relatório ·{" "}
            {new Date(report.event.starts_at).toLocaleString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </>
        }
        actions={<CsvMenu report={report} />}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" data-testid="report-tiles">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Presentes"
          value={num(att.present)}
          hint={
            att.has_registration && att.checked_in > 0
              ? `de ${att.confirmed_seats} confirmados`
              : att.headcount !== null
                ? "contagem no salão"
                : started
                  ? "sem contagem"
                  : "o evento ainda não aconteceu"
          }
        />
        {att.has_registration ? (
          <StatCard
            icon={<Percent className="h-4 w-4" />}
            label="Comparecimento"
            value={att.attendance_rate === null ? "—" : `${att.attendance_rate}%`}
            hint={att.no_show ? `${att.no_show} não vieram` : undefined}
          />
        ) : (
          <StatCard
            icon={<Receipt className="h-4 w-4" />}
            label="Despesas"
            value={formatBRL(fin.expenses_cents)}
          />
        )}
        {att.has_registration && (
          <>
            <StatCard
              icon={<Wallet className="h-4 w-4" />}
              label="Receita líquida"
              value={formatBRL(fin.net_cents)}
              hint={
                fin.refunded_cents ? `${formatBRL(fin.refunded_cents)} reembolsados` : undefined
              }
            />
            <StatCard
              icon={<Receipt className="h-4 w-4" />}
              label="Saldo"
              value={formatBRL(fin.balance_cents)}
              hint={
                fin.expenses_cents ? `após ${formatBRL(fin.expenses_cents)} de despesas` : undefined
              }
            />
          </>
        )}
      </div>

      <AttendanceSection report={report} headcount={event.headcount} />

      {att.has_registration && report.ticket_types.length > 0 && (
        <DetailSection title="Ingressos" count={report.ticket_types.length}>
          <Card>
            <CardContent className="divide-y p-0">
              {report.ticket_types.map((t) => (
                <div
                  key={t.id ?? "single"}
                  className="flex items-center justify-between gap-3 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.registrations} inscrições · {t.seats} vagas
                    </div>
                  </div>
                  <span className="shrink-0 tabular-nums">{formatBRL(t.revenue_cents)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </DetailSection>
      )}

      {report.registrations_by_day.length > 1 && <ByDayChart days={report.registrations_by_day} />}

      <FinanceSection report={report} />
      <ExpensesSection eventId={id} />

      {report.event.series && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <span className="text-muted-foreground">Este evento se repete.</span>
            <Button size="sm" variant="outline" asChild>
              <Link to="/app/eventos/relatorios" search={{ serie: report.event.series }}>
                Comparar com as outras datas
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CsvMenu({ report }: { report: EventReport }) {
  const [busy, setBusy] = useState(false);
  const download = (kind: CsvKind) => {
    setBusy(true);
    downloadEventCsv(report.event, kind)
      .catch((e) => toast.error(apiErrorMessage(e, "Não foi possível baixar.")))
      .finally(() => setBusy(false));
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5" disabled={busy}>
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => download("attendees")}>
          Inscritos e check-in
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => download("finance")}>
          Financeiro (receitas, reembolsos e despesas)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 py-2 text-sm",
        strong && "font-semibold",
      )}
    >
      <span className={cn(!strong && "text-muted-foreground")}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function AttendanceSection({
  report,
  headcount,
}: {
  report: EventReport;
  headcount: number | null;
}) {
  const att = report.attendance;
  const setHeadcount = useSetHeadcount();
  const [value, setValue] = useState(headcount === null ? "" : String(headcount));

  function save(e: React.FormEvent) {
    e.preventDefault();
    const n = value.trim() === "" ? null : Number(value);
    if (n !== null && (!Number.isInteger(n) || n < 0)) {
      toast.error("Informe um número inteiro.");
      return;
    }
    setHeadcount.mutate(
      { eventId: report.event.id, headcount: n },
      {
        onSuccess: () => toast.success("Contagem salva."),
        onError: (err) => toast.error(apiErrorMessage(err, "Não foi possível salvar.")),
      },
    );
  }

  return (
    <DetailSection title="Presença">
      <Card>
        <CardContent className="space-y-3 p-4">
          {att.has_registration && (
            <div className="divide-y">
              <Line label="Inscrições confirmadas" value={num(att.registrations)} />
              <Line
                label="Vagas confirmadas (com acompanhantes)"
                value={num(att.confirmed_seats)}
              />
              <Line label="Fizeram check-in" value={num(att.checked_in)} />
              {att.no_show !== null && <Line label="Não vieram" value={num(att.no_show)} />}
              <Line label="Pendentes de pagamento" value={num(att.pending)} />
              <Line label="Canceladas" value={num(att.cancelled)} />
            </div>
          )}
          <form onSubmit={save} className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="headcount">Contagem no salão</Label>
              <Input
                id="headcount"
                type="number"
                inputMode="numeric"
                min={0}
                value={value}
                placeholder="Quantas pessoas vieram"
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <Button type="submit" variant="outline" disabled={setHeadcount.isPending}>
              Salvar
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            {att.has_registration
              ? "Usada só quando ninguém fez check-in."
              : "Para eventos sem inscrição, como os cultos: é o que entra nos relatórios."}
          </p>
        </CardContent>
      </Card>
    </DetailSection>
  );
}

// One measure, one hue: registrations per day, with a tooltip per day.
function ByDayChart({ days }: { days: EventReport["registrations_by_day"] }) {
  const config = { count: { label: "Inscrições", color: "var(--chart-1)" } } satisfies ChartConfig;
  const short = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
  return (
    <DetailSection title="Inscrições por dia">
      <Card className="min-w-0">
        <CardContent className="p-4">
          <ChartContainer config={config} className="aspect-auto h-44 w-full">
            <BarChart data={days} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickFormatter={short}
                minTickGap={12}
              />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={44} />
              <ChartTooltip
                cursor={{ fill: "var(--muted)" }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) =>
                      payload?.[0] ? short(payload[0].payload.date) : ""
                    }
                  />
                }
              />
              <Bar
                dataKey="count"
                fill="var(--color-count)"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </DetailSection>
  );
}

function FinanceSection({ report }: { report: EventReport }) {
  const fin = report.finance;
  const biggest = Math.max(...fin.expenses_by_category.map((c) => c.amount_cents), 1);
  if (!report.attendance.has_registration && !fin.expenses_cents) return null;
  return (
    <DetailSection title="Financeiro">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="divide-y" data-testid="report-finance">
            <Line label="Receita bruta" value={formatBRL(fin.gross_cents)} />
            <Line
              label={`Reembolsos${fin.refunds ? ` (${fin.refunds})` : ""}`}
              value={fin.refunded_cents ? `− ${formatBRL(fin.refunded_cents)}` : formatBRL(0)}
            />
            <Line label="Receita líquida" value={formatBRL(fin.net_cents)} />
            <Line
              label="Despesas"
              value={fin.expenses_cents ? `− ${formatBRL(fin.expenses_cents)}` : formatBRL(0)}
            />
            <Line label="Saldo" value={formatBRL(fin.balance_cents)} strong />
          </div>
          {fin.expenses_by_category.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Despesas por categoria
              </div>
              {fin.expenses_by_category.map((c) => (
                <div key={c.category} className="space-y-1">
                  <div className="flex justify-between gap-3 text-sm">
                    <span>{c.label}</span>
                    <span className="tabular-nums">{formatBRL(c.amount_cents)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-[var(--chart-1)]"
                      style={{ width: `${(c.amount_cents / biggest) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DetailSection>
  );
}

function ExpensesSection({ eventId }: { eventId: string }) {
  const { data: expenses } = useExpenses(eventId);
  const remove = useDeleteExpense();
  const [editing, setEditing] = useState<EventExpense | "new" | null>(null);

  return (
    <DetailSection
      title="Despesas"
      count={expenses?.length ?? 0}
      action={
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      }
    >
      {!expenses?.length ? (
        <EmptyState>Nenhuma despesa lançada.</EmptyState>
      ) : (
        <Card>
          <CardContent className="divide-y p-0" data-testid="expenses">
            {expenses.map((x) => (
              <div
                key={x.id}
                className="flex items-center justify-between gap-2 p-3"
                data-testid="expense"
              >
                <div className="min-w-0 text-sm">
                  <div className="truncate font-medium">{x.description}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {x.category_label} ·{" "}
                    {new Date(`${x.spent_on}T12:00:00`).toLocaleDateString("pt-BR")}
                    {x.created_by ? ` · ${x.created_by.name}` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span className="text-sm tabular-nums">{formatBRL(x.amount_cents)}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label="Editar despesa"
                    onClick={() => setEditing(x)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label="Excluir despesa"
                    disabled={remove.isPending}
                    onClick={() =>
                      remove.mutate(x.id, {
                        onSuccess: () => toast.success("Despesa excluída."),
                        onError: (e) =>
                          toast.error(apiErrorMessage(e, "Não foi possível excluir.")),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      {editing && (
        <ExpenseDialog
          eventId={eventId}
          expense={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </DetailSection>
  );
}

/** "1.234,56" or "1234.5" → cents; null when it isn't a positive amount. */
function parseMoney(raw: string): number | null {
  const clean = raw.replace(/[^\d,.]/g, "");
  if (!clean) return null;
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean;
  const value = Math.round(Number(normalized) * 100);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function ExpenseDialog({
  eventId,
  expense,
  onClose,
}: {
  eventId: string;
  expense: EventExpense | null;
  onClose: () => void;
}) {
  const save = useSaveExpense();
  const [description, setDescription] = useState(expense?.description ?? "");
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? "other");
  const [amount, setAmount] = useState(
    expense ? (expense.amount_cents / 100).toFixed(2).replace(".", ",") : "",
  );
  const [spentOn, setSpentOn] = useState(expense?.spent_on ?? today());
  const [notes, setNotes] = useState(expense?.notes ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const cents = parseMoney(amount);
    if (!description.trim() || cents === null || !spentOn) {
      toast.error("Preencha descrição, valor e data.");
      return;
    }
    save.mutate(
      {
        id: expense?.id,
        event_id: eventId,
        description: description.trim(),
        category,
        amount_cents: cents,
        spent_on: spentOn,
        notes: notes.trim(),
      },
      {
        onSuccess: () => {
          toast.success(expense ? "Despesa atualizada." : "Despesa lançada.");
          onClose();
        },
        onError: (err) => toast.error(apiErrorMessage(err, "Não foi possível salvar.")),
      },
    );
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{expense ? "Editar despesa" : "Nova despesa"}</DialogTitle>
          <DialogDescription>Entra no saldo do evento e no CSV financeiro.</DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={submit} id="expense-form">
          <div className="space-y-1.5">
            <Label htmlFor="exp-description">Descrição</Label>
            <Input
              id="exp-description"
              value={description}
              maxLength={200}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: lanche da equipe"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="exp-amount">Valor (R$)</Label>
              <Input
                id="exp-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-date">Data</Label>
              <Input
                id="exp-date"
                type="date"
                value={spentOn}
                onChange={(e) => setSpentOn(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
              <SelectTrigger aria-label="Categoria">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EXPENSE_CATEGORY_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-notes">Observações (opcional)</Label>
            <Textarea
              id="exp-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Voltar
          </Button>
          <Button type="submit" form="expense-form" disabled={save.isPending}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
