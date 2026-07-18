import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { HeartHandshake, Users, Droplet, Sparkles, Building2, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DetailHeader } from "@/components/detail/DetailHeader";
import { StatCard } from "@/components/detail/StatCard";
import { DetailSection, EmptyState } from "@/components/detail/DetailSection";
import { MINISTRY_LABEL, useDB, type MinistryKind } from "@/lib/mock-store";

export const Route = createFileRoute("/app/ministerios/$kind")({
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
  const db = useDB((d) => d);
  const role = db.currentRole;

  if (!(kind in MINISTRY_LABEL)) throw notFound();
  const k = kind as MinistryKind;

  const scopedCampuses = db.campuses.filter((c) => {
    if (role === "lider_campus" || role === "lider_ministerio_campus")
      return c.id === db.currentCampusId;
    return true;
  });

  const rows = scopedCampuses
    .map((campus) => {
      const ministry = db.ministries.find((m) => m.campusId === campus.id && m.kind === k);
      if (!ministry) return null;
      const members = db.people.filter((p) => p.ministryIds.includes(ministry.id));
      const baptized = members.filter((p) => p.baptized).length;
      const inCell = members.filter((p) => p.cellId).length;
      return { campus, ministry, members, baptized, inCell };
    })
    .filter(Boolean) as Array<{
    campus: (typeof db.campuses)[number];
    ministry: (typeof db.ministries)[number];
    members: typeof db.people;
    baptized: number;
    inCell: number;
  }>;

  const totalPeople = rows.reduce((s, r) => s + r.members.length, 0);
  const totalBaptized = rows.reduce((s, r) => s + r.baptized, 0);
  const totalCell = rows.reduce((s, r) => s + r.inCell, 0);

  const ministryEvents = db.events.filter(
    (e) =>
      e.scope === "ministerio" &&
      db.ministries.find((m) => m.id === e.ministryId)?.kind === k &&
      rows.some((r) => r.ministry.campusId === e.campusId),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <DetailHeader
        backTo="/app/ministerios"
        backLabel="Ministérios"
        icon={<HeartHandshake className="h-6 w-6" />}
        title={MINISTRY_LABEL[k]}
        subtitle={`Presente em ${rows.length} campus.`}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={<Building2 className="h-4 w-4" />} label="Campus" value={rows.length} />
        <StatCard icon={<Users className="h-4 w-4" />} label="Pessoas" value={totalPeople} />
        <StatCard icon={<Droplet className="h-4 w-4" />} label="Batizados" value={totalBaptized} />
        <StatCard icon={<Sparkles className="h-4 w-4" />} label="Em célula" value={totalCell} />
      </div>

      <DetailSection title="Por campus" count={rows.length}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {rows.map(({ campus, members, baptized, inCell }) => (
            <Link key={campus.id} to="/app/campus/$id" params={{ id: campus.id }}>
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight">{campus.name}</h3>
                      <p className="text-sm text-muted-foreground">{campus.city}</p>
                    </div>
                    <Badge variant="outline">{members.length} pessoas</Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4 text-center">
                    <Metric label="Pessoas" value={members.length} />
                    <Metric label="Batizados" value={baptized} />
                    <Metric label="Em célula" value={inCell} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {rows.length === 0 && <EmptyState>Sem campus com este ministério.</EmptyState>}
        </div>
      </DetailSection>

      <DetailSection title="Próximos eventos ministeriais" count={ministryEvents.length}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {ministryEvents.map((e) => {
            const campus = db.campuses.find((c) => c.id === e.campusId);
            return (
              <Link key={e.id} to="/app/eventos/$id" params={{ id: e.id }}>
                <Card className="transition-colors hover:border-primary/40">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <div className="text-sm font-semibold">{e.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {e.date} · {campus?.name}
                      </div>
                    </div>
                    <Badge variant="secondary" className="gap-1">
                      <Calendar className="h-3 w-3" />
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
          {ministryEvents.length === 0 && <EmptyState>Nenhum evento marcado.</EmptyState>}
        </div>
      </DetailSection>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
