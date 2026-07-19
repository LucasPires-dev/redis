import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { HeartHandshake, Users, Building2, Crown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DetailHeader } from "@/components/detail/DetailHeader";
import { StatCard } from "@/components/detail/StatCard";
import { DetailSection, EmptyState } from "@/components/detail/DetailSection";
import {
  MINISTRY_LABEL,
  useMinistries,
  useMinistryGeneralLeaderships,
  type MinistryKind,
} from "@/lib/api/ministries";

export const Route = createFileRoute("/app/ministerios_/$kind")({
  head: ({ params }) => ({
    meta: [{ title: `${MINISTRY_LABEL[params.kind as MinistryKind] ?? "Ministério"} — Redis` }],
  }),
  component: MinistryDetail,
  notFoundComponent: () => (
    <div className="p-10 text-sm text-muted-foreground">Ministério não encontrado.</div>
  ),
});

function MinistryDetail() {
  const { kind } = Route.useParams();
  if (!(kind in MINISTRY_LABEL)) throw notFound();
  const k = kind as MinistryKind;
  const navigate = useNavigate();

  const { data: ministries, isLoading } = useMinistries();
  const { data: generalLeaderships } = useMinistryGeneralLeaderships();

  const rows = (ministries ?? []).filter((m) => m.kind === k);
  const totalPeople = rows.reduce((s, r) => s + r.member_count, 0);
  const generalLeaders = generalLeaderships?.find((g) => g.kind === k)?.leaders ?? [];

  // This "one card per campus" list only earns its keep when there's a real choice
  // to make (a general leader overseeing several campuses). Someone scoped to a
  // single campus ministry (a local leader/co-leader) always sees exactly one row
  // here — skip straight to that campus's detail page instead of an extra click.
  const onlyRow = rows.length === 1 ? rows[0] : undefined;
  const onlyCampusId = onlyRow?.campus.id;
  useEffect(() => {
    if (!isLoading && onlyCampusId) {
      navigate({
        to: "/app/ministerios/$kind/$campusId",
        params: { kind: k, campusId: onlyCampusId },
        replace: true,
      });
    }
  }, [isLoading, onlyCampusId, k, navigate]);

  if (!isLoading && onlyRow) {
    return <div className="p-10 text-sm text-muted-foreground">Carregando…</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <DetailHeader
        backTo="/app/ministerios"
        backLabel="Ministérios"
        icon={<HeartHandshake className="h-6 w-6" />}
        title={MINISTRY_LABEL[k]}
        subtitle={`Presente em ${rows.length} campus.`}
        actions={
          generalLeaders.length > 0 && (
            <Badge variant="outline" className="gap-1.5">
              <Crown className="h-3 w-3" />{" "}
              {generalLeaders.length > 1 ? "Líderes gerais" : "Líder geral"}:{" "}
              {generalLeaders.map((l) => l.name).join(", ")}
            </Badge>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={<Building2 className="h-4 w-4" />} label="Campus" value={rows.length} />
        <StatCard icon={<Users className="h-4 w-4" />} label="Pessoas" value={totalPeople} />
      </div>

      <DetailSection title="Por campus" count={rows.length}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {rows.map((ministry) => (
            <Link
              key={ministry.id}
              to="/app/ministerios/$kind/$campusId"
              params={{ kind: k, campusId: ministry.campus.id }}
            >
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight">{ministry.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {ministry.campus.name}
                        {ministry.campus.city && ` · ${ministry.campus.city}`}
                      </p>
                    </div>
                    <Badge variant="outline">{ministry.member_count} pessoas</Badge>
                  </div>
                  {ministry.leaders.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Crown className="h-3 w-3" /> {ministry.leaders.map((l) => l.name).join(", ")}
                    </div>
                  )}
                  {ministry.co_leaders.length > 0 && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Colíder{ministry.co_leaders.length > 1 ? "es" : ""}:{" "}
                      {ministry.co_leaders.map((l) => l.name).join(", ")}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
          {!isLoading && rows.length === 0 && (
            <EmptyState>Sem campus com este ministério.</EmptyState>
          )}
        </div>
      </DetailSection>
    </div>
  );
}
