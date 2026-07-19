import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  Building2,
  Users,
  HeartHandshake,
  Sparkles,
  Droplet,
  Calendar,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DetailHeader } from "@/components/detail/DetailHeader";
import { StatCard } from "@/components/detail/StatCard";
import { DetailSection, EmptyState } from "@/components/detail/DetailSection";
import { MINISTRY_LABEL, useDB } from "@/lib/mock-store";

export const Route = createFileRoute("/app/campus_/$id")({
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
      <DetailHeader
        backTo="/app/campus"
        backLabel="Campus"
        icon={<Building2 className="h-6 w-6" />}
        title={campus.name}
        subtitle={campus.city}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={<Users className="h-4 w-4" />} label="Pessoas" value={people.length} />
        <StatCard icon={<Droplet className="h-4 w-4" />} label="Batizados" value={baptized} />
        <StatCard icon={<Sparkles className="h-4 w-4" />} label="Em célula" value={inCell} />
        <StatCard icon={<Calendar className="h-4 w-4" />} label="Eventos" value={events.length} />
      </div>

      <DetailSection title="Ministérios" count={ministries.length}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {ministries.map((m) => {
            const members = db.people.filter((p) => p.ministryIds.includes(m.id)).length;
            return (
              <Link
                key={m.id}
                to="/app/ministerios/$kind/$campusId"
                params={{ kind: m.kind, campusId: campus.id }}
              >
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
          {ministries.length === 0 && <EmptyState>Nenhum ministério cadastrado.</EmptyState>}
        </div>
      </DetailSection>

      <DetailSection title="Células" count={cells.length}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {cells.map((c) => (
            <Link key={c.id} to="/app/celulas/$id" params={{ id: c.id }}>
              <Card className="transition-colors hover:border-primary/40">
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
            </Link>
          ))}
        </div>
      </DetailSection>

      <DetailSection title="Próximos eventos">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {events.slice(0, 6).map((e) => (
            <Link key={e.id} to="/app/eventos/$id" params={{ id: e.id }}>
              <Card className="transition-colors hover:border-primary/40">
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
            </Link>
          ))}
          {events.length === 0 && <EmptyState>Sem eventos.</EmptyState>}
        </div>
      </DetailSection>
    </div>
  );
}
