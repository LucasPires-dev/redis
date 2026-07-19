import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { GraduationCap, Users, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DetailHeader } from "@/components/detail/DetailHeader";
import { StatCard } from "@/components/detail/StatCard";
import { DetailSection } from "@/components/detail/DetailSection";
import { useDB } from "@/lib/mock-store";

export const Route = createFileRoute("/app/cursos_/$id")({
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
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <DetailHeader
        backTo="/app/cursos"
        backLabel="Cursos"
        icon={<GraduationCap className="h-6 w-6" />}
        title={course.name}
        subtitle={course.description}
        actions={
          <Badge variant={campus ? "outline" : "secondary"}>
            {campus ? campus.name : "Geral"}
          </Badge>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={<Users className="h-4 w-4" />} label="Inscritos" value={course.enrolled} />
        <StatCard
          icon={<Building2 className="h-4 w-4" />}
          label="Escopo"
          value={campus ? campus.name : "Toda a igreja"}
        />
        <StatCard
          icon={<GraduationCap className="h-4 w-4" />}
          label="Concluintes"
          value="—"
          hint="a definir"
        />
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Turmas"
          value="—"
          hint="a definir"
        />
      </div>

      <DetailSection title="Sobre">
        <Card>
          <CardContent className="p-5 text-sm">{course.description}</CardContent>
        </Card>
      </DetailSection>

      <DetailSection title="Turmas & inscritos">
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">
            A lista de turmas será exibida aqui quando o curso tiver ofertas abertas.
          </CardContent>
        </Card>
      </DetailSection>
    </div>
  );
}
