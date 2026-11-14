import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { PersonMini } from "./people";

export interface TicketType {
  id: string;
  name: string;
  price_cents: number;
  /** Its own limit of places (null: only the event's). */
  capacity: number | null;
  sales_start: string | null;
  sales_end: string | null;
  order: number;
  on_sale: boolean;
  /** Places taken with this ticket. */
  sold: number;
  sold_out: boolean;
}

export interface EventTicketConfig {
  id: string;
  /** The single ticket's price, when there are no types. */
  price_cents: number;
  max_capacity: number | null;
  registration_deadline: string | null;
  description: string;
  /** Companions (each with their own ticket) one person may bring. */
  max_companions: number;
  /** Open to anyone with the link /evento/:id. */
  is_public: boolean;
  types: TicketType[];
  /** Places still open for the viewer (null: no limit). */
  free_seats: number | null;
  created_at: string;
  updated_at: string;
}

export interface RegistrationGuest {
  id: string;
  name: string;
  ticket_code: string;
  checked_in_at: string | null;
}

export interface EventRegistration {
  id: string;
  person: PersonMini;
  event: {
    id: string;
    title: string;
    event_type: string;
    starts_at: string;
    status: string;
    campus_name: string | null;
  };
  payment_status: "pending" | "confirmed" | "cancelled" | "refunded";
  ticket_type: { id: string; name: string } | null;
  /** The person plus companions. */
  seats: number;
  guests: RegistrationGuest[];
  /** What this registration was charged, frozen at registration time. */
  amount_cents: number;
  payment_url: string;
  paid_at: string | null;
  /** What the person shows at the door (QR code or typed). */
  ticket_code: string;
  checked_in_at: string | null;
  created_at: string;
}

export interface RegistrationStats {
  total: number;
  confirmed: number;
  checked_in: number;
  pending: number;
  cancelled: number;
  capacity: number | null;
  /** Places taken (people + companions) by active registrations. */
  seats: number;
  /** People waiting in line. */
  waitlist: number;
  revenue_cents: number;
}

export interface CreateTicketConfigInput {
  event_id: string;
  price_cents: number;
  max_capacity?: number | null;
  registration_deadline?: string | null;
  description?: string;
  max_companions?: number;
  is_public?: boolean;
}

export function useTicketConfig(eventId: string | undefined) {
  return useQuery({
    queryKey: ["ticket-config", eventId],
    queryFn: () =>
      // The list is paginated ({count, results}); an event has at most one config.
      apiFetch<{ results: EventTicketConfig[] } | EventTicketConfig[]>(
        `/api/payments/ticket-configs/?event=${eventId}`,
      ).then((page) => (Array.isArray(page) ? page : (page.results ?? []))[0] ?? null),
    enabled: !!eventId,
  });
}

export function useCreateTicketConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTicketConfigInput) =>
      apiFetch<EventTicketConfig>("/api/payments/ticket-configs/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["ticket-config", vars.event_id] });
    },
  });
}

