import { createFileRoute } from "@tanstack/react-router";
import { HeartHandshake } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MINISTRY_LABEL, useDB } from "@/lib/mock-store";

export const Route = createFileRoute("/app/ministerios")({
  head: () => ({ meta: [{ title: "Ministérios — Redis" }] }),
  component: MinistryPage,
});

function MinistryPage() {
  const db = useDB((d) => d);
  const role = db.currentRole;

  let mins = db.ministries;
  if (role === "lider_campus") mins = mins.filter((m) => m.campusId === db.currentCampusId);
  if (role === "lider_geral_ministerio") mins = mins.filter((m) => m.kind === db.currentMinistryKind);
  if (role === "lider_ministerio_campus")
    mins = mins.filter((m) => m.campusId === db.currentCampusId && m.kind === db.currentMinistryKind);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ministérios</h1>
        <p className="text-sm text-muted-foreground">
          Ministérios ativos em cada campus, agrupados por tipo.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mins.map((m) => {
          const campus = db.campuses.find((c) => c.id === m.campusId);
          const members = db.people.filter((p) => p.ministryIds.includes(m.id)).length;
          return (
            <Card key={m.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <HeartHandshake className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {MINISTRY_LABEL[m.kind]}
                  </Badge>
                </div>
                <h3 className="mt-4 text-lg font-semibold tracking-tight">
                  {MINISTRY_LABEL[m.kind]}
                </h3>
                <p className="text-sm text-muted-foreground">{campus?.name}</p>
                <div className="mt-4 border-t border-border pt-3 text-sm">
                  <span className="font-semibold tabular-nums">{members}</span>{" "}
                  <span className="text-muted-foreground">pessoas ativas</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {mins.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum ministério visível para seu perfil.</p>
        )}
      </div>
    </div>
  );
}
