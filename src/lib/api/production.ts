import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiList } from "./client";
import type { CampusMini, MinistryKind } from "./ministries";
import type { PersonMini } from "./people";

export type EventType = "culto" | "ministry_event" | "training" | "conference" | "special_service";
export type EventStatus = "planning" | "confirmed" | "in_progress" | "closed";

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  culto: "Culto",
  ministry_event: "Evento de Ministério",
  training: "Treinamento",
  conference: "Conferência",
  special_service: "Culto Especial",
};

export const PRODUCER_EVENT_TYPES: EventType[] = ["conference", "special_service", "training"];
export type ItemStatusValue = "ok" | "attention" | "problem";
export type DemandType =
  "slide" | "technical_adjustment" | "repertoire_change" | "stage_setup" | "material" | "other";
export type DemandPriority = "urgent" | "normal" | "planning";
export type DemandStatus = "open" | "in_progress" | "done" | "rejected";
export type RosterStatus = "invited" | "confirmed" | "declined";

export interface RundownItemStatus {
  ministry_kind: MinistryKind;
  status: ItemStatusValue;
  updated_at: string;
}

export interface RundownItem {
  id: string;
  order: number;
  title: string;
  scheduled_time: string | null;
  duration_minutes: number | null;
  ministry_kind: MinistryKind;
  notes: string;
  statuses: RundownItemStatus[];
}

export interface Event {
  id: string;
  title: string;
  description: string;
  event_type: EventType;
  campus: CampusMini | null;
  ministry_kind: MinistryKind | null;
  starts_at: string;
  ends_at: string | null;
  status: EventStatus;
  producer: PersonMini | null;
  rundown_items: RundownItem[];
  created_at: string;
}

export interface Demand {
  id: string;
  event: Pick<
    Event,
    "id" | "title" | "event_type" | "campus" | "ministry_kind" | "starts_at" | "status"
  > | null;
  from_ministry_kind: MinistryKind | null;
  from_campus: CampusMini | null;
  to_ministry_kind: MinistryKind;
  to_campus: CampusMini | null;
  demand_type: DemandType;
  priority: DemandPriority;
  description: string;
  due_date: string | null;
  status: DemandStatus;
  rejection_reason: string;
  created_by: PersonMini | null;
  created_at: string;
  updated_at: string;
}

export interface RosterEntry {
  id: string;
  ministry: { id: string; name: string; kind: MinistryKind };
  person: PersonMini;
  function: string;
  status: RosterStatus;
  responded_at: string | null;
  created_at: string;
}

export interface ChecklistItem {
  id: string;
  ministry_kind: MinistryKind;
  text: string;
  is_done: boolean;
  done_by: PersonMini | null;
  done_at: string | null;
  created_at: string;
}

export function useEvents(campusId?: string) {
  return useQuery({
    queryKey: ["production-events", { campus: campusId }],
    queryFn: () =>
      apiList<Event>(`/api/production-events/${campusId ? `?campus=${campusId}` : ""}`),
  });
}

export function useEvent(id: string | undefined, options: { poll?: boolean } = {}) {
  return useQuery({
    queryKey: ["production-events", id],
    queryFn: () => apiFetch<Event>(`/api/production-events/${id}/`),
    enabled: !!id,
    // Rede de segurança — o caminho primário de atualização agora é o WebSocket
    // (useEventRealtime); esse polling só cobre uma conexão WS que caiu e ainda
    // não reconectou.
    refetchInterval: options.poll ? 60_000 : undefined,
  });
}

export interface CreateEventInput {
  title: string;
  description?: string;
  event_type: EventType;
  campus_id?: string | null;
  ministry_kind?: MinistryKind | null;
  starts_at: string;
  ends_at?: string | null;
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEventInput) =>
      apiFetch<Event>("/api/production-events/", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["production-events"] }),
  });
}

export interface CreateRundownItemInput {
  event_id: string;
  order: number;
  title: string;
  scheduled_time?: string | null;
  duration_minutes?: number | null;
  ministry_kind: MinistryKind;
  notes?: string;
}

export function useCreateRundownItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRundownItemInput) =>
      apiFetch<RundownItem>("/api/production-rundown-items/", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["production-events", variables.event_id] });
    },
  });
}

