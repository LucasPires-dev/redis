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
  payment_status: "pending" | "confirmed" | "cancelled" | "refunded";
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
      apiFetch<EventTicketConfig[]>(
        `/api/payments/ticket-configs/?event=${eventId}`,
      ).then((list) => (Array.isArray(list) ? list[0] ?? null : null)),
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

export function useMyRegistration(eventId: string | undefined) {
  return useQuery({
    queryKey: ["my-registration", eventId],
    queryFn: () =>
      apiFetch<{ results: EventRegistration[] }>(
        `/api/payments/registrations/?event=${eventId}`,
      ).then((page) => page.results[0] ?? null),
    enabled: !!eventId,
  });
}

export function useRegisterForEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) =>
      apiFetch<EventRegistration>("/api/payments/registrations/", {
        method: "POST",
        body: JSON.stringify({ event_id: eventId }),
      }),
    onSuccess: (_d, eventId) => {
      qc.invalidateQueries({ queryKey: ["registrations", eventId] });
      qc.invalidateQueries({ queryKey: ["my-registration", eventId] });
      qc.invalidateQueries({ queryKey: ["registration-stats", eventId] });
    },
  });
}

export function useCancelRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (registrationId: string) =>
      apiFetch<EventRegistration>(
        `/api/payments/registrations/${registrationId}/cancel/`,
        { method: "POST" },
      ),
    onSuccess: (data) => {
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
      apiFetch<RegistrationStats>(
        `/api/payments/registrations/stats/?event=${eventId}`,
      ),
    enabled: !!eventId,
  });
}

export const PAYMENT_STATUS_LABEL: Record<EventRegistration["payment_status"], string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};
