import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Calendar as CalIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDB } from "@/lib/mock-store";

export const Route = createFileRoute("/app/celulas")({
  head: () => ({ meta: [{ title: "Células — Redis" }] }),
  component: CellsPage,
});

function CellsPage() {
  const db = useDB((d) => d);
  const role = db.currentRole;
  let cells = db.cells;
  if (role !== "gestor" && role !== "lider_geral_ministerio") {
    cells = cells.filter((c) => c.campusId === db.currentCampusId);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Células</h1>
        <p className="text-sm text-muted-foreground">
          {cells.length} células no escopo visível.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cells.map((c) => {
          const campus = db.campuses.find((cc) => cc.id === c.campusId);
          return (
            <Link key={c.id} to="/app/celulas/$id" params={{ id: c.id }}>
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className="gap-1">
                      <CalIcon className="h-3 w-3" /> {c.weekday}
                    </Badge>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight">{c.name}</h3>
                  <p className="text-sm text-muted-foreground">{campus?.name}</p>
                  <div className="mt-3 text-sm">
                    <span className="font-semibold tabular-nums">{c.memberIds.length}</span>{" "}
                    <span className="text-muted-foreground">membros</span>
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