export function useUpdateTicketConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<CreateTicketConfigInput> & { id: string }) =>
      apiFetch<EventTicketConfig>(`/api/payments/ticket-configs/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket-config"] });
    },
  });
}

export function useRegistrations(eventId: string | undefined) {
  return useQuery({
    queryKey: ["registrations", eventId],
    queryFn: () =>
      apiFetch<{ results: EventRegistration[] }>(
        `/api/payments/registrations/?event=${eventId}`,
      ).then((page) => page.results),
    enabled: !!eventId,
  });
}

/**
 * The caller's current (pending or confirmed) registration, or null.
 * `mine=1` keeps event managers from getting someone else's; cancelled and
 * refunded ones are history, so the person can register again.
 */
export function useMyRegistration(eventId: string | undefined) {
  return useQuery({
    queryKey: ["my-registration", eventId],
    queryFn: () =>
      apiFetch<{ results: EventRegistration[] }>(
        `/api/payments/registrations/?event=${eventId}&mine=1`,
      ).then(
        (page) =>
          page.results.find(
            (r) => r.payment_status === "pending" || r.payment_status === "confirmed",
          ) ?? null,
      ),
    enabled: !!eventId,
  });
}

/** Every registration of the caller, across events ("Minhas inscrições"). */
export function useMyRegistrations() {
  return useQuery({
    queryKey: ["registrations", "mine"],
    queryFn: () =>
      apiFetch<{ results: EventRegistration[] }>("/api/payments/registrations/").then(
        (page) => page.results,
      ),
  });
}

export interface RegisterInput {
  eventId: string;
  cpf?: string;
  ticketTypeId?: string;
  guestNames?: string[];
}

export function useRegisterForEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, cpf, ticketTypeId, guestNames }: RegisterInput) =>
      apiFetch<EventRegistration>("/api/payments/registrations/", {
        method: "POST",
        body: JSON.stringify({
          event_id: eventId,
          ...(cpf ? { cpf } : {}),
          ...(ticketTypeId ? { ticket_type_id: ticketTypeId } : {}),
          ...(guestNames?.length ? { guest_names: guestNames } : {}),
        }),
      }),
    onSuccess: (_d, { eventId, cpf }) => {
      if (cpf) qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["registrations"] });
      qc.invalidateQueries({ queryKey: ["my-registration", eventId] });
      qc.invalidateQueries({ queryKey: ["registration-stats", eventId] });
      qc.invalidateQueries({ queryKey: ["ticket-config", eventId] });
      qc.invalidateQueries({ queryKey: ["my-waitlist", eventId] });
    },
  });
}

export function useCancelRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (registrationId: string) =>
      apiFetch<EventRegistration>(`/api/payments/registrations/${registrationId}/cancel/`, {
        method: "POST",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["registrations"] });
      qc.invalidateQueries({ queryKey: ["my-registration"] });
      qc.invalidateQueries({ queryKey: ["registration-stats"] });
      qc.invalidateQueries({ queryKey: ["ticket-config"] });
    },
  });
}

export function useRegistrationStats(eventId: string | undefined) {
  return useQuery({
    queryKey: ["registration-stats", eventId],
    queryFn: () =>
      apiFetch<RegistrationStats>(`/api/payments/registrations/stats/?event=${eventId}`),
    enabled: !!eventId,
  });
}

export const PAYMENT_STATUS_LABEL: Record<EventRegistration["payment_status"], string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

/** A paid registration can't be self-cancelled (it needs a refund). */
export function canSelfCancel(reg: EventRegistration): boolean {
  return (
    reg.payment_status === "pending" ||
    (reg.payment_status === "confirmed" && reg.amount_cents === 0)
  );
}

/** Asaas refuses charges under R$ 5,00 (mirrors the backend rule). */
export const MIN_PAID_PRICE_CENTS = 500;

/** 15000 → "R$ 150,00". */
export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Like formatBRL, but a 0 price reads "Gratuito". */
export function formatTicketPrice(cents: number): string {
  return cents ? formatBRL(cents) : "Gratuito";
}

// ── Check-in at the door ─────────────────────────────────────────────────────

export interface DoorRow {
  id: string;
  person: PersonMini;
  /** A companion: the name of who brought them. */
  guest_of: string | null;
  payment_status: EventRegistration["payment_status"];
  checked_in_at: string | null;
}

export interface DoorList {
  confirmed: number;
  checked_in: number;
  registrations: DoorRow[];
}

export interface CheckinResult {
  registration: DoorRow;
  already_checked_in: boolean;
}

export type CheckinTarget = { code: string } | { registration_id: string };

/** "ABCDE-FGHJK": a ticket code split in two, easier to read out. */
export function formatTicketCode(code: string) {
  return code.length > 5 ? `${code.slice(0, 5)}-${code.slice(5)}` : code;
}

export function useDoorList(eventId: string) {
  return useQuery({
    queryKey: ["door-list", eventId],
    queryFn: () => apiFetch<DoorList>(`/api/payments/registrations/door-list/?event=${eventId}`),
    // Other devices at the door check people in too (also pushed live).
    refetchInterval: 30_000,
  });
}

function useDoorAction(eventId: string, path: "checkin" | "undo-checkin") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (target: CheckinTarget) =>
      apiFetch<CheckinResult>(`/api/payments/registrations/${path}/`, {
        method: "POST",
        body: JSON.stringify({ event_id: eventId, ...target }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["door-list", eventId] });
      qc.invalidateQueries({ queryKey: ["registration-stats", eventId] });
    },
  });
}

export function useCheckin(eventId: string) {
  return useDoorAction(eventId, "checkin");
}

export function useUndoCheckin(eventId: string) {
  return useDoorAction(eventId, "undo-checkin");
}

// ── Ticket types and batches ─────────────────────────────────────────────────

export interface TicketTypeInput {
  name: string;
  price_cents: number;
  capacity: number | null;
  sales_start: string | null;
  sales_end: string | null;
}

function useTicketTypeMutation<V>(fn: (vars: V) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ticket-config"] }),
  });
}

export function useSaveTicketType() {
  return useTicketTypeMutation(
    ({ id, configId, ...data }: TicketTypeInput & { id?: string; configId: string }) =>
      apiFetch<TicketType>(`/api/payments/ticket-types/${id ? `${id}/` : ""}`, {
        method: id ? "PATCH" : "POST",
        body: JSON.stringify({ config_id: configId, ...data }),
      }),
  );
}

export function useDeleteTicketType() {
  return useTicketTypeMutation((id: string) =>
    apiFetch<void>(`/api/payments/ticket-types/${id}/`, { method: "DELETE" }),
  );
}

// ── Waitlist ─────────────────────────────────────────────────────────────────

export interface WaitlistEntry {
  id: string;
  event: EventRegistration["event"];
  seats: number;
  /** Places held for the person until then (null: still waiting). */
  offer_expires_at: string | null;
  position: number;
  created_at: string;
}

/** The caller's place in the event's waitlist, or null. */
export function useMyWaitlist(eventId: string | undefined) {
  return useQuery({
    queryKey: ["my-waitlist", eventId],
    queryFn: () =>
      apiFetch<{ results: WaitlistEntry[] }>(`/api/payments/waitlist/?event=${eventId}`).then(
        (page) => page.results[0] ?? null,
      ),
    enabled: !!eventId,
  });
}

function useWaitlistMutation<V>(fn: (vars: V) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-waitlist"] });
      qc.invalidateQueries({ queryKey: ["ticket-config"] });
      qc.invalidateQueries({ queryKey: ["registration-stats"] });
    },
  });
}

export function useJoinWaitlist() {
  return useWaitlistMutation(({ eventId, companions }: { eventId: string; companions: number }) =>
    apiFetch<WaitlistEntry>("/api/payments/waitlist/", {
      method: "POST",
      body: JSON.stringify({ event_id: eventId, companions }),
    }),
  );
}

export function useLeaveWaitlist() {
  return useWaitlistMutation((entryId: string) =>
    apiFetch<void>(`/api/payments/waitlist/${entryId}/`, { method: "DELETE" }),
  );
}

// ── Public link ──────────────────────────────────────────────────────────────

export interface PublicEvent {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string | null;
  campus: { name: string; city: string } | null;
  ticket: {
    description: string;
    price_cents: number;
    registration_deadline: string | null;
    max_companions: number;
    types: {
      id: string;
      name: string;
      price_cents: number;
      sales_end: string | null;
      sold_out: boolean;
    }[];
  };
  sold_out: boolean;
  registration_open: boolean;
}

export function publicEventPath(eventId: string) {
  return `/evento/${eventId}`;
}

export function usePublicEvent(eventId: string) {
  return useQuery({
    queryKey: ["public-event", eventId],
    queryFn: () => apiFetch<PublicEvent>(`/api/payments/public-events/${eventId}/`),
    retry: false,
  });
}
