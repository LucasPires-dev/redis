import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";

// "Quero participar" of a public cell: the person asks, the cell's leadership
// accepts (the person becomes a visitor and gets the address) or declines.

export type CellJoinStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface CellJoinRequest {
  id: string;
  cell: {
    id: string;
    church: string;
    /** Only on the person's own accepted requests. */
    name?: string;
    address?: string;
    meeting_day_display?: string;
    meeting_time?: string | null;
    leaders?: { name: string; phone: string }[];
  };
  /** Contact data, for the cell's leadership (null on the person's own list). */
  person: { id: string; name: string; phone: string; email: string } | null;
  message: string;
  status: CellJoinStatus;
  created_at: string;
  decided_at: string | null;
}

const URL = "/api/cell-join-requests/";

/** The person's requests for one cell (latest first). */
export function useMyCellJoinRequests(cellId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["cell-join-requests", "mine", cellId],
    queryFn: () => apiFetch<CellJoinRequest[]>(`${URL}mine/?cell=${cellId}`),
    enabled,
  });
}

export function useAskToJoinCell() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { cellId: string; message: string }) =>
      apiFetch<CellJoinRequest>(URL, {
        method: "POST",
        body: JSON.stringify({ cell_id: input.cellId, message: input.message }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cell-join-requests"] }),
  });
}

/** Pending requests of a cell, for whoever manages it. */
export function useCellJoinRequests(cellId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["cell-join-requests", "cell", cellId],
    queryFn: () => apiFetch<CellJoinRequest[]>(`${URL}?cell=${cellId}`),
    enabled,
  });
}

export function useAnswerCellJoin(action: "accept" | "decline" | "cancel") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<CellJoinRequest>(`${URL}${id}/${action}/`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cell-join-requests"] });
      qc.invalidateQueries({ queryKey: ["cell-visitors"] });
    },
  });
}
