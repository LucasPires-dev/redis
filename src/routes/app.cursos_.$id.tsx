import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { GraduationCap, Users, Building2, BookOpen, Calendar, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DetailHeader } from "@/components/detail/DetailHeader";
import { StatCard } from "@/components/detail/StatCard";
import { DetailSection, EmptyState } from "@/components/detail/DetailSection";
import { CourseClassFormDialog } from "@/components/courses/CourseClassFormDialog";
import {
  useCourse,
  useCourseClasses,
  WEEKDAY_LABEL,
  TEACHER_ROLE_LABEL,
} from "@/lib/api/courses";
import { RouteError } from "@/components/RouteError";
import { DetailSkeleton } from "@/components/skeletons";

export const Route = createFileRoute("/app/cursos_/$id")({
  head: () => ({ meta: [{ title: "Curso — Redis" }] }),
  component: CourseDetail,
  errorComponent: RouteError,
  notFoundComponent: () => (
    <div className="p-10 text-sm text-muted-foreground">Curso não encontrado.</div>
  ),
});

function CourseDetail() {
  const { id } = Route.useParams();
  const { data: course, isLoading } = useCourse(id);
  const { data: classes } = useCourseClasses(id);
  const [showNewClass, setShowNewClass] = useState(false);

  if (isLoading) {
    return <DetailSkeleton />;
  }
  if (!course) throw notFound();

  const totalEnrolled = course.total_enrolled;
  const totalClasses = classes?.length ?? course.class_count;
  const totalLessons = (classes ?? []).reduce((sum, c) => sum + c.lesson_count, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <DetailHeader
        backTo="/app/cursos"
        backLabel="Cursos"
        icon={<GraduationCap className="h-6 w-6" />}
        title={course.name}
        subtitle={course.description}
        actions={
          <Badge variant={course.campus ? "outline" : "secondary"}>
            {course.campus ? course.campus.name : "Geral"}
          </Badge>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={<Users className="h-4 w-4" />} label="Inscritos" value={totalEnrolled} />
        <StatCard
          icon={<Building2 className="h-4 w-4" />}
          label="Escopo"
          value={course.campus ? course.campus.name : "Toda a igreja"}
        />
        <StatCard
          icon={<GraduationCap className="h-4 w-4" />}
          label="Turmas"
          value={totalClasses}
        />
        <StatCard
          icon={<BookOpen className="h-4 w-4" />}
          label="Aulas"
          value={totalLessons}
        />
      </div>

      <CourseClassFormDialog open={showNewClass} onOpenChange={setShowNewClass} courseId={id} />

      <DetailSection
        title="Turmas"
        count={totalClasses}
        action={
          <Button size="sm" variant="outline" onClick={() => setShowNewClass(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Nova turma
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {(classes ?? []).map((cc) => (
            <Link
              key={cc.id}
              to="/app/cursos/$id/turma/$classId"
              params={{ id, classId: cc.id }}
              className="group"
            >
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">{cc.name}</h4>
                    <Badge variant="outline">{cc.campus.name}</Badge>
                  </div>
                  {(cc.weekday || cc.start_time) && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {cc.weekday ? WEEKDAY_LABEL[cc.weekday] : ""}
                      {cc.start_time ? ` · ${cc.start_time.slice(0, 5)}` : ""}
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{cc.enrolled_count} inscritos</span>
                    <span>{cc.lesson_count} aulas</span>
                  </div>
                  {cc.teachers.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {cc.teachers.map((t) => (
                        <Badge key={t.id} variant="secondary" className="text-[10px]">
                          {t.person.name} · {TEACHER_ROLE_LABEL[t.role]}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
          {(classes ?? []).length === 0 && (
            <EmptyState>Nenhuma turma cadastrada ainda.</EmptyState>
          )}
        </div>
      </DetailSection>
    </div>
  );
}
