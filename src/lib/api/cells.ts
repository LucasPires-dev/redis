import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiList } from "./client";
import type { CampusMini, MinistryKind } from "./ministries";
import type { PersonMini } from "./people";
import type { Season } from "./seasons";

// ISO numbering, same as the backend's choices.Weekday: 1 = Monday … 7 = Sunday.
export type MeetingDay = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const MEETING_DAY_LABEL: Record<MeetingDay, string> = {
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
  7: "Domingo",
};

export const MEETING_DAYS = Object.keys(MEETING_DAY_LABEL).map(Number) as MeetingDay[];

// "Quarta-feira · 19:30", "Quarta-feira", "19:30" or "" when nothing is set.
// meeting_time comes as "HH:MM" from /api/cells/ and "HH:MM:SS" from other endpoints.
export function formatSchedule(day: MeetingDay | null, time: string | null): string {
  return [day ? MEETING_DAY_LABEL[day] : null, time ? time.slice(0, 5) : null]
    .filter(Boolean)
    .join(" · ");
}

export interface Cell {
  id: string;
  campus: CampusMini;
  name: string;
  meeting_day: MeetingDay | null;
  meeting_day_display: string;
  meeting_time: string | null;
  target_audience: MinistryKind | "";
  address: string;
  description: string;
  season: Season | null;
  // The cell's own dates (optional) and the ones that actually apply (own or season's).
  start_date: string | null;
  end_date: string | null;
  effective_start: string | null;
  effective_end: string | null;
  // Same cell in the previous season (history across seasons).
  previous_cell: string | null;
  leaders: PersonMini[];
  co_leaders: PersonMini[];
  member_count: number;
  // Whether the logged-in user may edit the cell, its members and meetings.
  can_manage: boolean;
  // Whether the logged-in user may assign its leaders and renew it.
  can_coordinate: boolean;
}

export interface CellFilters {
  // A season id, or "current" for the season running today.
  season?: string;
  meetingDay?: MeetingDay;
  campusId?: string;
}

export function useCells(filters: CellFilters = {}) {
  const params = new URLSearchParams({ ordering: "meeting_day,meeting_time,name" });
  if (filters.season) params.set("season", filters.season);
  if (filters.meetingDay) params.set("meeting_day", String(filters.meetingDay));
  if (filters.campusId) params.set("campus", filters.campusId);
  return useQuery({
    queryKey: ["cells", "list", filters],
    queryFn: () => apiList<Cell>(`/api/cells/?${params}`),
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

export interface CellMeeting {
  id: string;
  cell: string;
  date: string; // YYYY-MM-DD
  notes: string;
  attendees: PersonMini[];
  visitors_count: number;
  // Registered attendees + visitors.
  attendance_count: number;
  created_by: PersonMini | null;
  created_at: string;
}

export function useCellMeetings(cellId: string | undefined) {
  return useQuery({
    queryKey: ["cell-meetings", cellId],
    queryFn: () => apiList<CellMeeting>(`/api/cell-meetings/?cell=${cellId}`),
    enabled: !!cellId,
  });
}

export interface CellMeetingInput {
  date: string;
  notes: string;
  attendee_ids: string[];
  visitors_count: number;
}

// Creates a meeting, or updates it when `meetingId` is given.
export function useSaveCellMeeting(cellId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ meetingId, ...input }: CellMeetingInput & { meetingId?: string }) =>
      meetingId
        ? apiFetch<CellMeeting>(`/api/cell-meetings/${meetingId}/`, {
            method: "PATCH",
            body: JSON.stringify(input),
          })
        : apiFetch<CellMeeting>("/api/cell-meetings/", {
            method: "POST",
            body: JSON.stringify({ ...input, cell_id: cellId }),
          }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cell-meetings", cellId] }),
  });
}

export function useDeleteCellMeeting(cellId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (meetingId: string) =>
      apiFetch<void>(`/api/cell-meetings/${meetingId}/`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cell-meetings", cellId] }),
  });
}

// --- Cell management -----------------------------------------------------------

