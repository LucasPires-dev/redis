import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiList } from "./client";
import type { MeetingDay } from "./cells";
import type { CampusMini, MinistryKind } from "./ministries";
import type { PersonMini } from "./people";

// Picker options for the "adicionar a um GT/Ministério" actions — a rank-and-file
// reconciliador (no leadership at all) has no read access to /api/cells/ or
// /api/ministries/ under their normal scoping, so these dedicated endpoints exist
// to list exactly what's assignable at the convert's own campus.
export interface AvailableCell {
  id: string;
  name: string;
  meeting_day: MeetingDay | null;
  meeting_time: string | null;
}

export interface AvailableMinistry {
  id: string;
  name: string;
  kind: MinistryKind;
}

export interface ReconciliationLead {
  id: string;
  name: string;
  phone: string;
  email: string;
  raw_campus_label: string;
  campus: CampusMini | null;
  submitted_at: string | null;
  status: "pending" | "assigned" | "discarded";
  created_at: string;
}

export interface Reconciliation {
  id: string;
  convert: PersonMini;
  reconciliador: PersonMini;
  campus: CampusMini;
  assigned_by: PersonMini | null;
  assigned_at: string;
  jornada_completed: boolean;
  jornada_completed_at: string | null;
  baptized: boolean;
  baptized_at: string | null;
  in_cell: boolean;
  serving: boolean;
  source_lead: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReconciliationBucket {
  total: number;
  baptized: number;
  in_cell: number;
  serving: number;
  jornada_completed: number;
}

export interface ReconciliationDashboard {
  overall: ReconciliationBucket;
  by_reconciliador: (ReconciliationBucket & { reconciliador: PersonMini })[];
  by_campus: (ReconciliationBucket & { campus: CampusMini })[];
}

export function useReconciliationLeads(status: string = "pending") {
  return useQuery({
    queryKey: ["reconciliation-leads", status],
    queryFn: () => apiList<ReconciliationLead>(`/api/reconciliation-leads/?status=${status}`),
  });
}

export function useTriageLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, campusId }: { id: string; campusId: string }) =>
      apiFetch<ReconciliationLead>(`/api/reconciliation-leads/${id}/triage/`, {
        method: "POST",
        body: JSON.stringify({ campus_id: campusId }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reconciliation-leads"] }),
  });
}

export function useDiscardLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<ReconciliationLead>(`/api/reconciliation-leads/${id}/discard/`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reconciliation-leads"] }),
  });
}

export function useAssignLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      reconciliadorId,
      campusId,
    }: {
      id: string;
      reconciliadorId: string;
      campusId?: string;
    }) =>
      apiFetch<Reconciliation>(`/api/reconciliation-leads/${id}/assign/`, {
        method: "POST",
        body: JSON.stringify({ reconciliador_id: reconciliadorId, campus_id: campusId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reconciliation-leads"] });
      queryClient.invalidateQueries({ queryKey: ["reconciliations"] });
    },
  });
}

export function useReconciliations(campusId?: string) {
  return useQuery({
    queryKey: ["reconciliations", { campus: campusId }],
    queryFn: () =>
      apiList<Reconciliation>(`/api/reconciliations/${campusId ? `?campus=${campusId}` : ""}`),
  });
}

export function useReconciliationByConvert(personId: string | undefined) {
  return useQuery({
    queryKey: ["reconciliations", { convert: personId }],
    queryFn: async () => {
      const results = await apiList<Reconciliation>(`/api/reconciliations/?convert=${personId}`);
      return results[0] ?? null;
    },
    enabled: !!personId,
  });
}

export function useAvailableCells(reconciliationId: string | undefined) {
  return useQuery({
    queryKey: ["reconciliations", reconciliationId, "available-cells"],
    queryFn: () => apiFetch<AvailableCell[]>(`/api/reconciliations/${reconciliationId}/available-cells/`),
    enabled: !!reconciliationId,
  });
}

export function useAvailableMinistries(reconciliationId: string | undefined) {
  return useQuery({
    queryKey: ["reconciliations", reconciliationId, "available-ministries"],
    queryFn: () =>
      apiFetch<AvailableMinistry[]>(`/api/reconciliations/${reconciliationId}/available-ministries/`),
    enabled: !!reconciliationId,
  });
}

export function useUpdateJornada() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      jornadaCompleted,
    }: {
      id: string;
      jornadaCompleted: boolean;
    }) =>
      apiFetch<Reconciliation>(`/api/reconciliations/${id}/jornada/`, {
        method: "PATCH",
        body: JSON.stringify({ jornada_completed: jornadaCompleted }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reconciliations"] }),
  });
}

export function useReassignReconciliador() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reconciliadorId }: { id: string; reconciliadorId: string }) =>
      apiFetch<Reconciliation>(`/api/reconciliations/${id}/reassign/`, {
        method: "POST",
        body: JSON.stringify({ reconciliador_id: reconciliadorId }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reconciliations"] }),
  });
}

export function useAddReconciliationToCell() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cellId }: { id: string; cellId: string }) =>
      apiFetch<Reconciliation>(`/api/reconciliations/${id}/cell/`, {
        method: "POST",
        body: JSON.stringify({ cell_id: cellId }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reconciliations"] }),
  });
}

export function useAddReconciliationToMinistry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ministryId }: { id: string; ministryId: string }) =>
      apiFetch<Reconciliation>(`/api/reconciliations/${id}/ministry/`, {
        method: "POST",
        body: JSON.stringify({ ministry_id: ministryId }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reconciliations"] }),
  });
}

export function useReconciliationDashboard(campusId?: string) {
  return useQuery({
    queryKey: ["reconciliation-dashboard", { campus: campusId }],
    queryFn: () =>
      apiFetch<ReconciliationDashboard>(
        `/api/reconciliations/dashboard/${campusId ? `?campus=${campusId}` : ""}`,
      ),
  });
}
