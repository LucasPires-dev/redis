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

export interface Enrollment {
  id: string;
  person: PersonMini;
  status: EnrollmentStatus;
  enrolled_at: string;
  completed_at: string | null;
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
  created_at: string;
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
    mutationFn: (data: {
      course_id: string;
      campus_id: string;
      name: string;
      weekday?: number;
      start_time?: string;
      start_date?: string;
      end_date?: string;
      description?: string;
    }) =>
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
    mutationFn: (data: { classId: string; person_id: string; status?: EnrollmentStatus }) =>
      apiFetch<Enrollment>(`/api/course-classes/${data.classId}/enrollments/`, {
        method: "POST",
        body: JSON.stringify({ person_id: data.person_id, status: data.status ?? "active" }),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["course-class-enrollments", vars.classId] });
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
    }) =>
      apiFetch<Lesson>("/api/lessons/", { method: "POST", body: JSON.stringify(data) }),
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
        `/api/course-classes/${classId}/search-people/?q=${encodeURIComponent(query)}`
      ),
    enabled: !!classId && query.length >= 2,
  });
}
