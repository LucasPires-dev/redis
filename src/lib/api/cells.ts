import { useQuery } from "@tanstack/react-query";
import { apiFetch, apiList } from "./client";
import type { CampusMini, MinistryKind } from "./ministries";
import type { PersonMini } from "./people";

export interface Cell {
  id: string;
  campus: CampusMini;
  name: string;
  weekday: string;
  target_audience: MinistryKind | "";
  address: string;
  description: string;
  leaders: PersonMini[];
  co_leaders: PersonMini[];
  member_count: number;
}

export function useCells() {
  return useQuery({
    queryKey: ["cells"],
    queryFn: () => apiList<Cell>("/api/cells/"),
  });
}

export function useCell(id: string | undefined) {
  return useQuery({
    queryKey: ["cells", id],
    queryFn: () => apiFetch<Cell>(`/api/cells/${id}/`),
    enabled: !!id,
  });
}

export function useCellMembers(id: string | undefined) {
  return useQuery({
    queryKey: ["cell-members", id],
    queryFn: () => apiFetch<PersonMini[]>(`/api/cells/${id}/members/`),
    enabled: !!id,
  });
}
