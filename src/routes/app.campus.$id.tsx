import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Building2, Users, HeartHandshake, Sparkles, Droplet, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MINISTRY_LABEL, useDB } from "@/lib/mock-store";

export const Route = createFileRoute("/app/campus/$id")({
  head: () => ({ meta: [{ title: "Campus — Redis" }] }),
  component: CampusDetail,
  notFoundComponent: () => (
    <div className="p-10 text-sm text-muted-foreground">Campus não encontrado.</div>
  ),
});

function CampusDetail() {
  const { id } = Route.useParams();
  const db = useDB((d) => d);
  const campus = db.campuses.find((c) => c.id === id);
  if (!campus) throw notFound();

  const people = db.people.filter((p) => p.campusId === campus.id);
  const ministries = db.ministries.filter((m) => m.campusId === campus.id);
  const cells = db.cells.filter((c) => c.campusId === campus.id);
  const events = db.events.filter((e) => e.campusId === campus.id || e.scope === "geral");
  const baptized = people.filter((p) => p.baptized).length;
  const inCell = people.filter((p) => p.cellId).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <Link
        to="/app/campus"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Campus
      </Link>

      <div className="flex items-center gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-accent-foreground">
          <Building2 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{campus.name}</h1>
          <p className="text-sm text-muted-foreground">{campus.city}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={<Users className="h-4 w-4" />} label="Pessoas" value={people.length} />
        <Stat icon={<Droplet className="h-4 w-4" />} label="Batizados" value={baptized} />
        <Stat icon={<Sparkles className="h-4 w-4" />} label="Em célula" value={inCell} />
        <Stat icon={<Calendar className="h-4 w-4" />} label="Eventos" value={events.length} />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Ministérios ({ministries.length})
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {ministries.map((m) => {
            const members = db.people.filter((p) => p.ministryIds.includes(m.id)).length;
            return (
              <Link key={m.id} to="/app/ministerios/$kind" params={{ kind: m.kind }}>
                <Card className="h-full transition-colors hover:border-primary/40">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-accent-foreground">
                        <HeartHandshake className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold">{MINISTRY_LABEL[m.kind]}</div>
                        <div className="text-xs text-muted-foreground">{members} pessoas</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
          {ministries.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum ministério cadastrado.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Células ({cells.length})
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {cells.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.weekday}</div>
                  </div>
                  <Badge variant="outline">{c.memberIds.length} membros</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Próximos eventos
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {events.slice(0, 6).map((e) => (
            <Card key={e.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="text-sm font-semibold">{e.title}</div>
                  <div className="text-xs text-muted-foreground">{e.date}</div>
                </div>
                <Badge variant="secondary" className="capitalize">
                  {e.scope}
                </Badge>
              </CardContent>
            </Card>
          ))}
          {events.length === 0 && (
            <p className="text-sm text-muted-foreground">Sem eventos.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
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
