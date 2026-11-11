import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiList } from "./client";
import type { CampusMini } from "./ministries";
import type { PersonMini } from "./people";

// ── Types ──────────────────────────────────────────────────────────────────

export interface Course {
  id: string;
  name: string;
  description: string;
  campus: CampusMini | null;
  class_count: number;
  total_enrolled: number;
  created_at: string;
}

export type TeacherRole = "teacher" | "assistant";

export interface Teacher {
  id: string;
  person: PersonMini;
  role: TeacherRole;
}

export type EnrollmentStatus = "active" | "completed" | "dropped";

export type PaymentStatus =
  "free" | "pending" | "partial" | "paid" | "waived" | "expired" | "cancelled" | "refunded";

export interface Enrollment {
  id: string;
  person: PersonMini;
  status: EnrollmentStatus;
  enrolled_at: string;
  completed_at: string | null;
  payment_status: PaymentStatus;
  payment_status_display: string;
  material_delivered_at: string | null;
}

export interface ClassFeeItem {
  id?: string;
  name: string;
  price_cents: number;
  required: boolean;
  options: string[];
  order?: number;
}

export interface EnrollmentItem {
  id: string;
  name: string;
  price_cents: number;
  option: string;
}

export interface EnrollmentPayment {
  id: string;
  method: "asaas" | "manual";
  amount_cents: number;
  note: string;
  recorded_by: PersonMini | null;
  paid_at: string;
  refunded_at: string | null;
  refund_note: string;
}

/** An enrollment with its money: the coordinators' view and the member's own. */
export interface EnrollmentFinance extends Enrollment {
  items: EnrollmentItem[];
  payments: EnrollmentPayment[];
  gross_cents: number;
  discount_cents: number;
  amount_cents: number;
  paid_cents: number;
  balance_cents: number;
  refunded_cents: number;
  scholarship_reason: string;
  scholarship_granted_by: PersonMini | null;
  installments: number;
  payment_url: string;
  expires_at: string | null;
  paid_at: string | null;
  has_overdue_installment: boolean;
}

export interface MyEnrollment extends EnrollmentFinance {
  course_class: {
    id: string;
    name: string;
    course_id: string;
    course_name: string;
    campus: string;
    weekday: number | null;
    start_time: string | null;
    start_date: string | null;
    end_date: string | null;
    max_installments: number;
  };
  can_cancel: boolean;
}

export interface OpenClass {
  id: string;
  course_name: string;
  course_description: string;
  campus: CampusMini;
  name: string;
  description: string;
  weekday: number | null;
  start_time: string | null;
  start_date: string | null;
  end_date: string | null;
  max_capacity: number | null;
  enrollment_deadline: string | null;
  reservation_days: number;
  max_installments: number;
  refund_before_start: boolean;
  fee_items: ClassFeeItem[];
  base_price_cents: number;
  seats_left: number | null;
  my_enrollment: { id: string; payment_status: PaymentStatus } | null;
}

export interface FinanceSummary {
  expected_cents: number;
  received_cents: number;
  received_online_cents: number;
  received_manual_cents: number;
  outstanding_cents: number;
  scholarship_cents: number;
  refunded_cents: number;
  expenses_cents: number;
  balance_cents: number;
  enrolled: number;
  capacity: number | null;
  by_status: Partial<Record<PaymentStatus, number>>;
  overdue_installments: number;
  materials_delivered: number;
  items: { name: string; total: number; options: Record<string, number> }[];
}

export interface ClassExpense {
  id: string;
  description: string;
  amount_cents: number;
  date: string;
  created_by: PersonMini | null;
  created_at: string;
}

export interface FeeChoice {
  fee_item_id: string;
  option?: string;
}

export interface CourseClass {
  id: string;
  course_id: string;
  course_name: string;
  campus: CampusMini;
  name: string;
  weekday: number | null;
  start_time: string | null;
  start_date: string | null;
  end_date: string | null;
  description: string;
  teachers: Teacher[];
  enrolled_count: number;
  lesson_count: number;
  self_enrollment: boolean;
  max_capacity: number | null;
  enrollment_deadline: string | null;
  reservation_days: number;
  max_installments: number;
  refund_before_start: boolean;
  fee_items: ClassFeeItem[];
  base_price_cents: number;
  seats_left: number | null;
  can_manage: boolean;
  can_manage_finances: boolean;
  created_at: string;
}

