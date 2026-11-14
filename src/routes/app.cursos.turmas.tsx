import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ArrowRight, BookOpen, CalendarDays, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/detail/DetailSection";
import { CardGridSkeleton } from "@/components/skeletons";
import { capabilitiesOf, useAuth } from "@/lib/api/auth";
import { TEACHER_ROLE_LABEL, useTaughtClasses, WEEKDAY_LABEL } from "@/lib/api/courses";

// "Minhas turmas": the classes the person teaches or assists — the way in to
// lessons, attendance and students. Only for people who teach.
export const Route = createFileRoute("/app/cursos/turmas")({
  head: () => ({ meta: [{ title: "Minhas turmas — Redis" }] }),
  component: TaughtClasses,
});

function TaughtClasses() {
  const { me } = useAuth();
  const teach = capabilitiesOf(me).courses.teach;
  const { data: classes, isLoading } = useTaughtClasses(teach);

  if (me && !teach) return <Navigate to="/app/cursos" replace />;
  if (isLoading || !me) return <CardGridSkeleton />;
  if (!classes?.length) return <EmptyState>Você não está escalado em nenhuma turma.</EmptyState>;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {classes.map((c) => {
        const mine = c.teachers.find((t) => t.person.id === me.id);
        const schedule = [c.weekday ? WEEKDAY_LABEL[c.weekday] : null, c.start_time?.slice(0, 5)]
          .filter(Boolean)
          .join(" · ");
        return (
          <Link
            key={c.id}
            to="/app/cursos/$id/turma/$classId"
            params={{ id: c.course_id, classId: c.id }}
            className="group"
            data-testid="taught-class"
          >
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardContent className="flex h-full flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {c.course_name}
                    </p>
                    <h3 className="text-lg font-semibold tracking-tight">{c.name}</h3>
                  </div>
                  {mine && (
                    <Badge variant="secondary" className="shrink-0">
                      {TEACHER_ROLE_LABEL[mine.role]}
                    </Badge>
                  )}
                </div>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> {c.campus.name}
                    {schedule && ` · ${schedule}`}
                  </p>
                  {c.start_date && (
                    <p className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" /> Início{" "}
                      {new Date(c.start_date + "T00:00:00").toLocaleDateString("pt-BR")}
                    </p>
                  )}
                  <p className="flex items-center gap-4">
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" /> {c.enrolled_count} aluno(s)
                    </span>
                    <span className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" /> {c.lesson_count} aula(s)
                    </span>
                  </p>
                </div>
                <span className="mt-auto flex items-center gap-1 text-sm text-primary">
                  Abrir turma
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
