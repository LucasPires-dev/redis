import { createFileRoute } from "@tanstack/react-router";
import { Users, Building2, HeartHandshake, Sparkles, Calendar, Droplet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDB, visibleEvents, visiblePeople, MINISTRY_LABEL } from "@/lib/mock-store";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  const db = useDB((d) => d);
  const people = visiblePeople(db);
  const events = visibleEvents(db);
  const baptized = people.filter((p) => p.baptized).length;
  const inCell = people.filter((p) => !!p.cellId).length;
  const attendanceRecent = db.attendance.filter((a) => people.some((p) => p.id === a.personId));

  const perMinistry = (Object.keys(MINISTRY_LABEL) as (keyof typeof MINISTRY_LABEL)[]).map((k) => ({
    kind: k,
    count: people.filter((p) =>
      p.ministryIds.some((mid) => db.ministries.find((m) => m.id === mid)?.kind === k),
    ).length,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Visão geral</h1>
        <p className="text-sm text-muted-foreground">
          Dados filtrados pelo seu perfil e escopo atual.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat icon={Users} label="Pessoas" value={people.length} hint={`${db.people.length} total`} />
        <Stat icon={Droplet} label="Batizados" value={baptized} hint={`${Math.round((baptized / Math.max(people.length, 1)) * 100)}%`} />
        <Stat icon={Sparkles} label="Em célula" value={inCell} hint={`${Math.round((inCell / Math.max(people.length, 1)) * 100)}%`} />
        <Stat icon={Calendar} label="Eventos visíveis" value={events.length} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pessoas por ministério</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {perMinistry.map((m) => {
              const pct = people.length ? (m.count / people.length) * 100 : 0;
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
                    {new Date(e.date).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <Badge variant="secondary" className="capitalize">
                  {e.scope}
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
        <MiniStat icon={Building2} label="Campus" value={db.campuses.length} />
        <MiniStat icon={HeartHandshake} label="Ministérios" value={db.ministries.length} />
        <MiniStat icon={Sparkles} label="Presenças registradas" value={attendanceRecent.length} />
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
