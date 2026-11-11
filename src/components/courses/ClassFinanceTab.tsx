import { useState } from "react";
import { toast } from "sonner";
import {
  Banknote,
  Download,
  HandCoins,
  Link2,
  MoreHorizontal,
  PiggyBank,
  Plus,
  Receipt,
  Trash2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatCard } from "@/components/detail/StatCard";
import { DetailSection, EmptyState } from "@/components/detail/DetailSection";
import { PaymentStatusBadge } from "@/components/courses/PaymentStatusBadge";
import {
  downloadFinanceCsv,
  holdsSeat,
  isOpenPayment,
  refundAllowed,
  useCancelEnrollment,
  useClassExpenses,
  useClassFinance,
  useCreateExpense,
  useDeleteExpense,
  useGrantScholarship,
  useManualPayment,
  useMarkMaterial,
  usePayEnrollment,
  PAYMENT_STATUS_LABEL,
  type CourseClass,
  type EnrollmentFinance,
  type PaymentStatus,
} from "@/lib/api/courses";
import { apiErrorMessage } from "@/lib/api/client";
import { formatBRL, MIN_PAID_PRICE_CENTS } from "@/lib/api/payments";
import { centsToInput, parseCents } from "@/lib/money";

type DialogKind = "scholarship" | "manual" | "cancel";

