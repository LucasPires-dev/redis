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

// Who a cell is for: the audience-facing ministry kinds, plus an explicit "todos".
export type CellAudience =
  | Extract<MinistryKind, "jovens" | "criancas" | "adolescentes" | "mulheres" | "homens" | "casais">
  | "todos";

export const CELL_AUDIENCE_LABEL: Record<CellAudience, string> = {
  todos: "Todos",
  jovens: "Jovens",
  criancas: "Crianças",
  adolescentes: "Adolescentes",
  mulheres: "Mulheres",
  homens: "Homens",
  casais: "Casais",
};

export const CELL_AUDIENCES = Object.keys(CELL_AUDIENCE_LABEL) as CellAudience[];

// Fields a cell needs before it can run (backend Cell.REQUIRED_FIELDS).
export type CellRequiredField = "meeting_day" | "meeting_time" | "target_audience";

export const CELL_REQUIRED_FIELD_LABEL: Record<CellRequiredField, string> = {
  meeting_day: "dia do encontro",
  meeting_time: "horário",
  target_audience: "público-alvo",
};

// "dia do encontro, horário e público-alvo"
export function describeMissingFields(fields: CellRequiredField[]): string {
  const labels = fields.map((f) => CELL_REQUIRED_FIELD_LABEL[f]);
  return labels.length > 1
    ? `${labels.slice(0, -1).join(", ")} e ${labels[labels.length - 1]}`
    : (labels[0] ?? "");
}

export interface Cell {
  id: string;
  campus: CampusMini;
  name: string;
  meeting_day: MeetingDay | null;
  meeting_day_display: string;
  meeting_time: string | null;
  // Empty only on cells created before it was required.
  target_audience: CellAudience | "";
  // Required fields still empty; while any is missing the cell isn't active
  // (no meetings, no renewal, not offered to new converts).
  missing_fields: CellRequiredField[];
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
  /** The cell this one was born from in a multiplication ("célula mãe"). */
  parent_cell: { id: string; name: string } | null;
  /** When the multiplication that created this cell happened. */
  multiplied_on: string | null;
  /** Multiplication plan: the planned date and who will lead the new cell. */
  multiplication_date: string | null;
  multiplication_leader: PersonMini | null;
  leaders: PersonMini[];
  co_leaders: PersonMini[];
  /** Líderes em treinamento. */
  trainees: PersonMini[];
  member_count: number;
  /** Leaders, co-leaders and members, each once — what screens call "membros". */
  participant_count: number;
  // Past scheduled meetings nobody registered yet.
  pending_meetings: number;
  // Whether the logged-in user may edit the cell, its members and meetings.
  can_manage: boolean;
  // Whether the logged-in user may assign its leaders and renew it.
  can_coordinate: boolean;
  /** Whether the logged-in user may name its leaders in training (its leader or coordination). */
  can_appoint_trainee: boolean;
  /** How the cell is doing; only for whoever manages it (null otherwise). */
  health: CellHealth | null;
}

export type CellHealthStatus = "critical" | "attention" | "healthy" | "new";

export interface CellHealthReason {
  level: "critical" | "attention";
  text: string;
}

export interface CellHealth {
  status: CellHealthStatus;
  /** Average % of the cell present in the last 4 meetings held. */
  attendance_rate: number | null;
  /** % change in attendance against the 4 meetings before (null without history). */
  trend: number | null;
  /** Visitors (named or not) in the last 4 meetings held. */
  recent_visitors: number;
  reasons: CellHealthReason[];
}

export const CELL_HEALTH_LABEL: Record<CellHealthStatus, string> = {
  critical: "Crítica",
  attention: "Atenção",
  healthy: "Saudável",
  new: "Sem histórico",
};

/** Most urgent first, for sorting. */
export const CELL_HEALTH_ORDER: Record<CellHealthStatus, number> = {
  critical: 0,
  attention: 1,
  new: 2,
  healthy: 3,
};

