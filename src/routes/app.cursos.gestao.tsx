import { useState } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ArrowRight, GraduationCap, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CourseFormDialog } from "@/components/courses/CourseFormDialog";
import { TracksManagement } from "@/components/courses/Tracks";
import { EmptyState } from "@/components/detail/DetailSection";
import { CardGridSkeleton } from "@/components/skeletons";
import { capabilitiesOf, useAuth } from "@/lib/api/auth";
import { useCourses } from "@/lib/api/courses";

// "Gestão": the courses the person coordinates (church-wide or at their
// campuses), with their classes. Only for coordinators.
export const Route = createFileRoute("/app/cursos/gestao")({
  head: () => ({ meta: [{ title: "Gestão de cursos — Redis" }] }),
  component: CoursesManagement,
});

function CoursesManagement() {
  const { me } = useAuth();
  const coordinate = capabilitiesOf(me).courses.coordinate;
  const coordinateAll = capabilitiesOf(me).courses.coordinate_all;
  const { data: courses, isLoading } = useCourses();
  const [showNew, setShowNew] = useState(false);

  if (me && !coordinate) return <Navigate to="/app/cursos" replace />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Cursos e turmas sob a sua coordenação.</p>
        <Button size="sm" onClick={() => setShowNew(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Novo curso
        </Button>
      </div>

      <CourseFormDialog open={showNew} onOpenChange={setShowNew} />

      {(isLoading || !me) && <CardGridSkeleton />}
      {!isLoading && courses?.length === 0 && (
        <EmptyState>Nenhum curso cadastrado ainda.</EmptyState>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(courses ?? []).map((c) => (
          <Link key={c.id} to="/app/cursos/$id" params={{ id: c.id }} className="group">
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={c.campus ? "outline" : "secondary"}>
                      {c.campus ? c.campus.name : "Geral"}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </div>
                <h3 className="mt-4 text-lg font-semibold tracking-tight">{c.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
                <div className="mt-3 flex items-center gap-4 text-sm">
                  <div>
                    <span className="font-semibold tabular-nums">{c.total_enrolled}</span>{" "}
                    <span className="text-muted-foreground">inscritos</span>
                  </div>
                  <div>
                    <span className="font-semibold tabular-nums">{c.class_count}</span>{" "}
                    <span className="text-muted-foreground">turmas</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="pt-4">
        <TracksManagement canManage={coordinateAll} />
      </div>
    </div>
  );
}