export interface CellInput {
  campus_id: string;
  season_id: string;
  name: string;
  meeting_day: MeetingDay | null;
  meeting_time: string | null;
  target_audience: MinistryKind | "";
  address: string;
  description: string;
  start_date: string | null;
  end_date: string | null;
}

function useInvalidateCell(cellId?: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["cells"] });
    if (cellId) queryClient.invalidateQueries({ queryKey: ["cell-members", cellId] });
  };
}

export function useCreateCell() {
  const invalidate = useInvalidateCell();
  return useMutation({
    mutationFn: (input: CellInput) =>
      apiFetch<Cell>("/api/cells/", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: invalidate,
  });
}

export function useUpdateCell(cellId: string) {
  const invalidate = useInvalidateCell(cellId);
  return useMutation({
    mutationFn: (input: Partial<CellInput>) =>
      apiFetch<Cell>(`/api/cells/${cellId}/`, { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: invalidate,
  });
}

export function useAddCellMember(cellId: string) {
  const invalidate = useInvalidateCell(cellId);
  return useMutation({
    mutationFn: (personId: string) =>
      apiFetch<PersonMini[]>(`/api/cells/${cellId}/members/`, {
        method: "POST",
        body: JSON.stringify({ person_id: personId }),
      }),
    onSuccess: invalidate,
  });
}

export function useRemoveCellMember(cellId: string) {
  const invalidate = useInvalidateCell(cellId);
  return useMutation({
    mutationFn: (personId: string) =>
      apiFetch<void>(`/api/cells/${cellId}/members/${personId}/`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export type LeadershipRole = "leader" | "co_leader";

export function useAssignCellLeader(cellId: string) {
  const invalidate = useInvalidateCell(cellId);
  return useMutation({
    mutationFn: (input: { person_id: string; role: LeadershipRole }) =>
      apiFetch(`/api/cells/${cellId}/leaderships/`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export function useRemoveCellLeader(cellId: string) {
  const invalidate = useInvalidateCell(cellId);
  return useMutation({
    mutationFn: (personId: string) =>
      apiFetch<void>(`/api/cells/${cellId}/leaderships/${personId}/`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export function useRenewCell(cellId: string) {
  const invalidate = useInvalidateCell(cellId);
  return useMutation({
    mutationFn: (input: { season_id: string; copy_members: boolean }) =>
      apiFetch<Cell>(`/api/cells/${cellId}/renew/`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

// People picker backed by a dedicated search endpoint (returns id/name/email
// only), e.g. `/api/cells/:id/people-search/?for=leaders`. Needs 2+ characters.
export function usePeopleSearch(endpoint: string, term: string) {
  const q = term.trim();
  return useQuery({
    queryKey: ["people-search", endpoint, q],
    queryFn: () => {
      const sep = endpoint.includes("?") ? "&" : "?";
      return apiFetch<PersonMini[]>(`${endpoint}${sep}q=${encodeURIComponent(q)}`);
    },
    enabled: q.length >= 2,
    staleTime: 30_000,
  });
}

// --- Campus cells leaders (responsáveis pelas células do campus) -----------------

export interface CampusCellsLeadership {
  id: string;
  campus: string;
  person: PersonMini;
  role: LeadershipRole;
}

export function useCampusCellsLeaders(campusId: string | undefined) {
  return useQuery({
    queryKey: ["campus-cells-leaders", campusId],
    queryFn: () =>
      apiFetch<CampusCellsLeadership[]>(`/api/campuses/${campusId}/cells-leaderships/`),
    enabled: !!campusId,
  });
}

export function useAssignCampusCellsLeader(campusId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { person_id: string; role: LeadershipRole }) =>
      apiFetch(`/api/campuses/${campusId}/cells-leaderships/`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["campus-cells-leaders", campusId] }),
  });
}

export function useRemoveCampusCellsLeader(campusId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (personId: string) =>
      apiFetch<void>(`/api/campuses/${campusId}/cells-leaderships/${personId}/`, {
        method: "DELETE",
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["campus-cells-leaders", campusId] }),
  });
}
