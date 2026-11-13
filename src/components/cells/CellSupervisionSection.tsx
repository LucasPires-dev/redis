import { useState } from "react";
import { ClipboardCheck, Pencil, Plus, Trash2, UserCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DetailSection, EmptyState } from "@/components/detail/DetailSection";
import { PersonSearch } from "@/components/cells/PersonSearch";
import { useMe } from "@/lib/api/auth";
import { apiErrorMessage } from "@/lib/api/client";
import {
  SUPERVISION_VISIT_KIND_LABEL,
  useDeleteSupervisionVisit,
  useSaveSupervisionVisit,
  useSetCellSupervisor,
  useSupervisionVisits,
  type Cell,
  type SupervisionVisit,
  type SupervisionVisitKind,
} from "@/lib/api/cells";
import { formatDate } from "@/lib/api/seasons";

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Supervisão: who supervises the cell (named by coordination) and, for the
 * supervisor and coordination, the visits with their notes. The cell's
 * leaders see only who their supervisor is.
 */
export function CellSupervisionSection({ cell }: { cell: Cell }) {
  const { data: me } = useMe();
  const setSupervisor = useSetCellSupervisor(cell.id);
  const { data: visits, isLoading } = useSupervisionVisits(cell.id, cell.can_supervise);
  const remove = useDeleteSupervisionVisit(cell.id);
  const [editing, setEditing] = useState<SupervisionVisit | "new" | null>(null);

  if (!cell.supervisor && !cell.can_supervise) return null;

  const pickSupervisor = (personId: string | null, name?: string) =>
    setSupervisor.mutate(personId, {
      onSuccess: () =>
        toast.success(name ? `${name} agora supervisiona a célula` : "Supervisor removido"),
      onError: (e) => toast.error(apiErrorMessage(e, "Não foi possível definir o supervisor.")),
    });

  return (
    <DetailSection
      title="Supervisão"
      action={
        cell.can_supervise ? (
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" /> Registrar visita
          </Button>
        ) : undefined
      }
    >
      <Card data-testid="cell-supervisor">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm">
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              {cell.supervisor ? (
                <span>
                  Supervisionada por <span className="font-medium">{cell.supervisor.name}</span>
                </span>
              ) : (
                <span className="text-muted-foreground">Sem supervisor definido</span>
              )}
            </div>
            {cell.can_supervise && (
              <span className="text-xs text-muted-foreground">
                {cell.last_supervision_visit
                  ? `Última visita em ${formatDate(cell.last_supervision_visit)}`
                  : "Nenhuma visita registrada"}
              </span>
            )}
          </div>
          {cell.can_coordinate && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-0 flex-1">
                <PersonSearch
                  endpoint={`/api/cells/${cell.id}/people-search/?for=leaders`}
                  placeholder={
                    cell.supervisor
                      ? "Trocar o supervisor: buscar pessoas do campus"
                      : `Definir supervisor: buscar pessoas do campus ${cell.campus.name}`
                  }
                  excludeIds={new Set(cell.supervisor ? [cell.supervisor.id] : [])}
                  disabled={setSupervisor.isPending}
                  onSelect={(p) => pickSupervisor(p.id, p.name)}
                />
              </div>
              {cell.supervisor && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1"
                  disabled={setSupervisor.isPending}
                  onClick={() => {
                    if (
                      window.confirm(`Tirar ${cell.supervisor!.name} da supervisão desta célula?`)
                    )
                      pickSupervisor(null);
                  }}
                >
                  <X className="h-4 w-4" /> Remover
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {cell.can_supervise && (
        <div className="mt-3 space-y-2">
          {isLoading ? (
            <EmptyState>Carregando…</EmptyState>
          ) : (visits ?? []).length === 0 ? (
            <EmptyState>
              Nenhuma visita registrada. Registre as visitas aos encontros e as conversas com a
              liderança para acompanhar a célula.
            </EmptyState>
          ) : (
            (visits ?? []).map((v) => {
              const canEdit = cell.can_coordinate || v.created_by?.id === me?.id;
              return (
                <Card key={v.id} data-testid="supervision-visit">
                  <CardContent className="space-y-1.5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{formatDate(v.date)}</span>
                        <Badge variant="secondary">{v.kind_display}</Badge>
                        {v.created_by && (
                          <span className="text-xs text-muted-foreground">
                            por {v.created_by.name}
                          </span>
                        )}
                      </div>
                      {canEdit && (
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            aria-label="Editar visita"
                            onClick={() => setEditing(v)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            aria-label="Excluir visita"
                            disabled={remove.isPending}
                            onClick={() => {
                              if (!window.confirm("Excluir este registro de visita?")) return;
                              remove.mutate(v.id, {
                                onSuccess: () => toast.success("Visita excluída"),
                                onError: (e) =>
                                  toast.error(apiErrorMessage(e, "Não foi possível excluir.")),
                              });
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {v.notes && (
                      <p className="whitespace-pre-line text-sm text-muted-foreground">{v.notes}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {cell.can_supervise && (
        <VisitDialog cell={cell} visit={editing} onClose={() => setEditing(null)} />
      )}
    </DetailSection>
  );
}

function VisitDialog({
  cell,
  visit,
  onClose,
}: {
  cell: Cell;
  visit: SupervisionVisit | "new" | null;
  onClose: () => void;
}) {
  const save = useSaveSupervisionVisit(cell.id);
  const existing = visit && visit !== "new" ? visit : null;
  const [form, setForm] = useState({
    date: todayIso(),
    kind: "meeting" as SupervisionVisitKind,
    notes: "",
  });
  const [openedFor, setOpenedFor] = useState<typeof visit>(null);
  // Reset the form whenever the dialog opens for another visit (or a new one).
  if (visit !== openedFor) {
    setOpenedFor(visit);
    if (visit) {
      setForm(
        existing
          ? { date: existing.date, kind: existing.kind, notes: existing.notes }
          : { date: todayIso(), kind: "meeting", notes: "" },
      );
    }
  }

  return (
    <Dialog open={visit !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? "Editar visita" : "Registrar visita"}</DialogTitle>
          <DialogDescription>
            Só a supervisão e a coordenação veem estes registros.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="visit-date">Data</Label>
              <Input
                id="visit-date"
                type="date"
                max={todayIso()}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="visit-kind">Tipo</Label>
              <Select
                value={form.kind}
                onValueChange={(v) => setForm({ ...form, kind: v as SupervisionVisitKind })}
              >
                <SelectTrigger id="visit-kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SUPERVISION_VISIT_KIND_LABEL) as SupervisionVisitKind[]).map(
                    (k) => (
                      <SelectItem key={k} value={k}>
                        {SUPERVISION_VISIT_KIND_LABEL[k]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="visit-notes">Anotações</Label>
            <Textarea
              id="visit-notes"
              rows={4}
              placeholder="Como foi o encontro, pontos fortes, onde a liderança precisa de apoio…"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={!form.date || save.isPending}
            onClick={() =>
              save.mutate(
                { ...form, visitId: existing?.id },
                {
                  onSuccess: () => {
                    toast.success(existing ? "Visita atualizada" : "Visita registrada");
                    onClose();
                  },
                  onError: (e) => toast.error(apiErrorMessage(e, "Não foi possível salvar.")),
                },
              )
            }
          >
            {save.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
