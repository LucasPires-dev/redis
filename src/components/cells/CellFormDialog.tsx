import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { cellCampusIds, useMe } from "@/lib/api/auth";
import {
  MEETING_DAY_LABEL,
  MEETING_DAYS,
  useCreateCell,
  useUpdateCell,
  type Cell,
  type CellInput,
  type MeetingDay,
} from "@/lib/api/cells";
import { apiErrorMessage } from "@/lib/api/client";
import {
  MINISTRY_LABEL,
  PRODUCTION_MINISTRY_KINDS,
  useCampuses,
  type MinistryKind,
} from "@/lib/api/ministries";
import { formatDate, todayISO, useSeasons } from "@/lib/api/seasons";

// Radix Select can't hold an empty string, so "none" stands for "not set".
const NONE = "none";

const AUDIENCES = (Object.keys(MINISTRY_LABEL) as MinistryKind[]).filter(
  (k) => !PRODUCTION_MINISTRY_KINDS.includes(k) && k !== "reconciliacao",
);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Edit this cell; omitted to create a new one.
  cell?: Cell;
}

function emptyForm(): CellInput {
  return {
    campus_id: "",
    season_id: "",
    name: "",
    meeting_day: null,
    meeting_time: null,
    target_audience: "",
    address: "",
    description: "",
    start_date: null,
    end_date: null,
  };
}

function fromCell(cell: Cell): CellInput {
  return {
    campus_id: cell.campus.id,
    season_id: cell.season?.id ?? "",
    name: cell.name,
    meeting_day: cell.meeting_day,
    meeting_time: cell.meeting_time,
    target_audience: cell.target_audience,
    address: cell.address,
    description: cell.description,
    start_date: cell.start_date,
    end_date: cell.end_date,
  };
}

export function CellFormDialog({ open, onOpenChange, cell }: Props) {
  const { data: me } = useMe();
  const { data: campuses } = useCampuses();
  const { data: seasons } = useSeasons();
  const createCell = useCreateCell();
  const updateCell = useUpdateCell(cell?.id ?? "");
  const navigate = useNavigate();
  const [form, setForm] = useState<CellInput>(emptyForm);

  const allowedCampusIds = cellCampusIds(me);
  const campusOptions = (campuses ?? []).filter(
    (c) => allowedCampusIds === null || allowedCampusIds.has(c.id) || c.id === cell?.campus.id,
  );
  // Past seasons are history: new cells go into the current or a future season.
  const today = todayISO();
  const seasonOptions = (seasons ?? []).filter(
    (s) => s.end_date >= today || s.id === cell?.season?.id,
  );
  const season = (seasons ?? []).find((s) => s.id === form.season_id);

  // Reset whenever the dialog opens, defaulting to the current season and, for a
  // single allowed campus, to that campus.
  useEffect(() => {
    if (!open) return;
    if (cell) {
      setForm(fromCell(cell));
      return;
    }
    const base = emptyForm();
    base.season_id = (seasons ?? []).find((s) => s.is_current)?.id ?? "";
    if (campusOptions.length === 1) base.campus_id = campusOptions[0].id;
    setForm(base);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cell?.id, seasons, campuses]);

  const set = <K extends keyof CellInput>(key: K, value: CellInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const saving = createCell.isPending || updateCell.isPending;
  const valid = form.name.trim() && form.campus_id && form.season_id;

  const submit = () => {
    const payload = { ...form, name: form.name.trim() };
    const onError = (e: unknown) =>
      toast.error(apiErrorMessage(e, "Não foi possível salvar a célula."));
    if (cell) {
      updateCell.mutate(payload, {
        onSuccess: () => {
          toast.success("Célula atualizada");
          onOpenChange(false);
        },
        onError,
      });
    } else {
      createCell.mutate(payload, {
        onSuccess: (created) => {
          toast.success("Célula criada");
          onOpenChange(false);
          navigate({ to: "/app/celulas/$id", params: { id: created.id } });
        },
        onError,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{cell ? "Editar célula" : "Nova célula"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cell-name">Nome</Label>
            <Input id="cell-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Campus</Label>
              <Select
                value={form.campus_id}
                onValueChange={(v) => set("campus_id", v)}
                disabled={!!cell && !cell.can_coordinate}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {campusOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Temporada</Label>
              <Select
                value={form.season_id}
                onValueChange={(v) => set("season_id", v)}
                disabled={!!cell}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {seasonOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                      {s.is_current ? " (atual)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {seasonOptions.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhuma temporada aberta. Peça ao responsável geral para criar uma.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Dia do encontro</Label>
              <Select
                value={form.meeting_day ? String(form.meeting_day) : NONE}
                onValueChange={(v) =>
                  set("meeting_day", v === NONE ? null : (Number(v) as MeetingDay))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Não definido</SelectItem>
                  {MEETING_DAYS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {MEETING_DAY_LABEL[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cell-time">Horário</Label>
              <Input
                id="cell-time"
                type="time"
                value={form.meeting_time?.slice(0, 5) ?? ""}
                onChange={(e) => set("meeting_time", e.target.value || null)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Público-alvo</Label>
            <Select
              value={form.target_audience || NONE}
              onValueChange={(v) => set("target_audience", v === NONE ? "" : (v as MinistryKind))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Todos</SelectItem>
                {AUDIENCES.map((k) => (
                  <SelectItem key={k} value={k}>
                    {MINISTRY_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Período (opcional)</Label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="date"
                aria-label="Início"
                value={form.start_date ?? ""}
                min={season?.start_date}
                max={season?.end_date}
                onChange={(e) => set("start_date", e.target.value || null)}
              />
              <Input
                type="date"
                aria-label="Fim"
                value={form.end_date ?? ""}
                min={form.start_date ?? season?.start_date}
                max={season?.end_date}
                onChange={(e) => set("end_date", e.target.value || null)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {season
                ? `Em branco, vale o período da temporada: ${formatDate(season.start_date)} a ${formatDate(season.end_date)}.`
                : "Em branco, vale o período da temporada."}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cell-address">Endereço</Label>
            <Input
              id="cell-address"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cell-description">Descrição</Label>
            <Textarea
              id="cell-description"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!valid || saving}>
            {saving ? "Salvando…" : cell ? "Salvar" : "Criar célula"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
