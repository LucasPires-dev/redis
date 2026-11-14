import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Ticket } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useAuth, type Me } from "@/lib/api/auth";
import {
  EVENT_TYPE_LABEL,
  PRODUCER_EVENT_TYPES,
  useCreateEvent,
  type EventType,
} from "@/lib/api/production";
import {
  MINISTRY_LABEL,
  useCampuses,
  type CampusMini,
  type MinistryKind,
} from "@/lib/api/ministries";
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

const AUDIENCE_KINDS: MinistryKind[] = [
  "jovens",
  "criancas",
  "adolescentes",
  "mulheres",
  "homens",
  "casais",
];

/** Select value for a church-wide event (Radix Select can't use ""). */
const ALL_CAMPUSES = "all";

/** Ministry kinds the person can create a ministry event for. */
function ministryKindsFor(me: Me): MinistryKind[] {
  if (me.is_manager) return AUDIENCE_KINDS;
  const led = new Set<MinistryKind>([
    ...me.led_ministries.map((m) => m.kind),
    ...me.general_led_kinds,
  ]);
  return AUDIENCE_KINDS.filter((k) => led.has(k));
}

/** Event types the person may create — mirrors the API's can_create_event. */
function creatableEventTypes(me: Me): EventType[] {
  if (me.is_manager) return Object.keys(EVENT_TYPE_LABEL) as EventType[];
  const types: EventType[] = [];
  if (me.led_campuses.length > 0) types.push("culto");
  if (ministryKindsFor(me).length > 0) types.push("ministry_event");
  if (me.is_event_producer) types.push(...PRODUCER_EVENT_TYPES);
  return types;
}

/** Campuses offered for a given type (and ministry); `all` adds the church-wide option. */
function campusOptionsFor(
  me: Me,
  type: EventType,
  kind: MinistryKind | "",
  campuses: CampusMini[],
): { all: boolean; campuses: CampusMini[] } {
  if (me.is_manager) return { all: true, campuses };
  if (PRODUCER_EVENT_TYPES.includes(type)) {
    if (me.producer_campuses === null) return { all: true, campuses };
    const ids = new Set(me.producer_campuses.map((c) => c.id));
    return { all: false, campuses: campuses.filter((c) => ids.has(c.id)) };
  }
  if (type === "culto") {
    const ids = new Set(me.led_campuses.map((c) => c.id));
    return { all: false, campuses: campuses.filter((c) => ids.has(c.id)) };
  }
  // Ministry event: a general leader of the kind works on any campus; a local
  // leader at their own campus.
  if (kind && me.general_led_kinds.includes(kind)) return { all: true, campuses };
  return { all: false, campuses: campuses.filter((c) => c.id === me.campus?.id) };
}

type EventErrors = Partial<
  Record<"title" | "startsAt" | "endsAt" | "ministryKind" | "campus", string>
>;

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

/**
 * "Novo evento": only offers what the person may create — the types, ministries
 * and campuses come from the same rules the API applies.
 */
export function CreateEventDialog() {
  const { me } = useAuth();
  if (!me || creatableEventTypes(me).length === 0) return null;
  return <CreateEventDialogFor me={me} />;
}

function CreateEventDialogFor({ me }: { me: Me }) {
  const { data: campuses } = useCampuses();
  const types = creatableEventTypes(me);
  const createEvent = useCreateEvent();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<EventType>(types[0]);
  const [campusId, setCampusId] = useState(me.campus?.id ?? "");
  const [ministryKind, setMinistryKind] = useState<MinistryKind | "">("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [withRegistration, setWithRegistration] = useState(false);
  const [ticket, setTicket] = useState<TicketDraft>(EMPTY_TICKET);
  const [submitted, setSubmitted] = useState(false);
  const [serverTicketErrors, setServerTicketErrors] = useState<TicketErrors>({});

  const needsMinistry = eventType === "ministry_event";
  const kinds = ministryKindsFor(me);
  const campusOptions = campusOptionsFor(me, eventType, ministryKind, campuses ?? []);
  // Keep the chosen campus only while it's allowed for the current type;
  // otherwise fall back to the person's campus, the first option or "Geral".
  const allowed = (id: string) =>
    (id === ALL_CAMPUSES && campusOptions.all) || campusOptions.campuses.some((c) => c.id === id);
  const campusValue = allowed(campusId)
    ? campusId
    : ([me.campus?.id ?? "", campusOptions.campuses[0]?.id ?? "", ALL_CAMPUSES].find(
        (id) => id && allowed(id),
      ) ?? "");

  // Errors only show after the first submit attempt, then update live.
  const eventErrors: EventErrors = {};
  if (!title.trim()) eventErrors.title = "Informe o título.";
  if (!startsAt) eventErrors.startsAt = "Informe a data e a hora de início.";
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
    eventErrors.endsAt = "O fim precisa ser depois do início.";
  }
  if (needsMinistry && !ministryKind) eventErrors.ministryKind = "Selecione o ministério.";
  if (!campusValue) eventErrors.campus = "Selecione o campus.";
  const ticketErrors: TicketErrors = withRegistration
    ? { ...serverTicketErrors, ...validateTicketDraft(ticket, startsAt) }
    : {};
  const hasErrors =
    Object.keys(eventErrors).length > 0 || Object.values(ticketErrors).some(Boolean);
  const shown = (msg?: string) => (submitted ? msg : undefined);

  function reset() {
    setTitle("");
    setDescription("");
    setEventType(types[0]);
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
        campus_id: campusValue === ALL_CAMPUSES ? null : campusValue,
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
                {types.map((value) => (
                  <SelectItem key={value} value={value}>
                    {EVENT_TYPE_LABEL[value]}
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
            <Select value={campusValue} onValueChange={setCampusId}>
              <SelectTrigger aria-label="Campus" aria-invalid={!!shown(eventErrors.campus)}>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {campusOptions.all && (
                  <SelectItem value={ALL_CAMPUSES}>Geral (todos os campi)</SelectItem>
                )}
                {campusOptions.campuses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={shown(eventErrors.campus)} />
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
                  {kinds.map((k) => (
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
