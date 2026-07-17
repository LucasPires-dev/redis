import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDB } from "@/lib/mock-store";

export const Route = createFileRoute("/app/cursos")({
  head: () => ({ meta: [{ title: "Cursos — Redis" }] }),
  component: CoursesPage,
});

function CoursesPage() {
  const db = useDB((d) => d);
  const role = db.currentRole;
  let list = db.courses;
  if (role === "lider_campus" || role === "lider_ministerio_campus") {
    list = list.filter((c) => c.campusId === null || c.campusId === db.currentCampusId);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cursos</h1>
        <p className="text-sm text-muted-foreground">Formação disponível para pessoas do escopo.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {list.map((c) => {
          const campus = c.campusId ? db.campuses.find((cc) => cc.id === c.campusId) : null;
          return (
            <Link key={c.id} to="/app/cursos/$id" params={{ id: c.id }} className="group">
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={campus ? "outline" : "secondary"}>
                        {campus ? campus.name : "Geral"}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight">{c.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
                  <div className="mt-3 text-sm">
                    <span className="font-semibold tabular-nums">{c.enrolled}</span>{" "}
                    <span className="text-muted-foreground">inscritos</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
