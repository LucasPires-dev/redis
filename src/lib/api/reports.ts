// Event reports: attendance, money in and out (revenue, refunds, expenses),
// CSV exports and the events side by side. For the event's organizers.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDownload, apiFetch } from "./client";

export interface ReportEventInfo {
  id: string;
  title: string;
  starts_at: string;
  event_type: string;
  campus: string | null;
  series: string | null;
}

export interface EventAttendance {
  has_registration: boolean;
  /** Confirmed registrations. */
  registrations: number;
  /** People + companions of the confirmed registrations. */
  confirmed_seats: number;
  pending: number;
  cancelled: number;
  checked_in: number;
  /** Confirmed seats without check-in (after the event started). */
  no_show: number | null;
  /** Counted in the room by hand (events without registration). */
  headcount: number | null;
  /** Check-ins, or the headcount when there are none. */
  present: number | null;
  /** Check-ins over confirmed seats, in %. */
  attendance_rate: number | null;
}

export interface ExpenseByCategory {
  category: ExpenseCategory;
  label: string;
  amount_cents: number;
}

export interface EventFinance {
  gross_cents: number;
  refunded_cents: number;
  refunds: number;
  net_cents: number;
  expenses_cents: number;
  balance_cents: number;
  expenses_by_category: ExpenseByCategory[];
}

export interface EventReport {
  event: ReportEventInfo;
  attendance: EventAttendance;
  finance: EventFinance;
  ticket_types: {
    id: string | null;
    name: string;
    registrations: number;
    seats: number;
    revenue_cents: number;
  }[];
  registrations_by_day: { date: string; count: number }[];
}

/** One event in the comparison. */
export interface EventReportRow {
  event: ReportEventInfo;
  registrations: number;
  confirmed_seats: number;
  present: number | null;
  attendance_rate: number | null;
  gross_cents: number;
  refunded_cents: number;
  net_cents: number;
  expenses_cents: number;
  balance_cents: number;
}

export function useEventReport(eventId: string | undefined) {
  return useQuery({
    queryKey: ["event-report", eventId],
    queryFn: () => apiFetch<EventReport>(`/api/payments/reports/${eventId}/`),
    enabled: !!eventId,
  });
}

/** The events the person organizes, newest first (only those that started,
 * unless `series` is given). */
export function useEventReports(filters: { series?: string; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (filters.series) {
    params.set("series", filters.series);
    params.set("to", new Date().toISOString().slice(0, 10));
  }
  params.set("limit", String(filters.limit ?? 30));
  return useQuery({
    queryKey: ["event-reports", filters.series ?? "", filters.limit ?? 30],
    queryFn: () =>
      apiFetch<{ results: EventReportRow[] }>(`/api/payments/reports/?${params}`).then(
        (r) => r.results,
      ),
  });
}

export type CsvKind = "attendees" | "finance";

export function downloadEventCsv(event: ReportEventInfo, kind: CsvKind) {
  const slug =
    event.title
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "evento";
  const day = event.starts_at.slice(0, 10);
  return apiDownload(
    `/api/payments/reports/${event.id}/csv/?kind=${kind}`,
    `${slug}-${day}-${kind === "attendees" ? "inscritos" : "financeiro"}.csv`,
  );
}

// ── Expenses ─────────────────────────────────────────────────────────────────

export type ExpenseCategory =
  "venue" | "food" | "audiovisual" | "marketing" | "travel" | "guests" | "materials" | "other";

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  venue: "Local e estrutura",
  food: "Alimentação",
  audiovisual: "Som, luz e imagem",
  marketing: "Divulgação",
  travel: "Transporte e hospedagem",
  guests: "Convidados e ministração",
  materials: "Materiais",
  other: "Outros",
};

export interface EventExpense {
  id: string;
  event_id: string;
  description: string;
  category: ExpenseCategory;
  category_label: string;
  amount_cents: number;
  spent_on: string;
  notes: string;
  created_by: { id: string; name: string } | null;
  created_at: string;
}

export interface ExpenseInput {
  id?: string;
  event_id: string;
  description: string;
  category: ExpenseCategory;
  amount_cents: number;
  spent_on: string;
  notes?: string;
}

export function useExpenses(eventId: string | undefined) {
  return useQuery({
    queryKey: ["event-expenses", eventId],
    queryFn: () => apiFetch<EventExpense[]>(`/api/payments/expenses/?event=${eventId}`),
    enabled: !!eventId,
  });
}

function useExpenseMutation<V>(fn: (v: V) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event-expenses"] });
      qc.invalidateQueries({ queryKey: ["event-report"] });
      qc.invalidateQueries({ queryKey: ["event-reports"] });
    },
  });
}

export function useSaveExpense() {
  return useExpenseMutation(({ id, ...body }: ExpenseInput) =>
    apiFetch<EventExpense>(id ? `/api/payments/expenses/${id}/` : "/api/payments/expenses/", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(body),
    }),
  );
}

export function useDeleteExpense() {
  return useExpenseMutation((id: string) =>
    apiFetch<void>(`/api/payments/expenses/${id}/`, { method: "DELETE" }),
  );
}

/** Attendance counted in the room (events without registration). */
export function useSetHeadcount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, headcount }: { eventId: string; headcount: number | null }) =>
      apiFetch(`/api/production-events/${eventId}/`, {
        method: "PATCH",
        body: JSON.stringify({ headcount }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event-report"] });
      qc.invalidateQueries({ queryKey: ["event-reports"] });
      qc.invalidateQueries({ queryKey: ["production-events"] });
    },
  });
}

/** "R$ 1.234" for chart axes and tight spots. */
export function formatBRLShort(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}