/** "Pessoas para cuidar": who the leader should reach out to. */
export interface CellCare {
  absent_members: {
    person: { id: string; name: string; email: string; phone: string };
    /** Held meetings missed in a row, up to the last one. */
    absences: number;
    last_attended: string | null;
  }[];
  visitors_not_returning: {
    id: string;
    name: string;
    phone: string;
    last_visit: string;
    visit_count: number;
    /** Held meetings since the last visit. */
    missed: number;
  }[];
}

// Under ["cells", id] so anything that refreshes the cell refreshes this too.
export function useCellCare(id: string, enabled = true) {
  return useQuery({
    queryKey: ["cells", id, "care"],
    queryFn: () => apiFetch<CellCare>(`/api/cells/${id}/care/`),
    enabled,
  });
}

export interface CellFilters {
  // A season id, or "current" for the season running today.
  season?: string;
  meetingDay?: MeetingDay;
  campusId?: string;
  /** Only the cells the caller leads, co-leads or belongs to. */
  mine?: boolean;
}

export function useCells(filters: CellFilters = {}) {
  const params = new URLSearchParams({ ordering: "meeting_day,meeting_time,name" });
  if (filters.season) params.set("season", filters.season);
  if (filters.meetingDay) params.set("meeting_day", String(filters.meetingDay));
  if (filters.campusId) params.set("campus", filters.campusId);
  if (filters.mine) params.set("mine", "true");
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
  // false: the meeting didn't happen on this date (holiday, cancelled).
  held: boolean;
  cancel_reason: string;
  /** What was studied/discussed. */
  topic: string;
  notes: string;
  /** People who made a decision for Christ. */
  decisions_count: number;
  attendees: PersonMini[];
  /** Guests registered by name (CellVisitor). */
  visitors: CellVisitorMini[];
  /** Guests counted by number only (not registered). */
  visitors_count: number;
  // Registered attendees + named visitors + visitors counted by number.
  attendance_count: number;
  created_by: PersonMini | null;
  created_at: string;
}

export type CalendarStatus = "registered" | "not_held" | "pending" | "today" | "upcoming";

export interface CalendarEntry {
  // The meeting's date when there is one, else the scheduled date.
  date: string;
  // null for an extra meeting outside the cell's schedule.
  scheduled_date: string | null;
  status: CalendarStatus;
  meeting: CellMeeting | null;
}

export interface CalendarSummary {
  scheduled: number;
  registered: number;
  not_held: number;
  pending: number;
  upcoming: number;
  average_attendance: number | null;
  total_visitors: number;
  total_decisions: number;
}

export interface CellCalendar {
  entries: CalendarEntry[]; // newest first
  summary: CalendarSummary;
}

// Every scheduled date of the cell's season (from its meeting day) with its status.
export function useCellCalendar(cellId: string | undefined) {
  return useQuery({
    queryKey: ["cell-meetings", cellId, "calendar"],
    queryFn: () => apiFetch<CellCalendar>(`/api/cells/${cellId}/calendar/`),
    enabled: !!cellId,
  });
}

export interface CellMeetingInput {
  date: string;
  held: boolean;
  cancel_reason: string;
  topic: string;
  notes: string;
  decisions_count: number;
  attendee_ids: string[];
  visitor_ids: string[];
  visitors_count: number;
}

// --- Visitors (guests by name) ----------------------------------------------------

export type VisitorStatus = "visiting" | "member" | "forwarded";

export const VISITOR_STATUS_LABEL: Record<VisitorStatus, string> = {
  visiting: "Visitante",
  member: "Virou membro",
  forwarded: "Na Reconciliação",
};

export interface CellVisitorMini {
  id: string;
  name: string;
  status: VisitorStatus;
}

