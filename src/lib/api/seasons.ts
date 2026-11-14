import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiFetch, apiList } from "./client";

// Cell season (temporada), church-wide. `is_current` is computed by the backend
// from today's date — the season whose start/end range contains today.
export interface Season {
  id: string;
  name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;
  is_current: boolean;
}

export function useSeasons() {
  return useQuery({
    queryKey: ["seasons"],
    queryFn: () => apiList<Season>("/api/seasons/"),
  });
}

// null when no season is running today (between seasons).
export function useCurrentSeason() {
  return useQuery({
    queryKey: ["seasons", "current"],
    queryFn: async () => {
      try {
        return await apiFetch<Season>("/api/seasons/current/");
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
  });
}

// "01/08/2026" from "2026-08-01" without going through Date (avoids timezone shifts).
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export interface SeasonInput {
  church_id: string;
  name: string;
  start_date: string;
  end_date: string;
}

// Creates a season, or updates it when `seasonId` is given.
export function useSaveSeason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ seasonId, ...input }: SeasonInput & { seasonId?: string }) =>
      seasonId
        ? apiFetch<Season>(`/api/seasons/${seasonId}/`, {
            method: "PATCH",
            body: JSON.stringify(input),
          })
        : apiFetch<Season>("/api/seasons/", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seasons"] });
      queryClient.invalidateQueries({ queryKey: ["cells"] });
    },
  });
}

export function useChurches() {
  return useQuery({
    queryKey: ["churches"],
    queryFn: () => apiList<{ id: string; name: string }>("/api/churches/"),
  });
}

// Today as YYYY-MM-DD in the browser's local timezone (toISOString() would use
// UTC and roll over to tomorrow in the evening in Brazil).
export function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
