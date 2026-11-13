import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDownload, apiFetch, apiList } from "./client";
import type { CampusMini } from "./ministries";
import type { PersonMini } from "./people";

// ── Types ──────────────────────────────────────────────────────────────────

export interface CourseMini {
  id: string;
  name: string;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  campus: CampusMini | null;
  /** Courses to complete before enrolling in this one. */
  prerequisites: CourseMini[];
  class_count: number;
  total_enrolled: number;
  /** Edit/delete the course. */
  can_manage: boolean;
  /** Open a class (for a church-wide course, local coordinators at their campus). */
  can_add_class: boolean;
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

/** Lessons attended out of those whose attendance was taken for the student. */
export interface AttendanceSummary {
  present: number;
  counted: number;
  /** null while no lesson counted yet. */
  percent: number | null;
}

export interface Enrollment {
  id: string;
  person: PersonMini;
  status: EnrollmentStatus;
  enrolled_at: string;
  completed_at: string | null;
  payment_status: PaymentStatus;
  payment_status_display: string;
  material_delivered_at: string | null;
  /** Present in the class roster; null elsewhere. */
  attendance: AttendanceSummary | null;
  /** Reaches the class's minimum attendance (null when attendance isn't included). */
  meets_attendance: boolean | null;
  /** "ABCD-EFGH-JKLM" once completed: printed on the certificate. */
  certificate_code: string | null;
}

/** What the public page shows for a valid certificate. */
export interface CertificateCheck {
  code: string;
  person_name: string;
  course_name: string;
  class_name: string;
  campus_name: string;
  church_name: string;
  start_date: string | null;
  end_date: string | null;
  completed_on: string;
  lesson_count: number;
  attendance_percent: number | null;
  teachers: string[];
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

export interface LessonPresence {
  id: string;
  order: number;
  title: string;
  date: string | null;
  /** null: attendance not taken for the student in this lesson. */
  present: boolean | null;
}

export interface MyEnrollment extends EnrollmentFinance {
  attendance: AttendanceSummary & { lessons: LessonPresence[] };
  meets_attendance: boolean;
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
    min_attendance_percent: number;
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
  prerequisites: CourseMini[];
  /** Prerequisites the person hasn't completed: they can't enroll yet. */
  missing_prerequisites: CourseMini[];
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
  completed_count: number;
  lesson_count: number;
  /** Share of the lessons a student must attend to complete the class. */
  min_attendance_percent: number;
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
  min_attendance_percent?: number;
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

/** Replaces the course's prerequisites. */
export function useSetPrerequisites(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (prerequisiteIds: string[]) =>
      apiFetch<Course>(`/api/courses/${courseId}/`, {
        method: "PATCH",
        body: JSON.stringify({ prerequisite_ids: prerequisiteIds }),
      }),
    onSuccess: (course) => {
      qc.setQueryData(["courses", courseId], course);
      qc.invalidateQueries({ queryKey: ["courses"] });
      qc.invalidateQueries({ queryKey: ["open-classes"] });
    },
  });
}

// ── Tracks (trilhas) ───────────────────────────────────────────────────────

export type TrackStepState = "completed" | "in_progress" | "not_started";

export const TRACK_STEP_STATE_LABEL: Record<TrackStepState, string> = {
  completed: "Concluído",
  in_progress: "Cursando",
  not_started: "Não iniciado",
};

export interface CourseTrack {
  id: string;
  name: string;
  description: string;
  steps: { id: string; order: number; course: CourseMini }[];
  /** Church-wide coordination keeps the tracks. */
  can_manage: boolean;
  my_progress: {
    completed: number;
    total: number;
    next_course: CourseMini | null;
    steps: {
      id: string;
      order: number;
      course: CourseMini & { description: string };
      state: TrackStepState;
      /** Classes of this course open for enrollment now. */
      open_classes: number;
    }[];
  };
}

export function useTracks() {
  return useQuery({
    queryKey: ["course-tracks"],
    queryFn: () => apiList<CourseTrack>("/api/course-tracks/"),
  });
}

export function useSaveTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id?: string;
      name: string;
      description: string;
      course_ids: string[];
    }) =>
      apiFetch<CourseTrack>(id ? `/api/course-tracks/${id}/` : "/api/course-tracks/", {
        method: id ? "PATCH" : "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["course-tracks"] }),
  });
}