export function useSetRundownItemStatus(eventId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      ministryKind,
      status,
    }: {
      itemId: string;
      ministryKind: MinistryKind;
      status: ItemStatusValue;
    }) =>
      apiFetch<RundownItem>(`/api/production-rundown-items/${itemId}/set-status/`, {
        method: "POST",
        body: JSON.stringify({ ministry_kind: ministryKind, status }),
      }),
    onSuccess: () => {
      if (eventId) queryClient.invalidateQueries({ queryKey: ["production-events", eventId] });
    },
  });
}

export function useDemands(direction?: "sent" | "received") {
  return useQuery({
    queryKey: ["production-demands", { direction }],
    queryFn: () =>
      apiList<Demand>(`/api/production-demands/${direction ? `?direction=${direction}` : ""}`),
  });
}

export interface CreateDemandInput {
  event_id?: string | null;
  from_ministry_kind?: MinistryKind | null;
  from_campus_id?: string | null;
  to_ministry_kind: MinistryKind;
  to_campus_id?: string | null;
  demand_type: DemandType;
  priority: DemandPriority;
  description?: string;
  due_date?: string | null;
}

export function useEventDemands(eventId: string | undefined) {
  return useQuery({
    queryKey: ["production-demands", { event: eventId }],
    queryFn: () =>
      apiList<Demand>(`/api/production-demands/?event=${eventId}`),
    enabled: !!eventId,
  });
}

export function useCreateDemand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDemandInput) =>
      apiFetch<Demand>("/api/production-demands/", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["production-demands"] }),
  });
}

function useDemandAction(action: "accept" | "complete") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Demand>(`/api/production-demands/${id}/${action}/`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["production-demands"] }),
  });
}

export function useAcceptDemand() {
  return useDemandAction("accept");
}

export function useCompleteDemand() {
  return useDemandAction("complete");
}

export function useRejectDemand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiFetch<Demand>(`/api/production-demands/${id}/reject/`, {
        method: "POST",
        body: JSON.stringify({ rejection_reason: reason ?? "" }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["production-demands"] }),
  });
}

export function useRosterEntries(eventId: string | undefined) {
  return useQuery({
    queryKey: ["production-roster-entries", eventId],
    queryFn: () => apiList<RosterEntry>(`/api/production-roster-entries/?event=${eventId}`),
    enabled: !!eventId,
  });
}

export interface InviteToRosterInput {
  event_id: string;
  ministry_id: string;
  person_id: string;
  function?: string;
}

export function useInviteToRoster() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InviteToRosterInput) =>
      apiFetch<RosterEntry>("/api/production-roster-entries/", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["production-roster-entries", variables.event_id],
      });
    },
  });
}

function useRosterResponse(action: "confirm" | "decline", eventId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entryId: string) =>
      apiFetch<RosterEntry>(`/api/production-roster-entries/${entryId}/${action}/`, {
        method: "POST",
      }),
    onSuccess: () => {
      if (eventId)
        queryClient.invalidateQueries({ queryKey: ["production-roster-entries", eventId] });
    },
  });
}

export function useConfirmRosterEntry(eventId: string | undefined) {
  return useRosterResponse("confirm", eventId);
}

export function useDeclineRosterEntry(eventId: string | undefined) {
  return useRosterResponse("decline", eventId);
}

export function useChecklistItems(eventId: string | undefined) {
  return useQuery({
    queryKey: ["production-checklist-items", eventId],
    queryFn: () => apiList<ChecklistItem>(`/api/production-checklist-items/?event=${eventId}`),
    enabled: !!eventId,
  });
}

export interface CreateChecklistItemInput {
  event_id: string;
  ministry_kind: MinistryKind;
  text: string;
}

export function useCreateChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateChecklistItemInput) =>
      apiFetch<ChecklistItem>("/api/production-checklist-items/", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["production-checklist-items", variables.event_id],
      });
    },
  });
}

export function useToggleChecklistItem(eventId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      apiFetch<ChecklistItem>(`/api/production-checklist-items/${itemId}/toggle/`, {
        method: "POST",
      }),
    onSuccess: () => {
      if (eventId)
        queryClient.invalidateQueries({ queryKey: ["production-checklist-items", eventId] });
    },
  });
}