export interface CourseClassInput {
  course_id: string;
  campus_id: string;
  name: string;
  weekday?: number | null;
  start_time?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  description?: string;
  self_enrollment?: boolean;
  max_capacity?: number | null;
  enrollment_deadline?: string | null;
  reservation_days?: number;
  max_installments?: number;
  refund_before_start?: boolean;
  fee_items?: ClassFeeItem[];
}

export interface Lesson {
  id: string;
  course_class_id: string;
  order: number;
  title: string;
  date: string | null;
  notes: string;
  attendance_count: number;
  total_enrolled: number;
  created_at: string;
}

export interface LessonAttendance {
  id: string;
  person: PersonMini;
  present: boolean;
  created_at: string;
}

export const TEACHER_ROLE_LABEL: Record<TeacherRole, string> = {
  teacher: "Professor",
  assistant: "Auxiliar",
};

export const ENROLLMENT_STATUS_LABEL: Record<EnrollmentStatus, string> = {
  active: "Ativo",
  completed: "Concluído",
  dropped: "Desistente",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  free: "Gratuita",
  pending: "Aguardando pagamento",
  partial: "Pago em parte",
  paid: "Paga",
  waived: "Bolsa integral",
  expired: "Reserva expirada",
  cancelled: "Cancelada",
  refunded: "Reembolsada",
};

/** Badge colours per payment status (Tailwind classes). */
export const PAYMENT_STATUS_TONE: Record<PaymentStatus, string> = {
  free: "bg-muted text-muted-foreground",
  pending: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  partial: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  paid: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  waived: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  expired: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
  refunded: "bg-muted text-muted-foreground",
};

/** Statuses that still owe money. */
export function isOpenPayment(status: PaymentStatus) {
  return status === "pending" || status === "partial";
}

const CLOSED_PAYMENT: PaymentStatus[] = ["expired", "cancelled", "refunded"];

/** An enrollment that takes a seat (not dropped, cancelled, expired or refunded). */
export function holdsSeat(e: Pick<Enrollment, "status" | "payment_status">) {
  return e.status !== "dropped" && !CLOSED_PAYMENT.includes(e.payment_status);
}

/** The class's refund rule: full refund only before the class starts (mirrors the API). */
export function refundAllowed(cls: Pick<CourseClass, "refund_before_start" | "start_date">) {
  if (!cls.refund_before_start) return false;
  if (!cls.start_date) return true;
  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local time
  return today < cls.start_date;
}

export const WEEKDAY_LABEL: Record<number, string> = {
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
  7: "Domingo",
};

// ── Courses ────────────────────────────────────────────────────────────────

export function useCourses() {
  return useQuery({
    queryKey: ["courses"],
    queryFn: () => apiList<Course>("/api/courses/"),
  });
}

export function useCourse(id: string) {
  return useQuery({
    queryKey: ["courses", id],
    queryFn: () => apiFetch<Course>(`/api/courses/${id}/`),
    enabled: !!id,
  });
}

export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; campus_id?: string | null }) =>
      apiFetch<Course>("/api/courses/", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses"] }),
  });
}

// ── Classes (turmas) ───────────────────────────────────────────────────────

export function useCourseClasses(courseId: string) {
  return useQuery({
    queryKey: ["course-classes", courseId],
    queryFn: () => apiList<CourseClass>(`/api/course-classes/?course_id=${courseId}`),
    enabled: !!courseId,
  });
}

export function useCourseClass(id: string) {
  return useQuery({
    queryKey: ["course-class", id],
    queryFn: () => apiFetch<CourseClass>(`/api/course-classes/${id}/`),
    enabled: !!id,
  });
}