export function ClassFinanceTab({ courseClass }: { courseClass: CourseClass }) {
  const classId = courseClass.id;
  const { data, isLoading } = useClassFinance(classId);
  const [showClosed, setShowClosed] = useState(false);
  const [dialog, setDialog] = useState<{ kind: DialogKind; enrollment: EnrollmentFinance } | null>(
    null,
  );
  const [exporting, setExporting] = useState(false);

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  const { summary, enrollments } = data;
  const visible = enrollments.filter((e) => showClosed || holdsSeat(e));
  const closedCount = enrollments.length - enrollments.filter(holdsSeat).length;

  const exportCsv = async () => {
    setExporting(true);
    try {
      const slug = `${courseClass.course_name}-${courseClass.name}`.replace(/\s+/g, "-");
      await downloadFinanceCsv(classId, `financeiro-${slug}.csv`);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Não foi possível exportar."));
    } finally {
      setExporting(false);
    }
  };

  const statusLine = (Object.entries(summary.by_status) as [PaymentStatus, number][])
    .map(([status, n]) => `${n} ${PAYMENT_STATUS_LABEL[status].toLowerCase()}`)
    .join(" · ");

  return (
    <div className="space-y-6" data-testid="class-finance">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {summary.enrolled} matrícula(s)
          {summary.capacity != null && ` de ${summary.capacity} vagas`}
          {statusLine && ` — ${statusLine}`}
        </p>
        <Button size="sm" variant="outline" onClick={exportCsv} disabled={exporting}>
          <Download className="mr-1.5 h-4 w-4" /> {exporting ? "Exportando…" : "Exportar CSV"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<Receipt className="h-4 w-4" />}
          label="Previsto"
          value={formatBRL(summary.expected_cents)}
          hint={
            summary.scholarship_cents
              ? `${formatBRL(summary.scholarship_cents)} em bolsas`
              : undefined
          }
        />
        <StatCard
          icon={<Wallet className="h-4 w-4" />}
          label="Recebido"
          value={<span data-testid="finance-received">{formatBRL(summary.received_cents)}</span>}
          hint={`Online ${formatBRL(summary.received_online_cents)} · Presencial ${formatBRL(summary.received_manual_cents)}`}
        />
        <StatCard
          icon={<HandCoins className="h-4 w-4" />}
          label="Em aberto"
          value={formatBRL(summary.outstanding_cents)}
          hint={
            summary.overdue_installments
              ? `${summary.overdue_installments} com parcela atrasada`
              : undefined
          }
        />
        <StatCard
          icon={<PiggyBank className="h-4 w-4" />}
          label="Saldo"
          value={<span data-testid="finance-balance">{formatBRL(summary.balance_cents)}</span>}
          hint={`Despesas ${formatBRL(summary.expenses_cents)}${summary.refunded_cents ? ` · Reembolsos ${formatBRL(summary.refunded_cents)}` : ""}`}
        />
      </div>

      {summary.items.length > 0 && (
        <DetailSection title="Itens a providenciar">
          <Card>
            <CardContent className="divide-y p-0">
              {summary.items.map((item) => (
                <div
                  key={item.name}
                  className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
                >
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground">
                    {item.total} un.
                    {Object.keys(item.options).length > 0 &&
                      " — " +
                        Object.entries(item.options)
                          .map(([option, n]) => `${option}: ${n}`)
                          .join(" · ")}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between p-3 text-sm text-muted-foreground">
                <span>Material entregue</span>
                <span>
                  {summary.materials_delivered} de {summary.enrolled}
                </span>
              </div>
            </CardContent>
          </Card>
        </DetailSection>
      )}

      <DetailSection
        title="Matrículas"
        count={visible.length}
        action={
          closedCount > 0 && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox checked={showClosed} onCheckedChange={(v) => setShowClosed(v === true)} />
              Mostrar canceladas/expiradas ({closedCount})
            </label>
          )
        }
      >
        {visible.length === 0 ? (
          <EmptyState>Nenhuma matrícula.</EmptyState>
        ) : (
          <div className="space-y-2">
            {visible.map((e) => (
              <EnrollmentRow
                key={e.id}
                enrollment={e}
                courseClass={courseClass}
                onAction={(kind) => setDialog({ kind, enrollment: e })}
              />
            ))}
          </div>
        )}
      </DetailSection>

      <ExpensesSection classId={classId} />

      {dialog?.kind === "scholarship" && (
        <ScholarshipDialog
          enrollment={dialog.enrollment}
          classId={classId}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "manual" && (
        <ManualPaymentDialog
          enrollment={dialog.enrollment}
          classId={classId}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "cancel" && (
        <CancelDialog
          enrollment={dialog.enrollment}
          courseClass={courseClass}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

function EnrollmentRow({
  enrollment: e,
  courseClass,
  onAction,
}: {
  enrollment: EnrollmentFinance;
  courseClass: CourseClass;
  onAction: (kind: DialogKind) => void;
}) {
  const [open, setOpen] = useState(false);
  const pay = usePayEnrollment();
  const material = useMarkMaterial();
  const owes = isOpenPayment(e.payment_status);
  const closed = !holdsSeat(e);
  const canScholarship =
    e.gross_cents > 0 &&
    e.paid_cents === 0 &&
    ["pending", "waived", "free"].includes(e.payment_status);

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link de pagamento copiado");
    } catch {
      toast.message(url);
    }
  };

  const newLink = () =>
    pay.mutate(
      { id: e.id, classId: courseClass.id, body: {} },
      {
        onSuccess: (updated) => {
          toast.success("Link de pagamento gerado");
          if (updated.payment_url) void copyLink(updated.payment_url);
        },
        onError: (err) => toast.error(apiErrorMessage(err, "Não foi possível gerar o link.")),
      },
    );

  const toggleMaterial = (delivered: boolean) =>
    material.mutate(
      { id: e.id, classId: courseClass.id, body: { delivered } },
      { onError: (err) => toast.error(apiErrorMessage(err, "Não foi possível salvar.")) },
    );

  return (
    <Card data-testid="finance-enrollment" className={closed ? "opacity-70" : undefined}>
      <CardContent className="space-y-2 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" className="min-w-0 text-left" onClick={() => setOpen((v) => !v)}>
            <div className="truncate text-sm font-medium">{e.person.name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {e.items.map((i) => (i.option ? `${i.name} (${i.option})` : i.name)).join(", ") ||
                "Sem itens"}
            </div>
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-right text-xs tabular-nums">
              <div>
                <span className="text-muted-foreground">Total </span>
                {formatBRL(e.amount_cents)}
                {e.discount_cents > 0 && (
                  <span className="text-muted-foreground">
                    {" "}
                    (bolsa {formatBRL(e.discount_cents)})
                  </span>
                )}
              </div>
              {owes && (
                <div>
                  <span className="text-muted-foreground">Falta </span>
                  {formatBRL(e.balance_cents)}
                </div>
              )}
            </div>
            <PaymentStatusBadge status={e.payment_status} overdue={e.has_overdue_installment} />
            {!closed && (
              <label className="flex items-center gap-1.5 text-xs">
                <Checkbox
                  checked={!!e.material_delivered_at}
                  disabled={material.isPending}
                  onCheckedChange={(v) => toggleMaterial(v === true)}
                  aria-label={`Material entregue para ${e.person.name}`}
                />
                Material
              </label>
            )}
            {!closed && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={`Ações de ${e.person.name}`}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {owes && (
                    <DropdownMenuItem onSelect={() => onAction("manual")}>
                      <Banknote className="mr-2 h-4 w-4" /> Registrar pagamento presencial
                    </DropdownMenuItem>
                  )}
                  {owes && e.payment_url && (
                    <DropdownMenuItem onSelect={() => void copyLink(e.payment_url)}>
                      <Link2 className="mr-2 h-4 w-4" /> Copiar link de pagamento
                    </DropdownMenuItem>
                  )}
                  {owes && !e.payment_url && e.balance_cents >= MIN_PAID_PRICE_CENTS && (
                    <DropdownMenuItem onSelect={newLink} disabled={pay.isPending}>
                      <Link2 className="mr-2 h-4 w-4" /> Gerar link de pagamento
                    </DropdownMenuItem>
                  )}
                  {canScholarship && (
                    <DropdownMenuItem onSelect={() => onAction("scholarship")}>
                      <HandCoins className="mr-2 h-4 w-4" /> Conceder bolsa
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={() => onAction("cancel")}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {e.paid_cents > 0 ? "Cancelar e reembolsar" : "Cancelar matrícula"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {open && (
          <div className="space-y-1 border-t pt-2 text-xs text-muted-foreground">
            {e.scholarship_reason && (
              <p>
                Bolsa: {e.scholarship_reason}
                {e.scholarship_granted_by && ` — concedida por ${e.scholarship_granted_by.name}`}
              </p>
            )}
            {e.installments > 1 && <p>Parcelado em {e.installments}x</p>}
            {e.expires_at && owes && (
              <p>Reserva até {new Date(e.expires_at).toLocaleString("pt-BR")}</p>
            )}
            {e.payments.length === 0 ? (
              <p>Nenhum pagamento registrado.</p>
            ) : (
              <ul className="space-y-0.5">
                {e.payments.map((p) => (
                  <li key={p.id} className={p.refunded_at ? "line-through" : undefined}>
                    {new Date(p.paid_at).toLocaleDateString("pt-BR")} — {formatBRL(p.amount_cents)}{" "}
                    {p.method === "asaas" ? "online" : "presencial"}
                    {p.recorded_by && ` (por ${p.recorded_by.name})`}
                    {p.note && ` · ${p.note}`}
                    {p.refunded_at && ` · reembolsado${p.refund_note ? `: ${p.refund_note}` : ""}`}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScholarshipDialog({
  enrollment: e,
  classId,
  onClose,
}: {
  enrollment: EnrollmentFinance;
  classId: string;
  onClose: () => void;
}) {
  const grant = useGrantScholarship();
  const [full, setFull] = useState(false);
  const [amount, setAmount] = useState(e.discount_cents ? centsToInput(e.discount_cents) : "");
  const [reason, setReason] = useState(e.scholarship_reason);
  const discount = full ? e.gross_cents : parseCents(amount);
  const remaining = e.gross_cents - (discount || 0);
  const error =
    !full && amount && !(discount >= 0)
      ? "Valor inválido."
      : discount > e.gross_cents
        ? "A bolsa não pode passar do valor da matrícula."
        : remaining > 0 && remaining < MIN_PAID_PRICE_CENTS
          ? `O restante a pagar deve ser zero ou pelo menos ${formatBRL(MIN_PAID_PRICE_CENTS)}.`
          : "";

  const submit = () =>
    grant.mutate(
      { id: e.id, classId, body: { discount_cents: discount, reason: reason.trim() } },
      {
        onSuccess: () => {
          toast.success(remaining ? "Bolsa parcial concedida" : "Bolsa integral concedida");
          onClose();
        },
        onError: (err) => toast.error(apiErrorMessage(err, "Não foi possível conceder a bolsa.")),
      },
    );

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bolsa — {e.person.name}</DialogTitle>
          <DialogDescription>
            Matrícula de {formatBRL(e.gross_cents)}. O link de pagamento é refeito com o novo valor.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={full} onCheckedChange={(v) => setFull(v === true)} />
            Bolsa integral
          </label>
          {!full && (
            <div className="space-y-1.5">
              <Label htmlFor="scholarship-amount">Desconto (R$)</Label>
              <Input
                id="scholarship-amount"
                inputMode="decimal"
                value={amount}
                onChange={(ev) => setAmount(ev.target.value)}
                placeholder="0,00"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="scholarship-reason">Motivo</Label>
            <Input
              id="scholarship-reason"
              value={reason}
              onChange={(ev) => setReason(ev.target.value)}
              placeholder="Ex: família em dificuldade"
            />
          </div>
          {discount >= 0 && !error && (
            <p className="text-sm">
              A pagar: <strong>{formatBRL(Math.max(remaining, 0))}</strong>
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Voltar
          </Button>
          <Button
            onClick={submit}
            disabled={grant.isPending || !!error || !(discount > 0) || !reason.trim()}
          >
            {grant.isPending ? "Salvando…" : "Conceder bolsa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ManualPaymentDialog({
  enrollment: e,
  classId,
  onClose,
}: {
  enrollment: EnrollmentFinance;
  classId: string;
  onClose: () => void;
}) {
  const record = useManualPayment();
  const [amount, setAmount] = useState(centsToInput(e.balance_cents));
  const [note, setNote] = useState("");
  const cents = parseCents(amount);
  const error =
    amount && !(cents > 0)
      ? "Valor inválido."
      : cents > e.balance_cents
        ? `O valor em aberto é ${formatBRL(e.balance_cents)}.`
        : "";

  const submit = () =>
    record.mutate(
      { id: e.id, classId, body: { amount_cents: cents, note: note.trim() } },
      {
        onSuccess: () => {
          toast.success("Pagamento registrado");
          onClose();
        },
        onError: (err) => toast.error(apiErrorMessage(err, "Não foi possível registrar.")),
      },
    );

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pagamento presencial — {e.person.name}</DialogTitle>
          <DialogDescription>
            Dinheiro, Pix ou cartão recebidos pela igreja. Em aberto: {formatBRL(e.balance_cents)}.
            {e.payment_url && " O link online é cancelado para não ser pago em dobro."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="manual-amount">Valor recebido (R$)</Label>
            <Input
              id="manual-amount"
              inputMode="decimal"
              value={amount}
              onChange={(ev) => setAmount(ev.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="manual-note">Observação</Label>
            <Input
              id="manual-note"
              value={note}
              onChange={(ev) => setNote(ev.target.value)}
              placeholder="Ex: Pix na secretaria"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Voltar
          </Button>
          <Button onClick={submit} disabled={record.isPending || !!error || !(cents > 0)}>
            {record.isPending ? "Salvando…" : "Registrar pagamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelDialog({
  enrollment: e,
  courseClass,
  onClose,
}: {
  enrollment: EnrollmentFinance;
  courseClass: CourseClass;
  onClose: () => void;
}) {
  const cancel = useCancelEnrollment();
  const [note, setNote] = useState("");
  const [force, setForce] = useState(false);
  const paid = e.paid_cents > 0;
  const needsOverride = paid && !refundAllowed(courseClass);
  const online = e.payments.filter((p) => !p.refunded_at && p.method === "asaas");
  const manual = e.payments.filter((p) => !p.refunded_at && p.method === "manual");
  const sum = (list: typeof online) => list.reduce((s, p) => s + p.amount_cents, 0);

  const submit = () =>
    cancel.mutate(
      { id: e.id, classId: courseClass.id, body: { force, note: note.trim() } },
      {
        onSuccess: () => {
          toast.success(paid ? "Matrícula cancelada e reembolsada" : "Matrícula cancelada");
          onClose();
        },
        onError: (err) => toast.error(apiErrorMessage(err, "Não foi possível cancelar.")),
      },
    );

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar matrícula — {e.person.name}</DialogTitle>
          <DialogDescription>A vaga é liberada. Esta ação não pode ser desfeita.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {paid ? (
            <ul className="list-disc space-y-1 pl-5">
              {online.length > 0 && (
                <li>{formatBRL(sum(online))} pagos online serão estornados pelo Asaas.</li>
              )}
              {manual.length > 0 && (
                <li>
                  {formatBRL(sum(manual))} pagos presencialmente devem ser devolvidos pela
                  secretaria — ficam marcados como reembolsados.
                </li>
              )}
            </ul>
          ) : (
            <p>Nenhum valor foi pago; a cobrança em aberto é cancelada.</p>
          )}
          {needsOverride && (
            <label className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 dark:border-amber-900 dark:bg-amber-950">
              <Checkbox
                checked={force}
                onCheckedChange={(v) => setForce(v === true)}
                className="mt-0.5"
              />
              <span>
                Reembolsar como exceção
                <span className="block text-xs text-muted-foreground">
                  {courseClass.refund_before_start
                    ? "As aulas já começaram; pela regra da turma não haveria reembolso."
                    : "Esta turma não prevê reembolso."}
                </span>
              </span>
            </label>
          )}
          {paid && (
            <div className="space-y-1.5">
              <Label htmlFor="cancel-note">Observação</Label>
              <Input
                id="cancel-note"
                value={note}
                onChange={(ev) => setNote(ev.target.value)}
                placeholder="Ex: devolvido em dinheiro"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Voltar
          </Button>
          <Button
            variant="destructive"
            onClick={submit}
            disabled={cancel.isPending || (needsOverride && !force)}
          >
            {cancel.isPending
              ? "Cancelando…"
              : paid
                ? "Cancelar e reembolsar"
                : "Cancelar matrícula"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExpensesSection({ classId }: { classId: string }) {
  const { data: expenses } = useClassExpenses(classId);
  const create = useCreateExpense(classId);
  const remove = useDeleteExpense(classId);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const cents = parseCents(amount);
  const valid = description.trim() && cents > 0 && date;

  const add = () =>
    create.mutate(
      { description: description.trim(), amount_cents: cents, date },
      {
        onSuccess: () => {
          setDescription("");
          setAmount("");
        },
        onError: (err) => toast.error(apiErrorMessage(err, "Não foi possível salvar a despesa.")),
      },
    );

  return (
    <DetailSection title="Despesas da turma" count={expenses?.length}>
      <Card>
        <CardContent className="space-y-3 p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_8rem_10rem_auto]">
            <Input
              aria-label="Descrição da despesa"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: impressão das apostilas"
            />
            <Input
              aria-label="Valor da despesa"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="R$ 0,00"
            />
            <Input
              aria-label="Data da despesa"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <Button onClick={add} disabled={!valid || create.isPending}>
              <Plus className="mr-1 h-4 w-4" /> Adicionar
            </Button>
          </div>
          {(expenses ?? []).length === 0 ? (
            <EmptyState>Nenhuma despesa lançada.</EmptyState>
          ) : (
            <ul className="divide-y">
              {(expenses ?? []).map((x) => (
                <li
                  key={x.id}
                  className="flex items-center justify-between gap-2 py-2 text-sm"
                  data-testid="expense"
                >
                  <div className="min-w-0">
                    <div className="truncate">{x.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(x.date + "T00:00:00").toLocaleDateString("pt-BR")}
                      {x.created_by && ` · ${x.created_by.name}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums">{formatBRL(x.amount_cents)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Excluir despesa ${x.description}`}
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(x.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </DetailSection>
  );
}
