// Member views of the Cursos area: open classes to enroll in and the person's
// own enrollments. Shown to everyone (coordinators and teachers included).
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Award,
  CalendarDays,
  Check,
  ExternalLink,
  GraduationCap,
  MapPin,
  Minus,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CardGridSkeleton } from "@/components/skeletons";
import { EmptyState } from "@/components/detail/DetailSection";
import {
  initialSelection,
  selectionComplete,
  selectionTotal,
  toChoices,
  type FeeSelection,
} from "@/lib/fee-selection";
import { FeeChoicesPicker } from "@/components/courses/FeeChoicesPicker";
import { MyTracks } from "@/components/courses/Tracks";
import { PaymentStatusBadge } from "@/components/courses/PaymentStatusBadge";
import { attendanceLabel, attendanceTone } from "@/lib/attendance";
import { CertificateButton } from "@/components/courses/CertificateButton";
import {
  holdsSeat,
  isOpenPayment,
  useCancelEnrollment,
  useMyEnrollments,
  useOpenClasses,
  usePayEnrollment,
  useSelfEnroll,
  WEEKDAY_LABEL,
  type MyEnrollment,
  type OpenClass,
} from "@/lib/api/courses";
import { apiErrorMessage } from "@/lib/api/client";
import { useMe } from "@/lib/api/auth";
import { cpfDigits, isValidCpf } from "@/lib/cpf";
import { CpfInput } from "@/components/CpfInput";
import { useCpfPrompt } from "@/hooks/use-cpf-prompt";
import { formatBRL, MIN_PAID_PRICE_CENTS } from "@/lib/api/payments";

function formatDate(d: string | null) {
  return d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "";
}

function schedule(c: { weekday: number | null; start_time: string | null }) {
  return [c.weekday ? WEEKDAY_LABEL[c.weekday] : null, c.start_time?.slice(0, 5)]
    .filter(Boolean)
    .join(" · ");
}

