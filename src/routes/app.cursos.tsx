import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, ArrowRight, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CourseFormDialog } from "@/components/courses/CourseFormDialog";
import { RouteError } from "@/components/RouteError";
import { CardGridSkeleton } from "@/components/skeletons";
import { useCourses } from "@/lib/api/courses";

export const Route = createFileRoute("/app/cursos")({
  head: () => ({ meta: [{ title: "Cursos — Redis" }] }),
  component: CoursesPage,
  errorComponent: RouteError,
});

function CoursesPage() {
  const { data: courses, isLoading } = useCourses();
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cursos</h1>
          <p className="text-sm text-muted-foreground">Formação disponível para pessoas do escopo.</p>
        </div>
        <Button size="sm" onClick={() => setShowNew(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Novo curso
        </Button>
      </div>

      <CourseFormDialog open={showNew} onOpenChange={setShowNew} />

      {isLoading && <CardGridSkeleton />}

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
    </div>
  );
}
