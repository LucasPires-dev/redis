import { useState } from "react";
import {
  AlertCircle,
  CalendarCheck,
  CalendarClock,
  CalendarOff,
  CalendarPlus,
  ChevronDown,
  Pencil,
  Trash2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DetailSection, EmptyState } from "@/components/detail/DetailSection";
import { RoleBadge } from "@/components/detail/RoleBadge";
import { apiErrorMessage } from "@/lib/api/client";
import {
  describeMissingFields,
  useCellCalendar,
  useDeleteCellMeeting,
  useSaveCellMeeting,
  type CalendarEntry,
  type CalendarStatus,
  type Cell,
  type CellMeeting,
} from "@/lib/api/cells";
import { formatDate } from "@/lib/api/seasons";
import type { RosterEntry } from "@/lib/roster";

interface Props {
  cell: Cell;
  roster: RosterEntry[];
}

interface FormState {
  meetingId?: string;
  // Set when registering a scheduled date (vs. an extra meeting).
  scheduled: boolean;
  date: string;
  held: boolean;
  cancelReason: string;
  notes: string;
  attendeeIds: Set<string>;
  visitorsCount: number;
}

const REASON_SUGGESTIONS = ["Feriado", "Evento da igreja", "Cancelado pela liderança"];
const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// "Qua, 12/08/2026"
function formatDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${WEEKDAY_SHORT[new Date(y, m - 1, d).getDay()]}, ${formatDate(iso)}`;
}

const STATUS_BADGE: Record<CalendarStatus, { label: string; className: string }> = {
  registered: {
    label: "Registrado",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  not_held: { label: "Não houve", className: "bg-muted text-muted-foreground" },
  pending: {
    label: "Sem registro",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  today: { label: "Hoje", className: "border-primary/40 bg-primary/10 text-primary" },
  upcoming: { label: "Próximo", className: "text-muted-foreground" },
};

const STATUS_ICON: Record<CalendarStatus, typeof CalendarCheck> = {
  registered: CalendarCheck,
  not_held: CalendarOff,
  pending: AlertCircle,
  today: CalendarClock,
  upcoming: CalendarClock,
};

export function CellMeetingsSection({ cell, roster }: Props) {
  const { data: calendar, isLoading } = useCellCalendar(cell.id);
  const saveMeeting = useSaveCellMeeting(cell.id);
  const deleteMeeting = useDeleteCellMeeting(cell.id);
  const [form, setForm] = useState<FormState | null>(null);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  // An incomplete cell isn't active: no new records (the API rejects them too).
  const canRegister = cell.can_manage && cell.missing_fields.length === 0;

  const blankForm = (date: string, scheduled: boolean, held: boolean): FormState => ({
    scheduled,
    date,
    held,
    cancelReason: "",
    notes: "",
    attendeeIds: new Set(),
    visitorsCount: 0,
  });

  const openEdit = (m: CellMeeting, scheduled: boolean) =>
    setForm({
      meetingId: m.id,
      scheduled,
      date: m.date,
      held: m.held,
      cancelReason: m.cancel_reason,
      notes: m.notes,
      attendeeIds: new Set(m.attendees.map((a) => a.id)),
      visitorsCount: m.visitors_count,
    });

  const toggleAttendee = (id: string, checked: boolean) => {
    if (!form) return;
    const next = new Set(form.attendeeIds);
    if (checked) next.add(id);
    else next.delete(id);
    setForm({ ...form, attendeeIds: next });
  };

  const isFuture = (date: string) => date > today();
  const reasonMissing = !!form && !form.held && !form.cancelReason.trim();

  const submit = () => {
    if (!form || reasonMissing) return;
    saveMeeting.mutate(
      {
        meetingId: form.meetingId,
        date: form.date,
        held: form.held,
        cancel_reason: form.held ? "" : form.cancelReason.trim(),
        notes: form.notes,
        attendee_ids: form.held ? [...form.attendeeIds] : [],
        visitors_count: form.held ? form.visitorsCount : 0,
      },
      {
        onSuccess: () => {
          toast.success(
            !form.held
              ? "Encontro marcado como não realizado"
              : form.meetingId
                ? "Encontro atualizado"
                : "Presença registrada",
          );
          setForm(null);
        },
        onError: (e) => toast.error(apiErrorMessage(e, "Não foi possível salvar o encontro.")),
      },
    );
  };

  const remove = (m: CellMeeting) => {
    if (!window.confirm(`Excluir o registro de ${formatDate(m.date)}?`)) return;
    deleteMeeting.mutate(m.id, {
      onSuccess: () => toast.success("Registro excluído"),
      onError: () => toast.error("Não foi possível excluir o registro."),
    });
  };

  const entries = calendar?.entries ?? [];
  const summary = calendar?.summary;
  // Entries come newest first: the upcoming dates lead the list. Show only the
  // nearest one unless asked for the rest.
  const upcoming = entries.filter((e) => e.status === "upcoming").reverse();
  const past = entries.filter((e) => e.status !== "upcoming");
  const visibleUpcoming = showAllUpcoming ? upcoming : upcoming.slice(0, 1);

  const renderEntry = (entry: CalendarEntry) => {
    const { meeting, status } = entry;
    const Icon = STATUS_ICON[status];
    const badge = STATUS_BADGE[status];
    const isExtra = entry.scheduled_date === null;
    const scheduled = !isExtra;
    return (
      <Card
        key={`${entry.date}-${meeting?.id ?? "slot"}`}
        data-testid={`meeting-${entry.date}`}
        data-status={status}
        className={status === "pending" ? "border-amber-500/40" : undefined}
      >
        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              {formatDay(entry.date)}
              <Badge variant="outline" className={badge.className}>
                {badge.label}
              </Badge>
              {isExtra && <Badge variant="outline">Extra</Badge>}
              {meeting?.held && (
                <span className="font-normal text-muted-foreground">
                  {meeting.attendance_count} presentes
                  {meeting.visitors_count > 0 && ` (${meeting.visitors_count} visitantes)`}
                </span>
              )}
            </div>
            {meeting && !meeting.held && (
              <p className="text-sm text-muted-foreground">{meeting.cancel_reason}</p>
            )}
            {meeting?.held && meeting.attendees.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {meeting.attendees.map((a) => a.name).join(", ")}
              </p>
            )}
            {meeting?.notes && <p className="whitespace-pre-line text-sm">{meeting.notes}</p>}
          </div>

          {cell.can_manage && (meeting || canRegister) && (
            <div className="flex shrink-0 flex-wrap gap-1">
              {meeting ? (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEdit(meeting, scheduled)}
                    aria-label={`Editar ${formatDate(entry.date)}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => remove(meeting)}
                    aria-label={`Excluir ${formatDate(entry.date)}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              ) : status === "upcoming" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1"
                  onClick={() => setForm(blankForm(entry.date, true, false))}
                >
                  <CalendarOff className="h-4 w-4" /> Não vai acontecer
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant={status === "pending" ? "default" : "outline"}
                  className="gap-1"
                  onClick={() => setForm(blankForm(entry.date, true, true))}
                >
                  <CalendarCheck className="h-4 w-4" /> Registrar presença
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <DetailSection
      title="Encontros"
      action={
        canRegister ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setForm(blankForm(today(), false, true))}
            className="gap-1"
          >
            <CalendarPlus className="h-4 w-4" /> Encontro extra
          </Button>
        ) : undefined
      }
    >
      {isLoading ? (
        <EmptyState>Carregando…</EmptyState>
      ) : (
        <div className="space-y-3">
          {cell.missing_fields.length > 0 && (
            <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              Os encontros poderão ser registrados quando a célula tiver{" "}
              {describeMissingFields(cell.missing_fields)} definidos.
            </p>
          )}

          {summary && summary.scheduled + summary.registered + summary.not_held > 0 && (
            <div
              className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground"
              data-testid="meetings-summary"
            >
              <span>
                <span className="font-semibold text-foreground">{summary.registered}</span>{" "}
                registrados
                {summary.scheduled > 0 && ` de ${summary.scheduled} previstos`}
              </span>
              {summary.pending > 0 && (
                <span className="text-amber-700 dark:text-amber-400">
                  <span className="font-semibold">{summary.pending}</span> sem registro
                </span>
              )}
              {summary.not_held > 0 && <span>{summary.not_held} não aconteceram</span>}
              {summary.average_attendance !== null && (
                <span>
                  Média de{" "}
                  <span className="font-semibold text-foreground">
                    {summary.average_attendance}
                  </span>{" "}
                  por encontro
                </span>
              )}
              {summary.total_visitors > 0 && <span>{summary.total_visitors} visitantes</span>}
            </div>
          )}

          {entries.length === 0 ? (
            <EmptyState>Nenhum encontro registrado nesta temporada.</EmptyState>
          ) : (
            <>
              {visibleUpcoming.map(renderEntry)}
              {upcoming.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={() => setShowAllUpcoming(!showAllUpcoming)}
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${showAllUpcoming ? "rotate-180" : ""}`}
                  />
                  {showAllUpcoming
                    ? "Ocultar próximas datas"
                    : `Mostrar próximas datas (${upcoming.length - 1})`}
                </Button>
              )}
              {past.map(renderEntry)}
            </>
          )}
        </div>
      )}

      <Dialog open={form !== null} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {form?.meetingId
                ? "Editar encontro"
                : form?.scheduled
                  ? `Encontro de ${form ? formatDay(form.date) : ""}`
                  : "Encontro extra"}
            </DialogTitle>
            <DialogDescription>
              {form?.scheduled
                ? "Marque quem esteve presente ou informe que o encontro não aconteceu."
                : "Um encontro fora do dia de sempre da célula."}
            </DialogDescription>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <ToggleGroup
                type="single"
                variant="outline"
                value={form.held ? "held" : "not_held"}
                onValueChange={(v) => v && setForm({ ...form, held: v === "held" })}
                className="justify-start"
              >
                <ToggleGroupItem
                  value="held"
                  disabled={isFuture(form.date)}
                  className="gap-1"
                  aria-label="Aconteceu"
                >
                  <CalendarCheck className="h-4 w-4" /> Aconteceu
                </ToggleGroupItem>
                <ToggleGroupItem value="not_held" className="gap-1" aria-label="Não aconteceu">
                  <CalendarOff className="h-4 w-4" /> Não aconteceu
                </ToggleGroupItem>
              </ToggleGroup>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="meeting-date">Data</Label>
                  <Input
                    id="meeting-date"
                    type="date"
                    value={form.date}
                    min={cell.effective_start ?? undefined}
                    max={(form.held ? today() : cell.effective_end) ?? undefined}
                    onChange={(e) => {
                      const date = e.target.value;
                      setForm({ ...form, date, held: isFuture(date) ? false : form.held });
                    }}
                  />
                </div>
                {form.held && (
                  <div className="space-y-1.5">
                    <Label htmlFor="meeting-visitors" className="flex items-center gap-1">
                      <UserPlus className="h-3.5 w-3.5" /> Visitantes
                    </Label>
                    <Input
                      id="meeting-visitors"
                      type="number"
                      min={0}
                      placeholder="0"
                      // Empty instead of "0", so clearing the field and typing
                      // doesn't end up as "02"/"20".
                      value={form.visitorsCount || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          visitorsCount: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                    />
                  </div>
                )}
              </div>

              {form.held ? (
                <>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label>
                        Presença ({form.attendeeIds.size} de {roster.length})
                      </Label>
                      {roster.length > 0 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setForm({
                              ...form,
                              attendeeIds:
                                form.attendeeIds.size === roster.length
                                  ? new Set()
                                  : new Set(roster.map((r) => r.person.id)),
                            })
                          }
                        >
                          {form.attendeeIds.size === roster.length
                            ? "Desmarcar todos"
                            : "Marcar todos"}
                        </Button>
                      )}
                    </div>
                    {roster.length === 0 ? (
                      <EmptyState>A célula ainda não tem membros.</EmptyState>
                    ) : (
                      <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
                        {roster.map(({ person, role }) => (
                          <label
                            key={person.id}
                            className="flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 hover:bg-muted"
                          >
                            <Checkbox
                              checked={form.attendeeIds.has(person.id)}
                              onCheckedChange={(c) => toggleAttendee(person.id, c === true)}
                            />
                            <span className="flex-1 truncate text-sm">{person.name}</span>
                            <RoleBadge role={role} />
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="meeting-notes">Anotações</Label>
                    <Textarea
                      id="meeting-notes"
                      placeholder="Tema, pedidos de oração, observações…"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="meeting-reason">Motivo</Label>
                  <Input
                    id="meeting-reason"
                    placeholder="Por que o encontro não aconteceu?"
                    maxLength={200}
                    value={form.cancelReason}
                    onChange={(e) => setForm({ ...form, cancelReason: e.target.value })}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {REASON_SUGGESTIONS.map((reason) => (
                      <Button
                        key={reason}
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-7 text-xs"
                        onClick={() => setForm({ ...form, cancelReason: reason })}
                      >
                        {reason}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>
              Cancelar
            </Button>
            <Button
              onClick={submit}
              disabled={saveMeeting.isPending || !form?.date || reasonMissing}
            >
              {saveMeeting.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DetailSection>
  );
}