/** A cell's guest. Only whoever manages the cell gets these (contact data). */
export interface CellVisitor extends CellVisitorMini {
  cell: string;
  phone: string;
  email: string;
  notes: string;
  person: PersonMini | null;
  /** Sent to the Reconciliação triage queue. */
  forwarded: boolean;
  visit_count: number;
  first_visit: string | null;
  last_visit: string | null;
  created_at: string;
}

export function useCellVisitors(cellId: string, enabled = true) {
  return useQuery({
    queryKey: ["cell-visitors", cellId],
    queryFn: () => apiList<CellVisitor>(`/api/cell-visitors/?cell=${cellId}`),
    enabled,
  });
}

function invalidateVisitors(queryClient: ReturnType<typeof useQueryClient>, cellId: string) {
  queryClient.invalidateQueries({ queryKey: ["cell-visitors", cellId] });
  // "Pessoas para cuidar" lists visitors still visiting.
  queryClient.invalidateQueries({ queryKey: ["cells", cellId, "care"] });
}

export function useCreateCellVisitor(cellId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; phone?: string; email?: string; notes?: string }) =>
      apiFetch<CellVisitor>("/api/cell-visitors/", {
        method: "POST",
        body: JSON.stringify({ cell_id: cellId, ...input }),
      }),
    onSuccess: () => invalidateVisitors(queryClient, cellId),
  });
}

