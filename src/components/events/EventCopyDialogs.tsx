// For the organizers: copy an event to another date ("Duplicar") or make it
// recurring ("Repetir"), with the event as the template of every occurrence.
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Copy, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiErrorMessage } from "@/lib/api/client";
import {
  WEEKDAY_LABEL,
  useCreateSeries,
  useDuplicateEvent,
  type Event,
} from "@/lib/api/production";

const pad = (n: number) => String(n).padStart(2, "0");

/** Date → `datetime-local` value in the browser's timezone. */
function toLocalInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toLocalDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const WEEK = 7 * 24 * 60 * 60 * 1000;

export function DuplicateEventDialog({ event }: { event: Event }) {
  const navigate = useNavigate();
  const duplicate = useDuplicateEvent();
  const [open, setOpen] = useState(false);
  const [startsAt, setStartsAt] = useState("");
  const [title, setTitle] = useState("");
  const [copyRoster, setCopyRoster] = useState(true);

  function openDialog(next: boolean) {
    if (next) {
      setStartsAt(toLocalInput(new Date(new Date(event.starts_at).getTime() + WEEK)));
      setTitle(event.title);
      setCopyRoster(true);
    }
    setOpen(next);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!startsAt) return;
    duplicate.mutate(
      {
        eventId: event.id,
        starts_at: new Date(startsAt).toISOString(),
        title: title.trim(),
        copy_roster: copyRoster,
      },
      {
        onSuccess: (copy) => {
          toast.success("Evento duplicado.");
          setOpen(false);
          navigate({ to: "/app/eventos/$id/producao", params: { id: copy.id } });
        },
        onError: (err) => toast.error(apiErrorMessage(err, "Não foi possível duplicar.")),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={openDialog}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Copy className="h-4 w-4" /> Duplicar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicar evento</DialogTitle>
          <DialogDescription>
            A cópia leva a ordem do culto, o checklist e o ingresso, com os horários ajustados para
            a nova data. As inscrições não são copiadas.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="dup-title">Título</Label>
            <Input id="dup-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dup-start">Nova data e hora</Label>
            <Input
              id="dup-start"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </div>
          <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="dup-roster">Convidar a mesma escala</Label>
              <p className="text-xs text-muted-foreground">
                Cada pessoa recebe um novo convite para confirmar.
              </p>
            </div>
            <Switch id="dup-roster" checked={copyRoster} onCheckedChange={setCopyRoster} />
          </div>
          <Button type="submit" className="w-full" disabled={!startsAt || duplicate.isPending}>
            Duplicar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const FREQUENCY = [
  { value: "1", label: "Toda semana" },
  { value: "2", label: "A cada 2 semanas" },
  { value: "3", label: "A cada 3 semanas" },
  { value: "4", label: "A cada 4 semanas" },
];

export function RepeatEventDialog({ event }: { event: Event }) {
  const create = useCreateSeries();
  const [open, setOpen] = useState(false);
  const start = new Date(event.starts_at);
  const [weekday, setWeekday] = useState("0");
  const [time, setTime] = useState("19:00");
  const [duration, setDuration] = useState("120");
  const [every, setEvery] = useState("1");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [copyRoster, setCopyRoster] = useState(false);

  function openDialog(next: boolean) {
    if (next) {
      // JavaScript's getDay() starts on Sunday; the API's weekday on Monday.
      setWeekday(String((start.getDay() + 6) % 7));
      setTime(`${pad(start.getHours())}:${pad(start.getMinutes())}`);
      const minutes = event.ends_at
        ? Math.round((new Date(event.ends_at).getTime() - start.getTime()) / 60000)
        : 120;
      setDuration(String(minutes > 0 ? minutes : 120));
      setEvery("1");
      setStartsOn(toLocalDate(new Date(start.getTime() + 24 * 60 * 60 * 1000)));
      setEndsOn("");
      setCopyRoster(false);
    }
    setOpen(next);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate(
      {
        title: event.title,
        description: event.description,
        event_type: event.event_type,
        campus_id: event.campus?.id ?? null,
        ministry_kind: event.ministry_kind,
        weekday: Number(weekday),
        start_time: time,
        duration_minutes: Number(duration) || 120,
        every_weeks: Number(every),
        starts_on: startsOn,
        ends_on: endsOn || null,
        template_id: event.id,
        copy_roster: copyRoster,
      },
      {
        onSuccess: (series) => {
          toast.success(
            series.upcoming === 1
              ? "Evento recorrente criado: 1 data já está na agenda."
              : `Evento recorrente criado: ${series.upcoming} datas já estão na agenda.`,
          );
          setOpen(false);
        },
        onError: (err) => toast.error(apiErrorMessage(err, "Não foi possível criar a repetição.")),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={openDialog}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Repeat className="h-4 w-4" /> Repetir
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Repetir este evento</DialogTitle>
          <DialogDescription>
            As próximas datas são criadas sozinhas, semanas à frente, como cópias deste evento
            (ordem do culto, checklist e ingresso).
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Dia</Label>
              <Select value={weekday} onValueChange={setWeekday}>
                <SelectTrigger aria-label="Dia da semana">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAY_LABEL.map((label, i) => (
                    <SelectItem key={label} value={String(i)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rep-time">Horário</Label>
              <Input
                id="rep-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Frequência</Label>
              <Select value={every} onValueChange={setEvery}>
                <SelectTrigger aria-label="Frequência">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rep-duration">Duração (min)</Label>
              <Input
                id="rep-duration"
                type="number"
                min={15}
                step={15}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rep-start">A partir de</Label>
              <Input
                id="rep-start"
                type="date"
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rep-end">Até (opcional)</Label>
              <Input
                id="rep-end"
                type="date"
                value={endsOn}
                min={startsOn}
                onChange={(e) => setEndsOn(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="rep-roster">Convidar a mesma escala</Label>
              <p className="text-xs text-muted-foreground">
                Cada data envia novos convites. Deixe desligado se a escala muda toda semana.
              </p>
            </div>
            <Switch id="rep-roster" checked={copyRoster} onCheckedChange={setCopyRoster} />
          </div>
          <Button type="submit" className="w-full" disabled={!startsOn || create.isPending}>
            Criar repetição
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
