import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Building2, Users, HeartHandshake, Sparkles, Droplet, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DetailHeader } from "@/components/detail/DetailHeader";
import { StatCard } from "@/components/detail/StatCard";
import { DetailSection, EmptyState } from "@/components/detail/DetailSection";
import { DetailSkeleton } from "@/components/skeletons";
import { RouteError } from "@/components/RouteError";
import { useCampuses, useMinistries, MINISTRY_LABEL } from "@/lib/api/ministries";
import { usePeople } from "@/lib/api/people";
import { useCells, formatSchedule } from "@/lib/api/cells";
import { useEvents, EVENT_TYPE_LABEL } from "@/lib/api/production";
import { useMe } from "@/lib/api/auth";
import { canManageCampusMembers } from "@/lib/api/membership";
import { CampusMembersSection } from "@/components/membership/CampusMembersSection";

export const Route = createFileRoute("/app/campus_/$id")({
  head: () => ({ meta: [{ title: "Campus — Redis" }] }),
  component: CampusDetail,
  errorComponent: RouteError,
  notFoundComponent: () => (
    <div className="p-10 text-sm text-muted-foreground">Campus não encontrado.</div>
  ),
});

function CampusDetail() {
  const { id } = Route.useParams();
  const { data: me } = useMe();
  const { data: campuses, isLoading } = useCampuses();
  const { data: allPeople } = usePeople();
  const { data: allMinistries } = useMinistries();
  const { data: cells } = useCells({ campusId: id, season: "current" });
  const { data: events } = useEvents(id);

  if (isLoading) return <DetailSkeleton />;

  const campus = (campuses ?? []).find((c) => c.id === id);
  if (!campus) throw notFound();

  const people = (allPeople ?? []).filter((p) => p.campus?.id === id);
  const ministries = (allMinistries ?? []).filter((m) => m.campus.id === id);
  const cellList = cells ?? [];
  const eventList = events ?? [];
  const baptized = people.filter((p) => p.baptized).length;
  const inCell = cellList.reduce((sum, c) => sum + c.participant_count, 0);

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
        <StatCard
          icon={<Calendar className="h-4 w-4" />}
          label="Eventos"
          value={eventList.length}
        />
      </div>

      {canManageCampusMembers(me, campus.id) && (
        <CampusMembersSection campusId={campus.id} campusName={campus.name} />
      )}

      <DetailSection title="Ministérios" count={ministries.length}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {ministries.map((m) => (
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
                      <div className="text-xs text-muted-foreground">{m.member_count} pessoas</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {ministries.length === 0 && <EmptyState>Nenhum ministério cadastrado.</EmptyState>}
        </div>
      </DetailSection>

      <DetailSection title="Células" count={cellList.length}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {cellList.map((c) => (
            <Link key={c.id} to="/app/celulas/$id" params={{ id: c.id }}>
              <Card className="transition-colors hover:border-primary/40">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">{c.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatSchedule(c.meeting_day, c.meeting_time)}
                      </div>
                    </div>
                    <Badge variant="outline">{c.participant_count} membros</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </DetailSection>

      <DetailSection title="Próximos eventos">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {eventList.slice(0, 6).map((e) => (
            <Link key={e.id} to="/app/eventos/$id/producao" params={{ id: e.id }}>
              <Card className="transition-colors hover:border-primary/40">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="text-sm font-semibold">{e.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(e.starts_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  <Badge variant="secondary">{EVENT_TYPE_LABEL[e.event_type]}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
          {eventList.length === 0 && <EmptyState>Sem eventos.</EmptyState>}
        </div>
      </DetailSection>
    </div>
  );
}