export function OpenClasses({ onEnrolled }: { onEnrolled: () => void }) {
  const { data: classes, isLoading } = useOpenClasses();
  const [enrolling, setEnrolling] = useState<OpenClass | null>(null);

  if (isLoading) return <CardGridSkeleton />;
  if (!classes?.length) return <EmptyState>Nenhuma turma com inscrições abertas agora.</EmptyState>;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {classes.map((c) => {
          const full = c.seats_left === 0;
          const missing = c.missing_prerequisites;
          return (
            <Card key={c.id} data-testid="open-class">
              <CardContent className="flex h-full flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {c.course_name}
                    </p>
                    <h3 className="text-lg font-semibold tracking-tight">{c.name}</h3>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {c.base_price_cents
                      ? `a partir de ${formatBRL(c.base_price_cents)}`
                      : c.fee_items.length
                        ? "Itens opcionais"
                        : "Gratuito"}
                  </Badge>
                </div>
                {(c.description || c.course_description) && (
                  <p className="text-sm text-muted-foreground">
                    {c.description || c.course_description}
                  </p>
                )}
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> {c.campus.name}
                    {schedule(c) && ` · ${schedule(c)}`}
                  </li>
                  {c.start_date && (
                    <li className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" /> Início {formatDate(c.start_date)}
                      {c.enrollment_deadline &&
                        ` · inscrições até ${formatDate(c.enrollment_deadline)}`}
                    </li>
                  )}
                  {c.seats_left != null && (
                    <li className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {full ? "Turma lotada" : `${c.seats_left} vaga(s)`}
                    </li>
                  )}
                </ul>
                {c.prerequisites.length > 0 && (
                  <p
                    className={
                      missing.length
                        ? "text-xs text-amber-700 dark:text-amber-400"
                        : "text-xs text-muted-foreground"
                    }
                    data-testid="open-class-prerequisites"
                  >
                    {missing.length
                      ? `Conclua antes: ${missing.map((p) => p.name).join(", ")}`
                      : `Requer: ${c.prerequisites.map((p) => p.name).join(", ")} ✓`}
                  </p>
                )}
                <div className="mt-auto pt-2">
                  {c.my_enrollment ? (
                    <div className="flex items-center gap-2">
                      <PaymentStatusBadge status={c.my_enrollment.payment_status} />
                      <Button size="sm" variant="link" onClick={onEnrolled}>
                        Ver matrícula
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      disabled={full || missing.length > 0}
                      onClick={() => setEnrolling(c)}
                    >
                      {full
                        ? "Sem vagas"
                        : missing.length
                          ? "Pré-requisito pendente"
                          : "Inscrever-me"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {enrolling && (
        <EnrollDialog
          courseClass={enrolling}
          onClose={() => setEnrolling(null)}
          onEnrolled={() => {
            setEnrolling(null);
            onEnrolled();
          }}
        />
      )}
    </>
  );
}

function EnrollDialog({
  courseClass: c,
  onClose,
  onEnrolled,
}: {
  courseClass: OpenClass;
  onClose: () => void;
  onEnrolled: () => void;
}) {
  const enroll = useSelfEnroll();
  const { data: me } = useMe();
  const [selection, setSelection] = useState<FeeSelection>(() => initialSelection(c.fee_items));
  const [installments, setInstallments] = useState(1);
  const [cpf, setCpf] = useState("");
  const total = selectionTotal(c.fee_items, selection);
  const tooLow = total > 0 && total < MIN_PAID_PRICE_CENTS;
  // Asaas needs a CPF to charge: asked once, then kept on the person.
  const askCpf = total > 0 && me?.has_cpf === false;

  const submit = () =>
    enroll.mutate(
      {
        classId: c.id,
        items: toChoices(selection),
        installments,
        ...(askCpf ? { cpf: cpfDigits(cpf) } : {}),
      },
      {
        onSuccess: (enrollment) => {
          if (enrollment.payment_url) {
            toast.success("Matrícula reservada! Conclua o pagamento para garantir a vaga.");
            window.open(enrollment.payment_url, "_blank", "noopener");
          } else {
            toast.success("Matrícula feita!");
          }
          onEnrolled();
        },
        onError: (e) => toast.error(apiErrorMessage(e, "Não foi possível fazer a inscrição.")),
      },
    );

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {c.course_name} — {c.name}
          </DialogTitle>
          <DialogDescription>
            {c.fee_items.length
              ? "Confira os itens da matrícula e escolha os opcionais."
              : "Turma gratuita. Confirme sua inscrição."}
          </DialogDescription>
        </DialogHeader>

        {c.fee_items.length > 0 && (
          <FeeChoicesPicker
            items={c.fee_items}
            selection={selection}
            onChange={setSelection}
            maxInstallments={c.max_installments}
            installments={installments}
            onInstallmentsChange={setInstallments}
          />
        )}

        {total > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            <li>
              Sua vaga fica reservada por {c.reservation_days} dia(s) enquanto o pagamento não é
              confirmado.
            </li>
            <li>Pagamento por Pix, boleto ou cartão, na página segura do Asaas.</li>
            <li>
              {c.refund_before_start
                ? "Cancelamento com reembolso até o início das aulas, pela coordenação do curso."
                : "Esta turma não prevê reembolso após o pagamento."}
            </li>
          </ul>
        )}
        {askCpf && <CpfInput value={cpf} onChange={setCpf} />}
        {tooLow && (
          <p className="text-sm text-destructive">
            O valor mínimo para pagamento online é {formatBRL(MIN_PAID_PRICE_CENTS)}.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Voltar
          </Button>
          <Button
            onClick={submit}
            disabled={
              enroll.isPending ||
              tooLow ||
              !selectionComplete(c.fee_items, selection) ||
              (askCpf && !isValidCpf(cpf))
            }
          >
            {enroll.isPending
              ? "Inscrevendo…"
              : total > 0
                ? `Inscrever e pagar ${formatBRL(total)}`
                : "Confirmar inscrição"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MyEnrollments() {
  const { data: mine, isLoading } = useMyEnrollments();
  return (
    <div className="space-y-6">
      <MyTracks />
      {isLoading ? (
        <CardGridSkeleton />
      ) : !mine?.length ? (
        <EmptyState>Você ainda não tem matrículas.</EmptyState>
      ) : (
        <div className="space-y-3">
          {mine.map((e) => (
            <MyEnrollmentCard key={e.id} enrollment={e} />
          ))}
        </div>
      )}
    </div>
  );
}

/** The student's presence lesson by lesson, against the class's minimum. */
function MyAttendance({ enrollment: e }: { enrollment: MyEnrollment }) {
  const min = e.course_class.min_attendance_percent;
  return (
    <div className="space-y-2 rounded-md border p-3" data-testid="my-attendance">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span>
          Presença:{" "}
          <span className={`font-medium ${attendanceTone(e.meets_attendance, e.attendance)}`}>
            {attendanceLabel(e.attendance)}
          </span>
        </span>
        <span className="text-xs text-muted-foreground">Mínimo para concluir: {min}%</span>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {e.attendance.lessons.map((l) => {
          const label = `Aula ${l.order}${l.title ? ` — ${l.title}` : ""}${
            l.date ? ` (${formatDate(l.date)})` : ""
          }: ${l.present == null ? "presença não registrada" : l.present ? "presente" : "falta"}`;
          return (
            <li
              key={l.id}
              title={label}
              aria-label={label}
              className={`grid h-7 w-7 place-items-center rounded-md border text-xs ${
                l.present == null
                  ? "text-muted-foreground"
                  : l.present
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
              }`}
            >
              {l.present == null ? (
                <Minus className="h-3 w-3" />
              ) : l.present ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
            </li>
          );
        })}
      </ul>
      {e.status === "active" && e.attendance.percent != null && !e.meets_attendance && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Sua presença está abaixo do mínimo. Fale com o professor se precisar de ajuda para repor
          as aulas.
        </p>
      )}
    </div>
  );
}

function MyEnrollmentCard({ enrollment: e }: { enrollment: MyEnrollment }) {
  const pay = usePayEnrollment();
  const cancel = useCancelEnrollment();
  const cpfPrompt = useCpfPrompt();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const owes = isOpenPayment(e.payment_status);
  const cls = e.course_class;

  // Keep the "reserved until" countdown honest without a refetch.
  useEffect(() => {
    if (!e.expires_at) return;
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, [e.expires_at]);
  const hoursLeft = e.expires_at
    ? Math.max(0, Math.round((new Date(e.expires_at).getTime() - now) / 3_600_000))
    : null;

  const openPayment = (cpf?: string) => {
    if (e.payment_url) {
      window.open(e.payment_url, "_blank", "noopener");
      return;
    }
    pay.mutate(
      { id: e.id, body: cpf ? { cpf } : {} },
      {
        onSuccess: (updated) => {
          if (updated.payment_url) window.open(updated.payment_url, "_blank", "noopener");
        },
        onError: (err) =>
          cpfPrompt.handleError(err, "Não foi possível gerar o pagamento.", (c) => openPayment(c)),
      },
    );
  };

  return (
    <Card data-testid="my-enrollment">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {cls.course_name}
              </p>
              <h3 className="font-semibold">{cls.name}</h3>
              <p className="text-xs text-muted-foreground">
                {cls.campus}
                {schedule(cls) && ` · ${schedule(cls)}`}
                {cls.start_date && ` · início ${formatDate(cls.start_date)}`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {e.status === "completed" && (
              <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-600">
                <Award className="h-3 w-3" /> Concluído
              </Badge>
            )}
            <PaymentStatusBadge status={e.payment_status} overdue={e.has_overdue_installment} />
          </div>
        </div>

        {holdsSeat(e) && e.attendance.lessons.length > 0 && <MyAttendance enrollment={e} />}

        {e.status === "completed" && e.certificate_code && (
          <div
            className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-emerald-500/10 p-3"
            data-testid="my-certificate"
          >
            <div className="text-sm">
              <div className="font-medium">Parabéns, você concluiu este curso!</div>
              <div className="text-xs text-muted-foreground">
                Código do certificado: <span className="font-mono">{e.certificate_code}</span>
              </div>
            </div>
            <CertificateButton
              enrollmentId={e.id}
              courseName={cls.course_name}
              personName={e.person.name}
            />
          </div>
        )}

        {e.items.length > 0 && (
          <div className="rounded-md bg-muted/50 p-3 text-sm">
            <ul className="space-y-0.5">
              {e.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-2">
                  <span>{i.option ? `${i.name} (${i.option})` : i.name}</span>
                  <span className="tabular-nums">{formatBRL(i.price_cents)}</span>
                </li>
              ))}
              {e.discount_cents > 0 && (
                <li className="flex justify-between gap-2 text-emerald-700 dark:text-emerald-400">
                  <span>Bolsa</span>
                  <span className="tabular-nums">−{formatBRL(e.discount_cents)}</span>
                </li>
              )}
            </ul>
            <div className="mt-2 flex justify-between border-t pt-2 font-medium">
              <span>Total</span>
              <span className="tabular-nums">{formatBRL(e.amount_cents)}</span>
            </div>
            {e.paid_cents > 0 && owes && (
              <p className="mt-1 text-xs text-muted-foreground">
                Pago {formatBRL(e.paid_cents)} · falta {formatBRL(e.balance_cents)}
              </p>
            )}
          </div>
        )}

        {owes && hoursLeft != null && (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Vaga reservada por mais{" "}
            {hoursLeft < 24 ? `${hoursLeft} h` : `${Math.ceil(hoursLeft / 24)} dia(s)`}. Após esse
            prazo, sem pagamento, a vaga é liberada.
          </p>
        )}
        {e.payment_status === "expired" && (
          <p className="text-xs text-muted-foreground">
            A reserva expirou. Se ainda houver vagas, você pode se inscrever de novo em “Cursos
            abertos”.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {owes && e.balance_cents >= MIN_PAID_PRICE_CENTS && (
            <Button size="sm" onClick={() => openPayment()} disabled={pay.isPending}>
              <ExternalLink className="mr-1.5 h-4 w-4" />
              {e.payment_status === "partial" ? "Pagar restante" : "Pagar agora"}
            </Button>
          )}
          {owes &&
            !e.payment_url &&
            e.payments.length === 0 &&
            e.balance_cents > 0 &&
            e.installments === 1 && (
              <span className="self-center text-xs text-muted-foreground">
                Ou pague na secretaria do curso.
              </span>
            )}
          {e.can_cancel && (
            <Button size="sm" variant="outline" onClick={() => setConfirmCancel(true)}>
              Cancelar inscrição
            </Button>
          )}
          {!e.can_cancel && e.paid_cents > 0 && owes === false && e.payment_status === "paid" && (
            <span className="self-center text-xs text-muted-foreground">
              Para cancelar uma matrícula paga, fale com a coordenação do curso.
            </span>
          )}
        </div>
      </CardContent>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar inscrição?</AlertDialogTitle>
            <AlertDialogDescription>
              Sua vaga em {cls.course_name} — {cls.name} será liberada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                cancel.mutate(
                  { id: e.id, body: {} },
                  {
                    onSuccess: () => toast.success("Inscrição cancelada"),
                    onError: (err) =>
                      toast.error(apiErrorMessage(err, "Não foi possível cancelar.")),
                  },
                )
              }
            >
              Cancelar inscrição
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {cpfPrompt.dialog}
    </Card>
  );
}
