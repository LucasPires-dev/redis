import { useState } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  GraduationCap,
  Users,
  BookOpen,
  UserCheck,
  Calendar,
  Check,
  X,
  Plus,
  Pencil,
  Wallet,
  Flag,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { apiErrorMessage } from "@/lib/api/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DetailHeader } from "@/components/detail/DetailHeader";
import { RouteError } from "@/components/RouteError";
import { DetailSkeleton } from "@/components/skeletons";
import { StatCard } from "@/components/detail/StatCard";
import { DetailSection, EmptyState } from "@/components/detail/DetailSection";
import { LessonFormDialog } from "@/components/courses/LessonFormDialog";
import { AddTeacherDialog } from "@/components/courses/AddTeacherDialog";
import { AddEnrollmentDialog } from "@/components/courses/AddEnrollmentDialog";
import { ClassFinanceTab } from "@/components/courses/ClassFinanceTab";
import { CourseClassFormDialog } from "@/components/courses/CourseClassFormDialog";
import { PaymentStatusBadge } from "@/components/courses/PaymentStatusBadge";
import { CompleteClassDialog } from "@/components/courses/CompleteClassDialog";
import { CertificateButton } from "@/components/courses/CertificateButton";
import { ClassCareSection } from "@/components/courses/ClassCareSection";
import { attendanceLabel, attendanceTone } from "@/lib/attendance";
import { formatBRL } from "@/lib/api/payments";
import {
  useCourseClass,
  useEnrollments,
  useLessons,
  useLessonAttendance,
  useSaveAttendance,
  WEEKDAY_LABEL,
  TEACHER_ROLE_LABEL,
  ENROLLMENT_STATUS_LABEL,
  holdsSeat,
  useMarkMaterial,
  type Lesson,
} from "@/lib/api/courses";

export const Route = createFileRoute("/app/cursos_/$id_/turma/$classId")({
  head: () => ({ meta: [{ title: "Turma — Redis" }] }),
  component: ClassDetail,
  errorComponent: RouteError,
  notFoundComponent: () => (
    <div className="p-10 text-sm text-muted-foreground">Turma não encontrada.</div>
  ),
});