export function useDeleteTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/course-tracks/${id}/`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["course-tracks"] }),
  });
}

/** The prerequisites an API error says are missing (enrolling without them). */
export function missingPrerequisitesOf(error: unknown): CourseMini[] | null {
  if (!error || typeof error !== "object" || !("detail" in error)) return null;
  const detail = (error as { detail: unknown }).detail;
  if (detail && typeof detail === "object" && "missing_prerequisites" in detail) {
    return (detail as { missing_prerequisites: CourseMini[] }).missing_prerequisites;
  }
  return null;
}

// ── Classes (turmas) ───────────────────────────────────────────────────────

export function useCourseClasses(courseId: string) {
  return useQuery({
    queryKey: ["course-classes", courseId],
    queryFn: () => apiList<CourseClass>(`/api/course-classes/?course_id=${courseId}`),
    enabled: !!courseId,
  });
}

/** Classes the person teaches or assists ("Minhas turmas"). */
export function useTaughtClasses(enabled = true) {
  return useQuery({
    queryKey: ["course-classes", "teaching"],
    queryFn: () => apiList<CourseClass>("/api/course-classes/?teaching=1"),
    enabled,
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
      /** The person's CPF, when they have none on file and a link is wanted. */
      cpf?: string;
      /** Enroll even without the course's prerequisites. */
      override_prerequisites?: boolean;
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

/** Marks the given students as having completed the class. */
export function useCompleteClass(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (personIds: string[]) =>
      apiFetch<Enrollment[]>(`/api/course-classes/${classId}/complete/`, {
        method: "POST",
        body: JSON.stringify({ person_ids: personIds }),
      }),
    onSuccess: (roster) => {
      qc.setQueryData(["course-class-enrollments", classId], roster);
      qc.invalidateQueries({ queryKey: ["course-class-care", classId] });
      qc.invalidateQueries({ queryKey: ["course-class", classId] });
      qc.invalidateQueries({ queryKey: ["lessons", classId] });
      qc.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

// ── Reports and students to care for ───────────────────────────────────────

export type ClassState = "upcoming" | "ongoing" | "finished";

export const CLASS_STATE_LABEL: Record<ClassState, string> = {
  upcoming: "Próxima",
  ongoing: "Em andamento",
  finished: "Encerrada",
};

export interface CourseReportRow {
  id: string;
  course: { id: string; name: string };
  name: string;
  campus: { id: string; name: string };
  start_date: string | null;
  end_date: string | null;
  state: ClassState;
  min_attendance_percent: number;
  capacity: number | null;
  /** Holding a seat: active + completed. */
  enrolled: number;
  active: number;
  completed: number;
  /** Dropped, cancelled or refunded after enrolling (expired reservations don't count). */
  dropouts: number;
  /** Over everyone who started (enrolled + dropouts). */
  completion_rate: number | null;
  dropout_rate: number | null;
  lesson_count: number;
  lessons_held: number;
  attendance_rate: number | null;
  to_care: number;
  is_paid: boolean;
  expected_cents: number;
  received_cents: number;
  outstanding_cents: number;
}

export interface CourseReport {
  campuses: { id: string; name: string }[];
  totals: {
    classes: number;
    ongoing: number;
    enrolled: number;
    active: number;
    completed: number;
    dropouts: number;
    completion_rate: number | null;
    dropout_rate: number | null;
    attendance_rate: number | null;
    to_care: number;
    expected_cents: number;
    received_cents: number;
    outstanding_cents: number;
  };
  classes: CourseReportRow[];
}

/** Coordination report; filters applied by the API (campus, class state). */
export function useCourseReport(filters: { campus?: string; state?: ClassState }) {
  const params = new URLSearchParams();
  if (filters.campus) params.set("campus", filters.campus);
  if (filters.state) params.set("state", filters.state);
  return useQuery({
    queryKey: ["course-report", filters.campus ?? "", filters.state ?? ""],
    queryFn: () => apiFetch<CourseReport>(`/api/course-classes/report/?${params}`),
  });
}

export type CareReason = "absences_in_a_row" | "below_minimum";

export interface CareStudent {
  person: PersonMini;
  reasons: CareReason[];
  absences_in_a_row: number;
  attendance: AttendanceSummary;
  last_present_on: string | null;
}

/** Active students who need attention (absences in a row, below the minimum). */
export function useClassCare(classId: string, enabled = true) {
  return useQuery({
    queryKey: ["course-class-care", classId],
    queryFn: () => apiFetch<CareStudent[]>(`/api/course-classes/${classId}/care/`),
    enabled: !!classId && enabled,
  });
}

// ── Certificates ───────────────────────────────────────────────────────────

function slug(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Downloads the completion certificate (PDF) of an enrollment. */
export function downloadCertificate(enrollmentId: string, courseName: string, personName: string) {
  return apiDownload(
    `/api/course-enrollments/${enrollmentId}/certificate/`,
    `certificado-${slug(courseName)}-${slug(personName)}.pdf`,
  );
}

/** Public check of a certificate by its code (no login needed). */
export function useCertificateCheck(code: string) {
  return useQuery({
    queryKey: ["certificate-check", code],
    queryFn: () =>
      apiFetch<CertificateCheck>(`/api/certificates/${encodeURIComponent(code)}/`).catch(
        (e: unknown) => {
          // Not found = not a valid certificate (an answer, not an error).
          if (e && typeof e === "object" && "status" in e && e.status === 404) return null;
          throw e;
        },
      ),
    enabled: !!code,
    retry: false,
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
      // Each student's attendance percentage in the roster, and who to care for.
      qc.invalidateQueries({ queryKey: ["course-class-enrollments", vars.classId] });
      qc.invalidateQueries({ queryKey: ["course-class-care", vars.classId] });
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
    mutationFn: ({
      classId,
      ...body
    }: {
      classId: string;
      items: FeeChoice[];
      installments: number;
      cpf?: string;
    }) =>
      apiFetch<MyEnrollment>(`/api/course-classes/${classId}/enroll/`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (_, vars) => {
      if (vars.cpf) qc.invalidateQueries({ queryKey: ["me"] });
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
        qc.invalidateQueries({ queryKey: ["me"] }); // a CPF may have been saved
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
export const usePayEnrollment = enrollmentAction<{ installments?: number; cpf?: string }>("pay");
/** `manual_refund`: the coordinator returned by hand what Asaas can't refund (a boleto). */
export const useCancelEnrollment = enrollmentAction<{
  force?: boolean;
  note?: string;
  manual_refund?: boolean;
}>("cancel");
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
