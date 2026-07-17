import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, GraduationCap, Users, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDB } from "@/lib/mock-store";

export const Route = createFileRoute("/app/cursos/$id")({
  head: () => ({ meta: [{ title: "Curso — Redis" }] }),
  component: CourseDetail,
  notFoundComponent: () => (
    <div className="p-10 text-sm text-muted-foreground">Curso não encontrado.</div>
  ),
});

function CourseDetail() {
  const { id } = Route.useParams();
  const db = useDB((d) => d);
  const course = db.courses.find((c) => c.id === id);
  if (!course) throw notFound();
  const campus = course.campusId ? db.campuses.find((c) => c.id === course.campusId) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <Link
        to="/app/cursos"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Cursos
      </Link>

      <div className="flex items-center gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-accent-foreground">
          <GraduationCap className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{course.name}</h1>
          <p className="text-sm text-muted-foreground">{course.description}</p>
        </div>
        <Badge variant={campus ? "outline" : "secondary"}>
          {campus ? campus.name : "Geral"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Inscritos</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{course.enrolled}</div>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-accent-foreground">
              <Users className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Escopo</div>
              <div className="mt-1 text-2xl font-semibold">
                {campus ? campus.name : "Toda a igreja"}
              </div>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-accent-foreground">
              <Building2 className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Sobre o curso
          </h2>
          <p className="mt-2 text-sm">{course.description}</p>
        </CardContent>
      </Card>
    </div>
  );
}