function ClassDetail() {
  const { id: courseId, classId } = Route.useParams();
  const { data: cc, isLoading } = useCourseClass(classId);
  const { data: enrollments } = useEnrollments(classId);
  const material = useMarkMaterial();
  const { data: lessons } = useLessons(classId);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [showNewLesson, setShowNewLesson] = useState(false);
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [showAddEnrollment, setShowAddEnrollment] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showComplete, setShowComplete] = useState(false);

  if (isLoading) {
    return <DetailSkeleton />;
  }
  if (!cc) throw notFound();

  const schedule = [
    cc.weekday ? WEEKDAY_LABEL[cc.weekday] : null,
    cc.start_time ? cc.start_time.slice(0, 5) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // Everyone holding a seat (completed students included) and, among them,
  // those still in progress.
  const roster = (enrollments ?? []).filter(holdsSeat);
  const activeEnrollments = roster.filter((e) => e.status === "active");
  const isPaid = cc.fee_items.length > 0;
  // Enrolling into a paid class creates a charge: coordinators only.
  const canEnroll = isPaid ? cc.can_manage_finances : cc.can_manage;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <DetailHeader
        backTo="/app/cursos/$id"
        backParams={{ id: courseId }}
        backLabel={cc.course_name}
        icon={<GraduationCap className="h-6 w-6" />}
        title={cc.name}
        subtitle={schedule || cc.description || cc.course_name}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline">{cc.campus.name}</Badge>
            {cc.can_manage_finances && (
              <Button size="sm" variant="outline" onClick={() => setShowEdit(true)}>
                <Pencil className="mr-1.5 h-4 w-4" /> Editar turma
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Inscritos"
          value={cc.enrolled_count}
          hint={
            cc.max_capacity != null
              ? `${cc.seats_left ?? 0} de ${cc.max_capacity} vagas livres`
              : isPaid
                ? `Matrícula a partir de ${formatBRL(cc.base_price_cents)}`
                : undefined
          }
        />
        <StatCard icon={<BookOpen className="h-4 w-4" />} label="Aulas" value={cc.lesson_count} />
        <StatCard
          icon={<UserCheck className="h-4 w-4" />}
          label="Professores"
          value={cc.teachers.length}
        />
        <StatCard
          icon={<Calendar className="h-4 w-4" />}
          label="Período"
          value={
            cc.start_date && cc.end_date
              ? `${formatDate(cc.start_date)} — ${formatDate(cc.end_date)}`
              : "—"
          }
        />
      </div>

      <LessonFormDialog
        open={showNewLesson}
        onOpenChange={setShowNewLesson}
        classId={classId}
        nextOrder={(lessons ?? []).length + 1}
      />
      <AddTeacherDialog
        open={showAddTeacher}
        onOpenChange={setShowAddTeacher}
        classId={classId}
        existingTeachers={cc.teachers}
      />
      <AddEnrollmentDialog
        open={showAddEnrollment}
        onOpenChange={setShowAddEnrollment}
        courseClass={cc}
        existingEnrollments={enrollments ?? []}
      />
      <CourseClassFormDialog
        open={showEdit}
        onOpenChange={setShowEdit}
        courseId={courseId}
        courseClass={cc}
      />

      <Tabs defaultValue="lessons">
        <TabsList>
          <TabsTrigger value="lessons">Aulas & Presença</TabsTrigger>
          <TabsTrigger value="students">Alunos ({roster.length})</TabsTrigger>
          <TabsTrigger value="teachers">Professores ({cc.teachers.length})</TabsTrigger>
          {cc.can_manage_finances && (
            <TabsTrigger value="finance">
              <Wallet className="mr-1.5 h-4 w-4" /> Financeiro
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="lessons" className="space-y-4 pt-4">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setShowNewLesson(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Nova aula
            </Button>
          </div>
          {(lessons ?? []).length === 0 ? (
            <EmptyState>Nenhuma aula cadastrada ainda.</EmptyState>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {(lessons ?? []).map((l) => (
                <Card
                  key={l.id}
                  className={`cursor-pointer transition-colors hover:border-primary/40 ${
                    selectedLesson?.id === l.id ? "border-primary" : ""
                  }`}
                  onClick={() => setSelectedLesson(l)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">
                        Aula {l.order}
                        {l.title ? ` — ${l.title}` : ""}
                      </h4>
                      <Badge variant="secondary" className="text-[10px]">
                        {l.attendance_count}/{l.total_enrolled}
                      </Badge>
                    </div>
                    {l.date && (
                      <div className="mt-1 text-xs text-muted-foreground">{formatDate(l.date)}</div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {selectedLesson && (
            <AttendancePanel lesson={selectedLesson} classId={classId} enrollments={roster} />
          )}
        </TabsContent>

        <TabsContent value="students" className="space-y-4 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground" data-testid="completion-summary">
              Frequência mínima para concluir: {cc.min_attendance_percent}%
              {cc.completed_count > 0 &&
                ` · ${cc.completed_count} ${cc.completed_count === 1 ? "concluiu" : "concluíram"}`}
            </p>
            <div className="flex gap-2">
              {cc.can_manage && activeEnrollments.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => setShowComplete(true)}>
                  <Flag className="mr-1.5 h-4 w-4" /> Concluir turma
                </Button>
              )}
              {canEnroll && (
                <Button size="sm" variant="outline" onClick={() => setShowAddEnrollment(true)}>
                  <Plus className="mr-1.5 h-4 w-4" /> Inscrever aluno
                </Button>
              )}
            </div>
          </div>
          <ClassCareSection courseClass={cc} />
          <CompleteClassDialog
            open={showComplete}
            onOpenChange={setShowComplete}
            courseClass={cc}
            enrollments={activeEnrollments}
          />
          <div className="space-y-2">
            {roster.map((e) => (
              <Card key={e.id} data-testid="student-row">
                <CardContent className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{e.person.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{e.person.email}</div>
                    <div
                      className={`text-xs ${attendanceTone(e.meets_attendance, e.attendance)}`}
                      data-testid="student-attendance"
                    >
                      Presença: {attendanceLabel(e.attendance)}
                      {e.completed_at &&
                        ` · concluiu em ${formatDate(e.completed_at.slice(0, 10))}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {e.status === "completed" && e.certificate_code && cc.can_manage && (
                      <CertificateButton
                        compact
                        enrollmentId={e.id}
                        courseName={cc.course_name}
                        personName={e.person.name}
                      />
                    )}
                    {isPaid && <PaymentStatusBadge status={e.payment_status} />}
                    {/* Material delivery: teachers too (the Financeiro tab is coordinators-only). */}
                    {isPaid && cc.can_manage && e.status === "active" && (
                      <label className="flex items-center gap-1.5 text-xs">
                        <Checkbox
                          checked={!!e.material_delivered_at}
                          disabled={material.isPending}
                          onCheckedChange={(v) =>
                            material.mutate(
                              { id: e.id, classId: cc.id, body: { delivered: v === true } },
                              {
                                onError: (err) =>
                                  toast.error(apiErrorMessage(err, "Não foi possível salvar.")),
                              },
                            )
                          }
                          aria-label={`Material entregue para ${e.person.name}`}
                        />
                        Material
                      </label>
                    )}
                    <Badge
                      variant={
                        e.status === "active"
                          ? "default"
                          : e.status === "completed"
                            ? "secondary"
                            : "destructive"
                      }
                      className="text-[10px]"
                    >
                      {ENROLLMENT_STATUS_LABEL[e.status]}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {roster.length === 0 && <EmptyState>Nenhum aluno inscrito.</EmptyState>}
          </div>
        </TabsContent>

        <TabsContent value="teachers" className="space-y-4 pt-4">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setShowAddTeacher(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Adicionar professor
            </Button>
          </div>
          <div className="space-y-2">
            {cc.teachers.map((t) => (
              <Card key={t.id}>
                <CardContent className="flex items-center justify-between p-3">
                  <div>
                    <div className="text-sm font-medium">{t.person.name}</div>
                    <div className="text-xs text-muted-foreground">{t.person.email}</div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {TEACHER_ROLE_LABEL[t.role]}
                  </Badge>
                </CardContent>
              </Card>
            ))}
            {cc.teachers.length === 0 && <EmptyState>Nenhum professor escalado.</EmptyState>}
          </div>
        </TabsContent>

        {cc.can_manage_finances && (
          <TabsContent value="finance" className="pt-4">
            <ClassFinanceTab courseClass={cc} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function AttendancePanel({
  lesson,
  classId,
  enrollments,
}: {
  lesson: Lesson;
  classId: string;
  enrollments: {
    id: string;
    person: { id: string; name: string; email: string };
    status: string;
  }[];
}) {
  const { data: attendance, isLoading } = useLessonAttendance(lesson.id);
  const saveAttendance = useSaveAttendance();

  const attendanceMap = new Map((attendance ?? []).map((a) => [a.person.id, a.present]));

  const [localState, setLocalState] = useState<Map<string, boolean>>(new Map());

  const getPresent = (personId: string) => {
    if (localState.has(personId)) return localState.get(personId)!;
    if (attendanceMap.has(personId)) return attendanceMap.get(personId)!;
    return false;
  };

  const toggle = (personId: string) => {
    setLocalState((prev) => {
      const next = new Map(prev);
      next.set(personId, !getPresent(personId));
      return next;
    });
  };

  const handleSave = () => {
    const items = enrollments.map((e) => ({
      person_id: e.person.id,
      present: getPresent(e.person.id),
    }));
    saveAttendance.mutate({ lessonId: lesson.id, classId, attendances: items });
    setLocalState(new Map());
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">
            Presença — Aula {lesson.order}
            {lesson.title ? ` (${lesson.title})` : ""}
          </h4>
          <Button size="sm" onClick={handleSave} disabled={saveAttendance.isPending}>
            {saveAttendance.isPending ? "Salvando…" : "Salvar presença"}
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <div className="space-y-1">
            {enrollments.map((e) => {
              const present = getPresent(e.person.id);
              return (
                <button
                  key={e.person.id}
                  type="button"
                  onClick={() => toggle(e.person.id)}
                  className={`flex w-full items-center justify-between rounded-md border p-2 text-left transition-colors ${
                    present
                      ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
                      : "border-border"
                  }`}
                >
                  <span className="text-sm">{e.person.name}</span>
                  {present ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}
