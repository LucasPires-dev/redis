import { createFileRoute, Link } from "@tanstack/react-router";
import { HeartHandshake, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RouteError } from "@/components/RouteError";
import { CardGridSkeleton } from "@/components/skeletons";
import { MINISTRY_LABEL, useMinistries, type MinistryKind } from "@/lib/api/ministries";

export const Route = createFileRoute("/app/ministerios")({
  head: () => ({ meta: [{ title: "Ministérios — Redis" }] }),
  component: MinistryPage,
  errorComponent: RouteError,
});

function MinistryPage() {
  const { data: ministries, isLoading } = useMinistries();

  // The API returns a flat list already scoped to the caller's role — grouping by
  // kind (for the "one card per kind" list view) happens client-side.
  const kinds = Array.from(new Set((ministries ?? []).map((m) => m.kind))) as MinistryKind[];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ministérios</h1>
        <p className="text-sm text-muted-foreground">
          Ministérios da igreja. Clique para ver detalhes por campus.
        </p>
      </div>

      {isLoading && <CardGridSkeleton />}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {kinds.map((kind) => {
          const relevant = (ministries ?? []).filter((m) => m.kind === kind);
          const campusIds = new Set(relevant.map((m) => m.campus.id));
          const members = relevant.reduce((sum, m) => sum + m.member_count, 0);

          return (
            <Link key={kind} to="/app/ministerios/$kind" params={{ kind }} className="group">
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                      <HeartHandshake className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight">
                    {MINISTRY_LABEL[kind]}
                  </h3>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="outline">
                      {campusIds.size} {campusIds.size === 1 ? "campus" : "campus"}
                    </Badge>
                  </div>
                  <div className="mt-4 border-t border-border pt-3 text-sm">
                    <span className="font-semibold tabular-nums">{members}</span>{" "}
                    <span className="text-muted-foreground">pessoas ativas</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
        {!isLoading && kinds.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum ministério visível para seu perfil.</p>
        )}
      </div>
    </div>
  );
}