export function useUpdateCellVisitor(cellId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: {
      id: string;
      name?: string;
      phone?: string;
      email?: string;
      notes?: string;
    }) =>
      apiFetch<CellVisitor>(`/api/cell-visitors/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateVisitors(queryClient, cellId),
  });
}

/** Hands the visitor to Reconciliação as a pending lead of the cell's campus. */
export function useForwardCellVisitor(cellId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<CellVisitor>(`/api/cell-visitors/${id}/forward/`, { method: "POST" }),
    onSuccess: () => invalidateVisitors(queryClient, cellId),
  });
}

/** The visitor joins the cell: an existing person, or a new one by e-mail. */
export function useMakeVisitorMember(cellId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; person_id?: string; email?: string }) =>
      apiFetch<CellVisitor>(`/api/cell-visitors/${id}/make-member/`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      invalidateVisitors(queryClient, cellId);
      queryClient.invalidateQueries({ queryKey: ["cell-members", cellId] });
      queryClient.invalidateQueries({ queryKey: ["cells"] });
    },
  });
}

// Meeting data changes the calendar and the cells' pending counts.
function invalidateMeetings(queryClient: ReturnType<typeof useQueryClient>, cellId: string) {
  queryClient.invalidateQueries({ queryKey: ["cell-meetings", cellId] });
  // Visit counts come from the meetings.
  queryClient.invalidateQueries({ queryKey: ["cell-visitors", cellId] });
  queryClient.invalidateQueries({ queryKey: ["cells"] });
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
    onSuccess: () => invalidateMeetings(queryClient, cellId),
  });
}

export function useDeleteCellMeeting(cellId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (meetingId: string) =>
      apiFetch<void>(`/api/cell-meetings/${meetingId}/`, { method: "DELETE" }),
    onSuccess: () => invalidateMeetings(queryClient, cellId),
  });
}

// --- Cell management -----------------------------------------------------------

export interface CellInput {
  campus_id: string;
  season_id: string;
  name: string;
  meeting_day: MeetingDay | null;
  meeting_time: string | null;
  // Day, time and audience are required by the API; the form starts them empty.
  target_audience: CellAudience | "";
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

/** A cell also has leaders in training, unlike ministries and campuses. */
export type CellRole = LeadershipRole | "trainee";

export const CELL_ROLE_LABEL: Record<CellRole, string> = {
  leader: "Líder",
  co_leader: "Colíder",
  trainee: "Líder em treinamento",
};

export function useAssignCellLeader(cellId: string) {
  const invalidate = useInvalidateCell(cellId);
  return useMutation({
    mutationFn: (input: { person_id: string; role: CellRole }) =>
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

// ─── Multiplication ──────────────────────────────────────────────────

export function useSetMultiplicationPlan(cellId: string) {
  const invalidate = useInvalidateCell(cellId);
  return useMutation({
    mutationFn: (input: { date: string | null; leader_id: string | null }) =>
      apiFetch<Cell>(`/api/cells/${cellId}/multiplication-plan/`, {
        method: "PUT",
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export function useClearMultiplicationPlan(cellId: string) {
  const invalidate = useInvalidateCell(cellId);
  return useMutation({
    mutationFn: () =>
      apiFetch<Cell>(`/api/cells/${cellId}/multiplication-plan/`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export interface MultiplyCellInput {
  name: string;
  leader_id: string;
  member_ids: string[];
  meeting_day?: MeetingDay;
  meeting_time?: string;
  address?: string;
}

// People leave this cell for the new one: the cell, its members and every
// list are refreshed (useInvalidateCell).
export function useMultiplyCell(cellId: string) {
  const invalidate = useInvalidateCell(cellId);
  return useMutation({
    mutationFn: (input: MultiplyCellInput) =>
      apiFetch<Cell>(`/api/cells/${cellId}/multiply/`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export interface CellLineageItem {
  id: string;
  name: string;
  season: string | null;
  multiplied_on: string | null;
}

export interface CellLineage {
  /** 1 for a cell nobody multiplied into, +1 per mother up the line. */
  generation: number;
  /** Mother first, then grandmother… */
  ancestors: CellLineageItem[];
  /** Cells born from this one (or from its earlier versions). */
  daughters: (CellLineageItem & { leaders: string[] })[];
}

// Under ["cells", id] so a multiplication or renewal refreshes it.
export function useCellLineage(cellId: string) {
  return useQuery({
    queryKey: ["cells", cellId, "lineage"],
    queryFn: () => apiFetch<CellLineage>(`/api/cells/${cellId}/lineage/`),
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

// ─── Coordination report ─────────────────────────────────────────────

/** One week of one cell (or of a sum of cells). */
export interface CellReportWeek {
  held: number;
  attendance: number;
  visitors: number;
  decisions: number;
}

export interface CellReportRow {
  id: string;
  name: string;
  campus: { id: string; name: string };
  leaders: string[];
  trainees: string[];
  /** The mother cell, for the generations tree. */
  parent: { id: string; name: string } | null;
  multiplied_on: string | null;
  /** Cells born from this one. */
  multiplications: number;
  /** Planned multiplication date, if any. */
  multiplication_date: string | null;
  participants: number;
  meetings_held: number;
  meetings_not_held: number;
  meetings_pending: number;
  /** Sum of people present over the meetings held. */
  attendance: number;
  avg_attendance: number | null;
  /** Average % of the participants present. */
  attendance_rate: number | null;
  visitors: number;
  decisions: number;
  /** Visitors who became members of the cell. */
  new_members: number;
  forwarded: number;
  health: CellHealthStatus;
  /** Aligned with CellReport.weeks. */
  series: CellReportWeek[];
}

export interface CampusReportRow {
  id: string;
  name: string;
  cells: number;
  participants: number;
  meetings_held: number;
  attendance: number;
  avg_attendance: number | null;
  visitors: number;
  decisions: number;
  new_members: number;
  /** Active people of the campus, and how many are in a cell of the season. */
  people: number;
  people_in_cells: number;
  coverage: number | null;
}

export interface CellReport {
  /** Mondays (ISO dates) from the season's start to the current week. */
  weeks: string[];
  cells: CellReportRow[];
  campuses: CampusReportRow[];
}

export function useCellReport(season: string, enabled = true) {
  return useQuery({
    queryKey: ["cells", "report", season],
    queryFn: () => apiFetch<CellReport>(`/api/cells/report/?season=${encodeURIComponent(season)}`),
    enabled,
  });
}
