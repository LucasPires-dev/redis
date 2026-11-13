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
  CELL_AUDIENCE_LABEL,
  CELL_AUDIENCES,
  describeMissingFields,
  MEETING_DAY_LABEL,
  MEETING_DAYS,
  useCreateCell,
  useUpdateCell,
  type Cell,
  type CellAudience,
  type CellInput,
  type CellRequiredField,
  type MeetingDay,
} from "@/lib/api/cells";
import { ApiError, apiErrorMessage } from "@/lib/api/client";
import { useCampuses } from "@/lib/api/ministries";
import { formatDate, todayISO, useSeasons } from "@/lib/api/seasons";

type FieldErrors = Partial<Record<keyof CellInput, string>>;

// Mirrors the backend's Cell.REQUIRED_FIELDS messages.
const REQUIRED_MESSAGE: Record<CellRequiredField, string> = {
  meeting_day: "Defina o dia do encontro.",
  meeting_time: "Defina o horário do encontro.",
  target_audience: "Defina o público-alvo.",
};

function validate(form: CellInput): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.name.trim()) errors.name = "Dê um nome à célula.";
  if (!form.campus_id) errors.campus_id = "Escolha o campus.";
  if (!form.season_id) errors.season_id = "Escolha a temporada.";
  (Object.keys(REQUIRED_MESSAGE) as CellRequiredField[]).forEach((field) => {
    if (!form[field]) errors[field] = REQUIRED_MESSAGE[field];
  });
  return errors;
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

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
  // Errors show after the first submit attempt (plus any the server returns).
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});

  const allowedCampusIds = cellCampusIds(me);
  const campusOptions = (campuses ?? []).filter(
    (c) => allowedCampusIds === null || allowedCampusIds.has(c.id) || c.id === cell?.campus.id,
  );
  // Seasons belong to the campus's church (the API rejects any other one).
  const churchOf = (campusId: string) => campuses?.find((c) => c.id === campusId)?.church?.id;
  const seasonsOf = (campusId: string) => {
    const churchId = churchOf(campusId);
    return (seasons ?? []).filter((s) => !churchId || s.church === churchId);
  };
  // Past seasons are history: new cells go into the current or a future season.
  const today = todayISO();
  const seasonOptions = seasonsOf(form.campus_id).filter(
    (s) => s.end_date >= today || s.id === cell?.season?.id,
  );
  const season = (seasons ?? []).find((s) => s.id === form.season_id);

  // Reset only when the dialog opens (or switches cell) — not when seasons or
  // campuses finish loading, which used to wipe what was already typed.
  useEffect(() => {
    if (!open) return;
    // An older cell missing required fields shows what to fill right away.
    setSubmitted(!!cell && cell.missing_fields.length > 0);
    setServerErrors({});
    setForm(cell ? fromCell(cell) : emptyForm());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cell?.id]);

  // New cell: default to the current season and, for a single allowed campus, to
  // that campus — as soon as they're known, without touching other fields.
  const onlyCampusId = campusOptions.length === 1 ? campusOptions[0].id : "";
  const currentSeasonId =
    seasonsOf(form.campus_id || onlyCampusId).find((s) => s.is_current)?.id ?? "";
  useEffect(() => {
    if (!open || cell) return;
    setForm((f) => ({
      ...f,
      season_id: f.season_id || currentSeasonId,
      campus_id: f.campus_id || onlyCampusId,
    }));
  }, [open, cell, currentSeasonId, onlyCampusId]);

  const set = <K extends keyof CellInput>(key: K, value: CellInput[K]) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      // Another church's campus: its own current season replaces the chosen one.
      if (key === "campus_id" && !seasonsOf(next.campus_id).some((s) => s.id === f.season_id)) {
        next.season_id = seasonsOf(next.campus_id).find((s) => s.is_current)?.id ?? "";
      }
      return next;
    });
    setServerErrors((e) => ({ ...e, [key]: undefined }));
  };

  const saving = createCell.isPending || updateCell.isPending;
  const localErrors = validate(form);
  const errors: FieldErrors = { ...(submitted ? localErrors : {}), ...serverErrors };
  const missingRequired = (Object.keys(REQUIRED_MESSAGE) as CellRequiredField[]).filter(
    (f) => localErrors[f],
  );

  const submit = () => {
    setSubmitted(true);
    if (Object.keys(localErrors).length > 0) return;
    const payload = { ...form, name: form.name.trim() };
    const onError = (e: unknown) => {
      // Field errors from the API go next to their fields.
      if (e instanceof ApiError && e.detail && typeof e.detail === "object") {
        const fieldErrors: FieldErrors = {};
        for (const [key, value] of Object.entries(e.detail as Record<string, unknown>)) {
          const message = Array.isArray(value) ? value[0] : value;
          if (key in form && typeof message === "string") {
            fieldErrors[key as keyof CellInput] = message;
          }
        }
        setServerErrors(fieldErrors);
      }
      toast.error(apiErrorMessage(e, "Não foi possível salvar a célula."));
    };
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
          {cell && cell.missing_fields.length > 0 && (
            <p
              role="alert"
              className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300"
            >
              Esta célula está inativa até definir {describeMissingFields(cell.missing_fields)}.
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="cell-name">Nome</Label>
            <Input
              id="cell-name"
              value={form.name}
              aria-invalid={!!errors.name}
              onChange={(e) => set("name", e.target.value)}
            />
            <FieldError message={errors.name} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Campus</Label>
              <Select
                value={form.campus_id}
                onValueChange={(v) => set("campus_id", v)}
                disabled={!!cell && !cell.can_coordinate}
              >
                <SelectTrigger aria-label="Campus">
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
              <FieldError message={errors.campus_id} />
            </div>
            <div className="space-y-1.5">
              <Label>Temporada</Label>
              <Select
                value={form.season_id}
                onValueChange={(v) => set("season_id", v)}
                disabled={!!cell}
              >
                <SelectTrigger aria-label="Temporada">
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
                  Nenhuma temporada aberta para a igreja deste campus. Peça ao responsável geral
                  para criar uma.
                </p>
              )}
              <FieldError message={errors.season_id} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Dia do encontro *</Label>
              <Select
                // "" keeps the Select controlled and shows the placeholder.
                value={form.meeting_day ? String(form.meeting_day) : ""}
                onValueChange={(v) => set("meeting_day", Number(v) as MeetingDay)}
              >
                <SelectTrigger aria-label="Dia do encontro" aria-invalid={!!errors.meeting_day}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {MEETING_DAYS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {MEETING_DAY_LABEL[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.meeting_day} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cell-time">Horário *</Label>
              <Input
                id="cell-time"
                type="time"
                value={form.meeting_time?.slice(0, 5) ?? ""}
                aria-invalid={!!errors.meeting_time}
                onChange={(e) => set("meeting_time", e.target.value || null)}
              />
              <FieldError message={errors.meeting_time} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Público-alvo *</Label>
            <Select
              value={form.target_audience}
              onValueChange={(v) => set("target_audience", v as CellAudience)}
            >
              <SelectTrigger aria-label="Público-alvo" aria-invalid={!!errors.target_audience}>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {CELL_AUDIENCES.map((k) => (
                  <SelectItem key={k} value={k}>
                    {CELL_AUDIENCE_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.target_audience} />
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

        <DialogFooter className="items-center gap-2">
          {submitted && missingRequired.length > 0 && (
            <p className="mr-auto text-xs text-muted-foreground">
              Falta definir {describeMissingFields(missingRequired)}.
            </p>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Salvando…" : cell ? "Salvar" : "Criar célula"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
