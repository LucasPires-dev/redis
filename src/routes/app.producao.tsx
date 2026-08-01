import { createFileRoute, Link } from "@tanstack/react-router";
import { Clapperboard, AlertCircle, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/api/auth";
import { MINISTRY_LABEL } from "@/lib/api/ministries";
import { useDemands, useEvents } from "@/lib/api/production";

export const Route = createFileRoute("/app/producao")({
  head: () => ({ meta: [{ title: "Produção — Redis" }] }),
  component: ProductionHome,
});

function ProductionHome() {
  const { me } = useAuth();
  const { data: events, isLoading: eventsLoading } = useEvents();
  const { data: received, isLoading: demandsLoading } = useDemands("received");

  const upcoming = (events ?? [])
    .filter((e) => new Date(e.starts_at).getTime() >= Date.now() - 3 * 60 * 60 * 1000)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .slice(0, 5);

  const urgent = (received ?? []).filter((d) => d.priority === "urgent" && d.status === "open");
  const pending = (received ?? []).filter((d) => d.status === "open" || d.status === "in_progress");

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Produção</h1>
        <p className="text-sm text-muted-foreground">
          Olá, {me?.name?.split(" ")[0] ?? "…"}
          {me?.campus ? ` · ${me.campus.name}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/app/producao/demandas">
          <Card className="h-full transition-colors hover:border-primary/40">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xl font-semibold tabular-nums">{urgent.length}</div>
                <div className="text-xs text-muted-foreground">demandas urgentes</div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/app/producao/demandas">
          <Card className="h-full transition-colors hover:border-primary/40">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xl font-semibold tabular-nums">{pending.length}</div>
                <div className="text-xs text-muted-foreground">pendentes</div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Próximos eventos
        </h2>
        <div className="space-y-3">
          {upcoming.map((event) => (
            <Link key={event.id} to="/app/producao/eventos/$id" params={{ id: event.id }}>
              <Card className="transition-colors hover:border-primary/40">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <Clapperboard className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{event.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(event.starts_at).toLocaleString("pt-BR", {
                        weekday: "short",
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {event.campus ? ` · ${event.campus.name}` : ""}
                      {event.ministry_kind ? ` · ${MINISTRY_LABEL[event.ministry_kind]}` : ""}
                    </div>
                  </div>
                  <Badge variant="outline">{EVENT_STATUS_LABEL[event.status]}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
          {!eventsLoading && upcoming.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum evento próximo.</p>
          )}
          {(eventsLoading || demandsLoading) && upcoming.length === 0 && (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          )}
        </div>
      </section>

      <div>
        <Link
          to="/app/producao/demandas"
          className="text-sm font-medium text-primary hover:underline"
        >
          Ver todas as demandas →
        </Link>
      </div>
    </div>
  );
}

const EVENT_STATUS_LABEL: Record<string, string> = {
  planning: "Planejamento",
  confirmed: "Confirmado",
  in_progress: "Em andamento",
  closed: "Encerrado",
};
