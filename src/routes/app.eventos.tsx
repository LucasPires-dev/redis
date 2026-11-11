import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Calendar, Clapperboard, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useEvents, useCreateEvent, EVENT_TYPE_LABEL, type EventType } from "@/lib/api/production";
import { RouteError } from "@/components/RouteError";
import { CardGridSkeleton } from "@/components/skeletons";
import { MINISTRY_LABEL, useCampuses, type MinistryKind } from "@/lib/api/ministries";
import { ApiError, apiErrorMessage } from "@/lib/api/client";
import { formatTicketPrice } from "@/lib/api/payments";
import { TicketFields } from "@/components/events/TicketFields";
import {
  EMPTY_TICKET,
  ticketDraftToPayload,
  validateTicketDraft,
  type TicketDraft,
  type TicketErrors,
} from "@/components/events/ticket-draft";

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

  const sorted = (events ?? [])
    .slice()
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

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
                {e.ticket_config && (
                  <div className="mt-3 flex items-center gap-1.5 text-sm font-medium">
                    <Ticket className="h-4 w-4 text-muted-foreground" />
                    {formatTicketPrice(e.ticket_config.price_cents)}
                    {e.ticket_config.max_capacity != null && (
                      <span className="font-normal text-muted-foreground">
                        · {e.ticket_config.max_capacity} vagas
                      </span>
                    )}
                  </div>
                )}
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

type EventErrors = Partial<Record<"title" | "startsAt" | "endsAt" | "ministryKind", string>>;

/** DRF body {"ticket": {"price_cents": ["…"]}} → field errors for TicketFields. */
function ticketErrorsFromApi(error: unknown): TicketErrors {
  if (!(error instanceof ApiError) || !error.detail || typeof error.detail !== "object") return {};
  const ticket = (error.detail as Record<string, unknown>).ticket;
  if (!ticket || typeof ticket !== "object" || Array.isArray(ticket)) return {};
  const first = (v: unknown) => (Array.isArray(v) ? String(v[0]) : undefined);
  const t = ticket as Record<string, unknown>;
  return {
    priceCents: first(t.price_cents),
    maxCapacity: first(t.max_capacity),
    deadline: first(t.registration_deadline),
  };
}

function CreateEventDialog() {
  const { me } = useAuth();
  const { data: campuses } = useCampuses();
  const createEvent = useCreateEvent();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<EventType>("culto");
  const [campusId, setCampusId] = useState(me?.campus?.id ?? "");
  const [ministryKind, setMinistryKind] = useState<MinistryKind | "">("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [withRegistration, setWithRegistration] = useState(false);
  const [ticket, setTicket] = useState<TicketDraft>(EMPTY_TICKET);
  const [submitted, setSubmitted] = useState(false);
  const [serverTicketErrors, setServerTicketErrors] = useState<TicketErrors>({});

  const needsMinistry = eventType === "ministry_event";

  // Errors only show after the first submit attempt, then update live.
  const eventErrors: EventErrors = {};
  if (!title.trim()) eventErrors.title = "Informe o título.";
  if (!startsAt) eventErrors.startsAt = "Informe a data e a hora de início.";
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
    eventErrors.endsAt = "O fim precisa ser depois do início.";
  }
  if (needsMinistry && !ministryKind) eventErrors.ministryKind = "Selecione o ministério.";
  const ticketErrors: TicketErrors = withRegistration
    ? { ...serverTicketErrors, ...validateTicketDraft(ticket, startsAt) }
    : {};
  const hasErrors =
    Object.keys(eventErrors).length > 0 || Object.values(ticketErrors).some(Boolean);
  const shown = (msg?: string) => (submitted ? msg : undefined);

  function reset() {
    setTitle("");
    setDescription("");
    setEventType("culto");
    setMinistryKind("");
    setStartsAt("");
    setEndsAt("");
    setWithRegistration(false);
    setTicket(EMPTY_TICKET);
    setSubmitted(false);
    setServerTicketErrors({});
  }

  async function handleCreate() {
    setSubmitted(true);
    if (hasErrors) return;
    const ticketPayload = withRegistration ? ticketDraftToPayload(ticket) : null;
    try {
      const event = await createEvent.mutateAsync({
        title: title.trim(),
        description,
        event_type: eventType,
        campus_id: campusId || null,
        ministry_kind: needsMinistry ? (ministryKind as MinistryKind) : null,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        ticket: ticketPayload,
      });
      setOpen(false);
      reset();
      toast.success(
        ticketPayload
          ? `Evento criado com inscrições abertas (${formatTicketPrice(ticketPayload.price_cents)}).`
          : "Evento criado.",
        {
          action: {
            label: "Abrir",
            onClick: () => navigate({ to: "/app/eventos/$id", params: { id: event.id } }),
          },
        },
      );
    } catch (e) {
      setServerTicketErrors(ticketErrorsFromApi(e));
      toast.error(apiErrorMessage(e, "Não foi possível criar o evento."));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" /> Novo evento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar evento</DialogTitle>
          <DialogDescription>
            Defina os dados do evento e, se quiser, já abra as inscrições.
          </DialogDescription>
        </DialogHeader>
        <form
          id="create-event-form"
          className="space-y-3"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="event-title">Título</Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-invalid={!!shown(eventErrors.title)}
            />
            <FieldError message={shown(eventErrors.title)} />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
              <SelectTrigger aria-label="Tipo">
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
              <Label htmlFor="event-starts">Início</Label>
              <Input
                id="event-starts"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                aria-invalid={!!shown(eventErrors.startsAt)}
              />
              <FieldError message={shown(eventErrors.startsAt)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="event-ends">Fim (opcional)</Label>
              <Input
                id="event-ends"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                aria-invalid={!!shown(eventErrors.endsAt)}
              />
              <FieldError message={shown(eventErrors.endsAt)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Campus</Label>
            <Select value={campusId} onValueChange={setCampusId}>
              <SelectTrigger aria-label="Campus">
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
                <SelectTrigger aria-label="Ministério">
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
              <FieldError message={shown(eventErrors.ministryKind)} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="event-description">Descrição (opcional)</Label>
            <Textarea
              id="event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="rounded-lg border">
            <div className="flex items-start justify-between gap-4 p-4">
              <div className="flex items-start gap-3">
                <Ticket className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="event-registration" className="cursor-pointer">
                    Abrir inscrições
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Gratuitas ou pagas, com limite de vagas e prazo.
                  </p>
                </div>
              </div>
              <Switch
                id="event-registration"
                checked={withRegistration}
                onCheckedChange={setWithRegistration}
              />
            </div>
            {withRegistration && (
              <div className="border-t p-4">
                <TicketFields
                  idPrefix="new-event-ticket"
                  value={ticket}
                  onChange={(next) => {
                    setTicket(next);
                    setServerTicketErrors({});
                  }}
                  errors={submitted ? ticketErrors : {}}
                />
              </div>
            )}
          </div>
        </form>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} type="button">
            Cancelar
          </Button>
          <Button type="submit" form="create-event-form" disabled={createEvent.isPending}>
            {createEvent.isPending ? "Criando…" : "Criar evento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}
