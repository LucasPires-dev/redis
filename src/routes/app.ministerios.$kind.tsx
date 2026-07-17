import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, HeartHandshake, Users, Droplet, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  // Scope campuses shown in the detail view
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

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <Link
        to="/app/ministerios"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Ministérios
      </Link>

      <div className="flex items-center gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-accent-foreground">
          <HeartHandshake className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{MINISTRY_LABEL[k]}</h1>
          <p className="text-sm text-muted-foreground">
            Presente em {rows.length} {rows.length === 1 ? "campus" : "campus"}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard icon={<Users className="h-4 w-4" />} label="Pessoas" value={totalPeople} />
        <StatCard icon={<Droplet className="h-4 w-4" />} label="Batizados" value={totalBaptized} />
        <StatCard icon={<Sparkles className="h-4 w-4" />} label="Em célula" value={totalCell} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Por campus
        </h2>
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
          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground">Sem campus com este ministério.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-accent-foreground">
          {icon}
        </div>
      </CardContent>
    </Card>
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
