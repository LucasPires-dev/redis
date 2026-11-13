import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { CalendarClock, GitBranch, Pencil, Sprout } from "lucide-react";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DetailSection } from "@/components/detail/DetailSection";
import { RoleBadge } from "@/components/detail/RoleBadge";
import { apiErrorMessage } from "@/lib/api/client";
import {
  MEETING_DAY_LABEL,
  MEETING_DAYS,
  useCellLineage,
  useClearMultiplicationPlan,
  useMultiplyCell,
  useSetMultiplicationPlan,
  type Cell,
  type MeetingDay,
} from "@/lib/api/cells";
import { formatDate } from "@/lib/api/seasons";
import type { RosterEntry } from "@/lib/roster";

const NONE = "none";

/**
 * Multiplicação: the cell's generation and family (mother and daughters), the
 * plan (when it should multiply and who will lead the new cell) and, for
 * coordination, the action that creates the daughter cell.
 */
export function CellMultiplicationSection({ cell, roster }: { cell: Cell; roster: RosterEntry[] }) {
  const { data: lineage } = useCellLineage(cell.id);
  const [planning, setPlanning] = useState(false);
  const [multiplying, setMultiplying] = useState(false);
  const mother = lineage?.ancestors[0];

  return (
    <DetailSection
      title="Multiplicação"
      action={
        cell.can_coordinate && cell.missing_fields.length === 0 ? (
          <Button size="sm" className="gap-1" onClick={() => setMultiplying(true)}>
            <Sprout className="h-4 w-4" /> Multiplicar
          </Button>
        ) : undefined
      }
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card data-testid="cell-lineage">
          <CardContent className="space-y-2 p-4 text-sm">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {lineage ? `${lineage.generation}ª geração` : "Gerações"}
              </span>
            </div>
            {mother ? (
              <p className="text-muted-foreground">
                Nasceu da célula{" "}
                <Link
                  to="/app/celulas/$id"
                  params={{ id: mother.id }}
                  className="font-medium text-foreground hover:underline"
                >
                  {mother.name}
                </Link>
                {cell.multiplied_on && ` em ${formatDate(cell.multiplied_on)}`}.
              </p>
            ) : (
              <p className="text-muted-foreground">Não nasceu de uma multiplicação.</p>
            )}
            {lineage && lineage.daughters.length > 0 ? (
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Células filhas ({lineage.daughters.length})
                </div>
                <ul className="mt-1 space-y-1">
                  {lineage.daughters.map((d) => (
                    <li key={d.id} data-testid="cell-daughter">
                      <Link
                        to="/app/celulas/$id"
                        params={{ id: d.id }}
                        className="font-medium hover:underline"
                      >
                        {d.name}
                      </Link>
                      <span className="text-muted-foreground">
                        {d.leaders.length > 0 && ` · ${d.leaders.join(", ")}`}
                        {d.multiplied_on && ` · ${formatDate(d.multiplied_on)}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-muted-foreground">Ainda não gerou outras células.</p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="multiplication-plan">
          <CardContent className="space-y-2 p-4 text-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Plano de multiplicação</span>
              </div>
              {cell.can_manage && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1"
                  onClick={() => setPlanning(true)}
                >
                  <Pencil className="h-3.5 w-3.5" />{" "}
                  {cell.multiplication_date ? "Editar" : "Planejar"}
                </Button>
              )}
            </div>
            {cell.multiplication_date || cell.multiplication_leader ? (
              <div className="space-y-1">
                {cell.multiplication_date && (
                  <p>
                    Prevista para{" "}
                    <span className="font-medium">{formatDate(cell.multiplication_date)}</span>
                  </p>
                )}
                {cell.multiplication_leader && (
                  <p>
                    Nova célula liderada por{" "}
                    <span className="font-medium">{cell.multiplication_leader.name}</span>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">
                Sem data definida. Defina quando a célula deve multiplicar e quem vai liderar a
                nova, normalmente o líder em treinamento.
              </p>
            )}
            {cell.trainees.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {cell.trainees.map((t) => (
                  <span key={t.id} className="inline-flex items-center gap-1">
                    <RoleBadge role="trainee" />
                    <span>{t.name}</span>
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {cell.can_manage && (
        <PlanDialog cell={cell} roster={roster} open={planning} onOpenChange={setPlanning} />
      )}
      {cell.can_coordinate && (
        <MultiplyDialog
          cell={cell}
          roster={roster}
          open={multiplying}
          onOpenChange={setMultiplying}
        />
      )}
    </DetailSection>
  );
}

// Anyone in the cell but its leaders can lead the new one.
const candidates = (roster: RosterEntry[]) => roster.filter((r) => r.role !== "leader");

function PlanDialog({
  cell,
  roster,
  open,
  onOpenChange,
}: {
  cell: Cell;
  roster: RosterEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const save = useSetMultiplicationPlan(cell.id);
  const clear = useClearMultiplicationPlan(cell.id);
  const [date, setDate] = useState(cell.multiplication_date ?? "");
  const [leaderId, setLeaderId] = useState(cell.multiplication_leader?.id ?? NONE);

  const reset = (o: boolean) => {
    if (o) {
      setDate(cell.multiplication_date ?? "");
      setLeaderId(cell.multiplication_leader?.id ?? NONE);
    }
    onOpenChange(o);
  };
  const failed = (e: unknown) =>
    toast.error(apiErrorMessage(e, "Não foi possível salvar o plano."));

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Plano de multiplicação</DialogTitle>
          <DialogDescription>
            Quando a célula deve multiplicar e quem vai liderar a nova célula.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="plan-date">Data prevista</Label>
            <Input
              id="plan-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan-leader">Quem vai liderar a nova célula</Label>
            <Select value={leaderId} onValueChange={setLeaderId}>
              <SelectTrigger id="plan-leader">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Ainda não definido</SelectItem>
                {candidates(roster).map(({ person, role }) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.name}
                    {role === "trainee" ? " (em treinamento)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {cell.multiplication_date || cell.multiplication_leader ? (
            <Button
              variant="ghost"
              disabled={clear.isPending}
              onClick={() =>
                clear.mutate(undefined, {
                  onSuccess: () => {
                    toast.success("Plano removido");
                    onOpenChange(false);
                  },
                  onError: failed,
                })
              }
            >
              Remover plano
            </Button>
          ) : (
            <span />
          )}
          <Button
            disabled={save.isPending || (!date && leaderId === NONE)}
            onClick={() =>
              save.mutate(
                { date: date || null, leader_id: leaderId === NONE ? null : leaderId },
                {
                  onSuccess: () => {
                    toast.success("Plano de multiplicação salvo");
                    onOpenChange(false);
                  },
                  onError: failed,
                },
              )
            }
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MultiplyDialog({
  cell,
  roster,
  open,
  onOpenChange,
}: {
  cell: Cell;
  roster: RosterEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const multiply = useMultiplyCell(cell.id);
  const navigate = useNavigate();
  const initial = () => ({
    name: "",
    leaderId: cell.multiplication_leader?.id ?? "",
    moving: new Set<string>(),
    day: (cell.meeting_day ?? 1) as MeetingDay,
    time: cell.meeting_time?.slice(0, 5) ?? "",
    address: "",
  });
  const [form, setForm] = useState(initial);

  const people = candidates(roster);
  const toggle = (id: string) =>
    setForm((f) => {
      const moving = new Set(f.moving);
      if (moving.has(id)) moving.delete(id);
      else moving.add(id);
      return { ...f, moving };
    });

  const submit = () =>
    multiply.mutate(
      {
        name: form.name.trim(),
        leader_id: form.leaderId,
        member_ids: [...form.moving].filter((id) => id !== form.leaderId),
        meeting_day: form.day,
        meeting_time: form.time || undefined,
        address: form.address.trim() || undefined,
      },
      {
        onSuccess: (daughter) => {
          toast.success(`${daughter.name} nasceu de ${cell.name}`);
          onOpenChange(false);
          navigate({ to: "/app/celulas/$id", params: { id: daughter.id } });
        },
        onError: (e) => toast.error(apiErrorMessage(e, "Não foi possível multiplicar.")),
      },
    );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) setForm(initial());
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Multiplicar {cell.name}</DialogTitle>
          <DialogDescription>
            Uma nova célula nasce desta, no mesmo campus e temporada. Quem você marcar sai desta
            célula e vai para a nova.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="multiply-name">Nome da nova célula</Label>
            <Input
              id="multiply-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="multiply-leader">Líder da nova célula</Label>
            <Select value={form.leaderId} onValueChange={(v) => setForm({ ...form, leaderId: v })}>
              <SelectTrigger id="multiply-leader">
                <SelectValue placeholder="Escolha quem vai liderar" />
              </SelectTrigger>
              <SelectContent>
                {people.map(({ person, role }) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.name}
                    {role === "trainee" ? " (em treinamento)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="multiply-day">Dia</Label>
              <Select
                value={String(form.day)}
                onValueChange={(v) => setForm({ ...form, day: Number(v) as MeetingDay })}
              >
                <SelectTrigger id="multiply-day">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEETING_DAYS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {MEETING_DAY_LABEL[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="multiply-time">Horário</Label>
              <Input
                id="multiply-time"
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="multiply-address">Endereço (opcional)</Label>
            <Input
              id="multiply-address"
              placeholder={cell.address || "Onde a nova célula vai se reunir"}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Quem vai para a nova célula (
              {[...form.moving].filter((id) => id !== form.leaderId).length})
            </Label>
            <div
              className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2"
              data-testid="multiply-people"
            >
              {people
                .filter(({ person }) => person.id !== form.leaderId)
                .map(({ person, role }) => (
                  <label
                    key={person.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted"
                  >
                    <Checkbox
                      checked={form.moving.has(person.id)}
                      onCheckedChange={() => toggle(person.id)}
                    />
                    <span className="flex-1">{person.name}</span>
                    {role !== "member" && <RoleBadge role={role} />}
                  </label>
                ))}
              {people.length === 0 && (
                <p className="px-1 text-sm text-muted-foreground">Ninguém além dos líderes.</p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!form.name.trim() || !form.leaderId || multiply.isPending}
            onClick={submit}
          >
            {multiply.isPending ? "Multiplicando…" : "Multiplicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
