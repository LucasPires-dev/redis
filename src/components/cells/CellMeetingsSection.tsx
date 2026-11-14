import { useState } from "react";
import { CalendarCheck, Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DetailSection, EmptyState } from "@/components/detail/DetailSection";
import { RoleBadge } from "@/components/detail/RoleBadge";
import { apiErrorMessage } from "@/lib/api/client";
import {
  useCellMeetings,
  useDeleteCellMeeting,
  useSaveCellMeeting,
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
  date: string;
  notes: string;
  attendeeIds: Set<string>;
  visitorsCount: number;
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CellMeetingsSection({ cell, roster }: Props) {
  const { data: meetings, isLoading } = useCellMeetings(cell.id);
  const saveMeeting = useSaveCellMeeting(cell.id);
  const deleteMeeting = useDeleteCellMeeting(cell.id);
  const [form, setForm] = useState<FormState | null>(null);

  const openNew = () =>
    setForm({ date: today(), notes: "", attendeeIds: new Set(), visitorsCount: 0 });

  const openEdit = (m: CellMeeting) =>
    setForm({
      meetingId: m.id,
      date: m.date,
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

  const submit = () => {
    if (!form) return;
    saveMeeting.mutate(
      {
        meetingId: form.meetingId,
        date: form.date,
        notes: form.notes,
        attendee_ids: [...form.attendeeIds],
        visitors_count: form.visitorsCount,
      },
      {
        onSuccess: () => {
          toast.success(form.meetingId ? "Encontro atualizado" : "Encontro registrado");
          setForm(null);
        },
        onError: (e) => toast.error(apiErrorMessage(e, "Não foi possível salvar o encontro.")),
      },
    );
  };

  const remove = (m: CellMeeting) => {
    if (!window.confirm(`Excluir o encontro de ${formatDate(m.date)}?`)) return;
    deleteMeeting.mutate(m.id, {
      onSuccess: () => toast.success("Encontro excluído"),
      onError: () => toast.error("Não foi possível excluir o encontro."),
    });
  };

  const list = meetings ?? [];
  const average = list.length
    ? Math.round(list.reduce((sum, m) => sum + m.attendance_count, 0) / list.length)
    : null;

  return (
    <DetailSection
      title="Encontros"
      count={list.length}
      action={
        cell.can_manage ? (
          <Button size="sm" onClick={openNew} className="gap-1">
            <Plus className="h-4 w-4" /> Registrar encontro
          </Button>
        ) : undefined
      }
    >
      {isLoading ? (
        <EmptyState>Carregando…</EmptyState>
      ) : list.length === 0 ? (
        <EmptyState>Nenhum encontro registrado nesta temporada.</EmptyState>
      ) : (
        <div className="space-y-3">
          {average !== null && (
            <p className="text-sm text-muted-foreground">
              Média de presença: <span className="font-semibold text-foreground">{average}</span>{" "}
              por encontro
            </p>
          )}
          {list.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <CalendarCheck className="h-4 w-4 text-primary" />
                    {formatDate(m.date)}
                    <span className="font-normal text-muted-foreground">
                      · {m.attendance_count} presentes
                      {m.visitors_count > 0 && ` (${m.visitors_count} visitantes)`}
                    </span>
                  </div>
                  {m.attendees.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {m.attendees.map((a) => a.name).join(", ")}
                    </p>
                  )}
                  {m.notes && <p className="whitespace-pre-line text-sm">{m.notes}</p>}
                </div>
                {cell.can_manage && (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEdit(m)}
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => remove(m)}
                      aria-label="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={form !== null} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.meetingId ? "Editar encontro" : "Registrar encontro"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="meeting-date">Data</Label>
                  <Input
                    id="meeting-date"
                    type="date"
                    value={form.date}
                    min={cell.effective_start ?? undefined}
                    max={cell.effective_end ?? undefined}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="meeting-visitors" className="flex items-center gap-1">
                    <UserPlus className="h-3.5 w-3.5" /> Visitantes
                  </Label>
                  <Input
                    id="meeting-visitors"
                    type="number"
                    min={0}
                    value={form.visitorsCount}
                    onChange={(e) =>
                      setForm({ ...form, visitorsCount: Math.max(0, Number(e.target.value) || 0) })
                    }
                  />
                </div>
              </div>

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
                      {form.attendeeIds.size === roster.length ? "Desmarcar todos" : "Marcar todos"}
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
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={saveMeeting.isPending || !form?.date}>
              {saveMeeting.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DetailSection>
  );
}
