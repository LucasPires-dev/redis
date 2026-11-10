import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Calendar, Clapperboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { toast } from "sonner";
import { useAuth, hasAnyLeadership, isEventProducer } from "@/lib/api/auth";
import {
  useEvents,
  useCreateEvent,
  EVENT_TYPE_LABEL,
  PRODUCER_EVENT_TYPES,
  type EventType,
} from "@/lib/api/production";
import { RouteError } from "@/components/RouteError";
import { CardGridSkeleton } from "@/components/skeletons";
import { MINISTRY_LABEL, useCampuses, type MinistryKind } from "@/lib/api/ministries";

export const Route = createFileRoute("/app/eventos")({
  head: () => ({ meta: [{ title: "Eventos — Redis" }] }),
  component: EventsPage,
  errorComponent: RouteError,
});

const EVENT_STATUS_LABEL: Record<string, string> = {
  planning: "Planejamento",
  confirmed: "Confirmado",
  in_progress: "Em andamento",
  closed: "Encerrado",
};

function EventsPage() {
  const { me } = useAuth();
  const { data: events, isLoading } = useEvents();
  const canCreate = !!me && (me.is_manager || hasAnyLeadership(me) || isEventProducer(me));

  const sorted = (events ?? []).slice().sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Eventos</h1>
          <p className="text-sm text-muted-foreground">
            Eventos da sua igreja — cultos, conferências, treinamentos e mais.
          </p>
        </div>
        {canCreate && <CreateEventDialog />}
      </div>

      {isLoading && <CardGridSkeleton />}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sorted.map((e) => (
          <Link key={e.id} to="/app/eventos/$id" params={{ id: e.id }}>
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <Clapperboard className="h-5 w-5" />
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(e.starts_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </Badge>
                </div>
                <h3 className="mt-4 text-lg font-semibold tracking-tight">{e.title}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{EVENT_TYPE_LABEL[e.event_type]}</Badge>
                  <Badge variant="outline">{EVENT_STATUS_LABEL[e.status] ?? e.status}</Badge>
                  {e.campus && <span>{e.campus.name}</span>}
                  {e.ministry_kind && <span>· {MINISTRY_LABEL[e.ministry_kind]}</span>}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {!isLoading && sorted.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum evento visível para seu perfil.</p>
        )}
      </div>
    </div>
  );
}

const AUDIENCE_KINDS: MinistryKind[] = [
  "jovens",
  "criancas",
  "adolescentes",
  "mulheres",
  "homens",
  "casais",
];

function CreateEventDialog() {
  const { me } = useAuth();
  const { data: campuses } = useCampuses();
  const createEvent = useCreateEvent();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<EventType>("culto");
  const [campusId, setCampusId] = useState(me?.campus?.id ?? "");
  const [ministryKind, setMinistryKind] = useState<MinistryKind | "">("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const isProducerType = PRODUCER_EVENT_TYPES.includes(eventType);
  const needsMinistry = eventType === "ministry_event";

  async function handleCreate() {
    if (!title || !startsAt) {
      toast.error("Preencha título e data/hora.");
      return;
    }
    if (needsMinistry && !ministryKind) {
      toast.error("Selecione o ministério.");
      return;
    }
    try {
      await createEvent.mutateAsync({
        title,
        description,
        event_type: eventType,
        campus_id: campusId || null,
        ministry_kind: needsMinistry ? (ministryKind as MinistryKind) : null,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      });
      setOpen(false);
      setTitle("");
      setDescription("");
      setStartsAt("");
      setEndsAt("");
      toast.success("Evento criado");
    } catch {
      toast.error("Não foi possível criar o evento.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" /> Novo evento
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar evento</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EVENT_TYPE_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Início</Label>
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fim (opcional)</Label>
              <Input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Campus</Label>
            <Select value={campusId} onValueChange={setCampusId}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os campi" />
              </SelectTrigger>
              <SelectContent>
                {(campuses ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {needsMinistry && (
            <div className="space-y-1.5">
              <Label>Ministério</Label>
              <Select
                value={ministryKind}
                onValueChange={(v) => setMinistryKind(v as MinistryKind)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {AUDIENCE_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {MINISTRY_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Descrição (opcional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleCreate} disabled={createEvent.isPending}>
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
