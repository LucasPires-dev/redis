import { createFileRoute } from "@tanstack/react-router";
import { RouteError } from "@/components/RouteError";
import { StatGridSkeleton } from "@/components/skeletons";
import { Users, Building2, HeartHandshake, Sparkles, Calendar, Droplet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePeople } from "@/lib/api/people";
import { useCampuses, useMinistries, MINISTRY_LABEL, type MinistryKind } from "@/lib/api/ministries";
import { useCells } from "@/lib/api/cells";
import { useEvents, EVENT_TYPE_LABEL } from "@/lib/api/production";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
  errorComponent: RouteError,
});

function Dashboard() {
  const { data: people, isLoading: peopleLoading } = usePeople();
  const { data: campuses } = useCampuses();
  const { data: ministries } = useMinistries();
  const { data: cells } = useCells({ season: "current" });
  const { data: realEvents } = useEvents();

  const personList = people ?? [];
  const events = realEvents ?? [];
  const baptized = personList.filter((p) => p.baptized).length;
  const inCell = (cells ?? []).reduce((sum, c) => sum + c.member_count, 0);

  const kinds = Object.keys(MINISTRY_LABEL) as MinistryKind[];
  const perMinistry = kinds.map((k) => ({
    kind: k,
    count: personList.filter((p) => p.ministries.some((m) => m.kind === k)).length,
  }));

  if (peopleLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Visão geral</h1>
          <p className="text-sm text-muted-foreground">
            Dados filtrados pelo seu perfil e escopo atual.
          </p>
        </div>
        <StatGridSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Visão geral</h1>
        <p className="text-sm text-muted-foreground">
          Dados filtrados pelo seu perfil e escopo atual.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat icon={Users} label="Pessoas" value={personList.length} />
        <Stat
          icon={Droplet}
          label="Batizados"
          value={baptized}
          hint={`${Math.round((baptized / Math.max(personList.length, 1)) * 100)}%`}
        />
        <Stat
          icon={Sparkles}
          label="Em célula"
          value={inCell}
          hint={`${Math.round((inCell / Math.max(personList.length, 1)) * 100)}%`}
        />
        <Stat icon={Calendar} label="Eventos visíveis" value={events.length} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pessoas por ministério</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {perMinistry.map((m) => {
              const pct = personList.length ? (m.count / personList.length) * 100 : 0;
              return (
                <div key={m.kind}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{MINISTRY_LABEL[m.kind]}</span>
                    <span className="font-medium tabular-nums">{m.count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Próximos eventos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.slice(0, 6).map((e) => (
              <div key={e.id} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{e.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(e.starts_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <Badge variant="secondary">
                  {EVENT_TYPE_LABEL[e.event_type]}
                </Badge>
              </div>
            ))}
            {events.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum evento visível para seu perfil.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MiniStat icon={Building2} label="Campus" value={(campuses ?? []).length} />
        <MiniStat icon={HeartHandshake} label="Ministérios" value={(ministries ?? []).length} />
        <MiniStat icon={Sparkles} label="Células ativas" value={(cells ?? []).length} />
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-accent-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold tabular-nums">{value}</div>
      </div>
    </div>
  );
}