export function useCreateCourseClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CourseClassInput) =>
      apiFetch<CourseClass>("/api/course-classes/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["course-classes", vars.course_id] });
      qc.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

export function useUpdateCourseClass(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CourseClassInput>) =>
      apiFetch<CourseClass>(`/api/course-classes/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: (cls) => {
      qc.setQueryData(["course-class", id], cls);
      qc.invalidateQueries({ queryKey: ["course-classes", cls.course_id] });
      qc.invalidateQueries({ queryKey: ["course-class-finance", id] });
      qc.invalidateQueries({ queryKey: ["open-classes"] });
    },
  });
}

// ── Teachers ───────────────────────────────────────────────────────────────

export function useTeachers(classId: string) {
  return useQuery({
    queryKey: ["course-class-teachers", classId],
    queryFn: () => apiFetch<Teacher[]>(`/api/course-classes/${classId}/teachers/`),
    enabled: !!classId,
  });
}

export function useAddTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { classId: string; person_id: string; role?: TeacherRole }) =>
      apiFetch<Teacher>(`/api/course-classes/${data.classId}/teachers/`, {
        method: "POST",
        body: JSON.stringify({ person_id: data.person_id, role: data.role ?? "teacher" }),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["course-class-teachers", vars.classId] });
      qc.invalidateQueries({ queryKey: ["course-class", vars.classId] });
    },
  });
}

export function useRemoveTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { classId: string; personId: string }) =>
      apiFetch<void>(`/api/course-classes/${data.classId}/teachers/${data.personId}/`, {
        method: "DELETE",
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["course-class-teachers", vars.classId] });
      qc.invalidateQueries({ queryKey: ["course-class", vars.classId] });
    },
  });
}

// ── Enrollments ────────────────────────────────────────────────────────────

export function useEnrollments(classId: string) {
  return useQuery({
    queryKey: ["course-class-enrollments", classId],
    queryFn: () => apiFetch<Enrollment[]>(`/api/course-classes/${classId}/enrollments/`),
    enabled: !!classId,
  });
}

export function useAddEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      classId,
      ...body
    }: {
      classId: string;
      person_id: string;
      status?: EnrollmentStatus;
      items?: FeeChoice[];
      installments?: number;
      send_charge?: boolean;
    }) =>
      apiFetch<Enrollment>(`/api/course-classes/${classId}/enrollments/`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["course-class-enrollments", vars.classId] });
      qc.invalidateQueries({ queryKey: ["course-class-finance", vars.classId] });
      qc.invalidateQueries({ queryKey: ["course-class", vars.classId] });
      qc.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

export function useRemoveEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { classId: string; personId: string }) =>
      apiFetch<void>(`/api/course-classes/${data.classId}/enrollments/${data.personId}/`, {
        method: "DELETE",
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["course-class-enrollments", vars.classId] });
      qc.invalidateQueries({ queryKey: ["course-class", vars.classId] });
      qc.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

// ── Lessons ────────────────────────────────────────────────────────────────

export function useLessons(classId: string) {
  return useQuery({
    queryKey: ["lessons", classId],
    queryFn: () => apiList<Lesson>(`/api/lessons/?course_class_id=${classId}`),
    enabled: !!classId,
  });
}

export function useCreateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      course_class_id: string;
      order: number;
      title?: string;
      date?: string;
      notes?: string;
    }) => apiFetch<Lesson>("/api/lessons/", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["lessons", vars.course_class_id] });
      qc.invalidateQueries({ queryKey: ["course-class", vars.course_class_id] });
    },
  });
}

// ── Attendance ─────────────────────────────────────────────────────────────

export function useLessonAttendance(lessonId: string) {
  return useQuery({
    queryKey: ["lesson-attendance", lessonId],
    queryFn: () => apiFetch<LessonAttendance[]>(`/api/lessons/${lessonId}/attendance/`),
    enabled: !!lessonId,
  });
}

export function useSaveAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      lessonId: string;
      classId: string;
      attendances: { person_id: string; present: boolean }[];
    }) =>
      apiFetch<LessonAttendance[]>(`/api/lessons/${data.lessonId}/attendance/`, {
        method: "POST",
        body: JSON.stringify({ attendances: data.attendances }),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["lesson-attendance", vars.lessonId] });
      qc.invalidateQueries({ queryKey: ["lessons", vars.classId] });
    },
  });
}

// ── People search ──────────────────────────────────────────────────────────

export function useSearchPeopleForClass(classId: string, query: string) {
  return useQuery({
    queryKey: ["course-class-search-people", classId, query],
    queryFn: () =>
      apiFetch<PersonMini[]>(
        `/api/course-classes/${classId}/search-people/?q=${encodeURIComponent(query)}`,
      ),
    enabled: !!classId && query.length >= 2,
  });
}

// ── Self-enrollment (members) ──────────────────────────────────────────────

export function useOpenClasses() {
  return useQuery({
    queryKey: ["open-classes"],
    queryFn: () => apiFetch<OpenClass[]>("/api/course-classes/open/"),
  });
}

export function useMyEnrollments() {
  return useQuery({
    queryKey: ["my-enrollments"],
    queryFn: () => apiList<MyEnrollment>("/api/course-enrollments/?mine=1"),
  });
}

export function useSelfEnroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { classId: string; items: FeeChoice[]; installments: number }) =>
      apiFetch<MyEnrollment>(`/api/course-classes/${data.classId}/enroll/`, {
        method: "POST",
        body: JSON.stringify({ items: data.items, installments: data.installments }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["open-classes"] });
      qc.invalidateQueries({ queryKey: ["my-enrollments"] });
    },
  });
}

// ── Enrollment money actions ───────────────────────────────────────────────

type EnrollmentActionVars<TBody> = { id: string; classId?: string; body: TBody };

function enrollmentAction<TBody>(action: string) {
  return function useEnrollmentAction() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: ({ id, body }: EnrollmentActionVars<TBody>) =>
        apiFetch<EnrollmentFinance>(`/api/course-enrollments/${id}/${action}/`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
      onSuccess: (_, vars) => {
        qc.invalidateQueries({ queryKey: ["my-enrollments"] });
        qc.invalidateQueries({ queryKey: ["open-classes"] });
        if (vars.classId) {
          qc.invalidateQueries({ queryKey: ["course-class-finance", vars.classId] });
          qc.invalidateQueries({ queryKey: ["course-class-enrollments", vars.classId] });
          qc.invalidateQueries({ queryKey: ["course-class", vars.classId] });
        }
      },
    });
  };
}

/** New payment link for what is still owed (optionally in installments). */
export const usePayEnrollment = enrollmentAction<{ installments?: number }>("pay");
export const useCancelEnrollment = enrollmentAction<{ force?: boolean; note?: string }>("cancel");
export const useGrantScholarship = enrollmentAction<{ discount_cents: number; reason: string }>(
  "scholarship",
);
export const useManualPayment = enrollmentAction<{ amount_cents: number; note?: string }>(
  "manual-payment",
);
export const useMarkMaterial = enrollmentAction<{ delivered: boolean }>("material");

// ── Class finances ─────────────────────────────────────────────────────────

export function useClassFinance(classId: string, enabled = true) {
  return useQuery({
    queryKey: ["course-class-finance", classId],
    queryFn: () =>
      apiFetch<{ summary: FinanceSummary; enrollments: EnrollmentFinance[] }>(
        `/api/course-classes/${classId}/finance/`,
      ),
    enabled: !!classId && enabled,
  });
}

/** Downloads the class's finance CSV (needs the auth header, so no plain link). */
export async function downloadFinanceCsv(classId: string, filename: string) {
  const text = await apiFetch<string>(`/api/course-classes/${classId}/finance-export/`);
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function useClassExpenses(classId: string, enabled = true) {
  return useQuery({
    queryKey: ["class-expenses", classId],
    queryFn: () => apiList<ClassExpense>(`/api/class-expenses/?course_class=${classId}`),
    enabled: !!classId && enabled,
  });
}

export function useCreateExpense(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { description: string; amount_cents: number; date: string }) =>
      apiFetch<ClassExpense>("/api/class-expenses/", {
        method: "POST",
        body: JSON.stringify({ ...data, course_class_id: classId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["class-expenses", classId] });
      qc.invalidateQueries({ queryKey: ["course-class-finance", classId] });
    },
  });
}

export function useDeleteExpense(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/class-expenses/${id}/`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["class-expenses", classId] });
      qc.invalidateQueries({ queryKey: ["course-class-finance", classId] });
    },
  });
}
