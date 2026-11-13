import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { PersonMini } from "./people";

export interface EventTicketConfig {
  id: string;
  price_cents: number;
  max_capacity: number | null;
  registration_deadline: string | null;
  description: string;
  created_at: string;
  updated_at: string;
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
  /** What this registration was charged, frozen at registration time. */
  amount_cents: number;
  payment_url: string;
  paid_at: string | null;
  created_at: string;
}

export interface RegistrationStats {
  total: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  capacity: number | null;
  revenue_cents: number;
}

export interface CreateTicketConfigInput {
  event_id: string;
  price_cents: number;
  max_capacity?: number | null;
  registration_deadline?: string | null;
  description?: string;
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

export function useRegisterForEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, cpf }: { eventId: string; cpf?: string }) =>
      apiFetch<EventRegistration>("/api/payments/registrations/", {
        method: "POST",
        body: JSON.stringify(cpf ? { event_id: eventId, cpf } : { event_id: eventId }),
      }),
    onSuccess: (_d, { eventId, cpf }) => {
      if (cpf) qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["registrations"] });
      qc.invalidateQueries({ queryKey: ["my-registration", eventId] });
      qc.invalidateQueries({ queryKey: ["registration-stats", eventId] });
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
