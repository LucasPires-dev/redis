import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, Clapperboard, Ticket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateEventDialog } from "@/components/events/CreateEventDialog";
import { CardGridSkeleton } from "@/components/skeletons";
import { EVENT_STATUS_LABEL, EVENT_TYPE_LABEL, useEvents } from "@/lib/api/production";
import { MINISTRY_LABEL } from "@/lib/api/ministries";
import { formatTicketPrice } from "@/lib/api/payments";

// "Próximos": every event the person can see. "Novo evento" shows only for
// those who may create one (and offers only what they may create).
export const Route = createFileRoute("/app/eventos/")({
  component: EventsPage,
});

function EventsPage() {
  const { data: events, isLoading } = useEvents();

  const sorted = (events ?? [])
    .slice()
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Cultos, conferências, treinamentos e mais — abra um evento para se inscrever.
        </p>
        <CreateEventDialog />
      </div>

      {isLoading && <CardGridSkeleton />}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sorted.map((e) => (
          <Link key={e.id} to="/app/eventos/$id" params={{ id: e.id }}>
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <Clapperboard className="h-5 w-5" />
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(e.starts_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </Badge>
                </div>
                <h3 className="mt-4 text-lg font-semibold tracking-tight">{e.title}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{EVENT_TYPE_LABEL[e.event_type]}</Badge>
                  <Badge variant="outline">{EVENT_STATUS_LABEL[e.status] ?? e.status}</Badge>
                  {e.campus && <span>{e.campus.name}</span>}
                  {e.ministry_kind && <span>· {MINISTRY_LABEL[e.ministry_kind]}</span>}
                </div>
                {e.ticket_config && (
                  <div className="mt-3 flex items-center gap-1.5 text-sm font-medium">
                    <Ticket className="h-4 w-4 text-muted-foreground" />
                    {formatTicketPrice(e.ticket_config.price_cents)}
                    {e.ticket_config.max_capacity != null && (
                      <span className="font-normal text-muted-foreground">
                        · {e.ticket_config.max_capacity} vagas
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
        {!isLoading && sorted.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum evento visível para seu perfil.</p>
        )}
      </div>
    </div>
  );
}
