import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiErrorMessage } from "@/lib/api/client";
import { formatDate, useChurches, useSaveSeason, useSeasons, type Season } from "@/lib/api/seasons";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormState {
  seasonId?: string;
  name: string;
  start_date: string;
  end_date: string;
}

// Church-wide seasons. Only the manager / general cells leader opens this.
export function SeasonsDialog({ open, onOpenChange }: Props) {
  const { data: seasons } = useSeasons();
  const { data: churches } = useChurches();
  const saveSeason = useSaveSeason();
  const [form, setForm] = useState<FormState | null>(null);

  const startEdit = (s: Season) =>
    setForm({ seasonId: s.id, name: s.name, start_date: s.start_date, end_date: s.end_date });

  const startNew = () => {
    // Suggest starting the day after the latest season ends.
    const latest = (seasons ?? [])[0];
    let start = "";
    if (latest) {
      const d = new Date(`${latest.end_date}T12:00:00`);
      d.setDate(d.getDate() + 1);
      start = d.toISOString().slice(0, 10);
    }
    setForm({ name: "", start_date: start, end_date: "" });
  };

  const submit = () => {
    if (!form) return;
    const churchId = churches?.[0]?.id;
    if (!churchId) return;
    saveSeason.mutate(
      {
        seasonId: form.seasonId,
        church_id: churchId,
        name: form.name.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
      },
      {
        onSuccess: () => {
          toast.success(form.seasonId ? "Temporada atualizada" : "Temporada criada");
          setForm(null);
        },
        onError: (e) => toast.error(apiErrorMessage(e, "Não foi possível salvar a temporada.")),
      },
    );
  };

  const valid = form && form.name.trim() && form.start_date && form.end_date;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setForm(null);
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Temporadas</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Valem para a igreja toda. A temporada atual é identificada pela data de hoje.
        </p>

        {form ? (
          <div className="space-y-4 rounded-md border p-4">
            <div className="space-y-1.5">
              <Label htmlFor="season-name">Nome</Label>
              <Input
                id="season-name"
                placeholder="Ex.: 2027.1"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="season-start">Início</Label>
                <Input
                  id="season-start"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="season-end">Fim</Label>
                <Input
                  id="season-end"
                  type="date"
                  min={form.start_date || undefined}
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setForm(null)}>
                Cancelar
              </Button>
              <Button onClick={submit} disabled={!valid || saveSeason.isPending}>
                {saveSeason.isPending ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={startNew} className="gap-1 self-start">
            <Plus className="h-4 w-4" /> Nova temporada
          </Button>
        )}

        <div className="space-y-2">
          {(seasons ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma temporada cadastrada.</p>
          )}
          {(seasons ?? []).map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  {s.name}
                  {s.is_current && <Badge variant="secondary">Atual</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(s.start_date)} a {formatDate(s.end_date)}
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => startEdit(s)} aria-label="Editar">
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
