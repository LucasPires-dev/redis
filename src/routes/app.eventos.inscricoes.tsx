import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, MapPin, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/detail/DetailSection";
import { TicketButton } from "@/components/events/TicketDialog";
import { CardGridSkeleton } from "@/components/skeletons";
import { EVENT_TYPE_LABEL, type EventType } from "@/lib/api/production";
import {
  formatTicketPrice,
  PAYMENT_STATUS_LABEL,
  useMyRegistrations,
  type EventRegistration,
} from "@/lib/api/payments";

// "Minhas inscrições": the person's own event registrations, with the payment
// link while one is pending. Always there — whatever else the person does.
export const Route = createFileRoute("/app/eventos/inscricoes")({
  head: () => ({ meta: [{ title: "Minhas inscrições — Redis" }] }),
  component: MyRegistrations,
});

const STATUS_VARIANT: Record<
  EventRegistration["payment_status"],
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "destructive",
  confirmed: "default",
  cancelled: "outline",
  refunded: "outline",
};

function MyRegistrations() {
  const { data: registrations, isLoading } = useMyRegistrations();

  if (isLoading) return <CardGridSkeleton />;
  if (!registrations?.length) {
    return (
      <EmptyState>
        Você ainda não se inscreveu em nenhum evento. Veja os{" "}
        <Link to="/app/eventos" className="text-primary hover:underline">
          próximos eventos
        </Link>
        .
      </EmptyState>
    );
  }

  // Upcoming first (soonest on top), then past ones (most recent on top).
  const now = Date.now();
  const time = (r: EventRegistration) => new Date(r.event.starts_at).getTime();
  const sorted = registrations.slice().sort((a, b) => {
    const ua = time(a) >= now;
    const ub = time(b) >= now;
    if (ua !== ub) return ua ? -1 : 1;
    return ua ? time(a) - time(b) : time(b) - time(a);
  });

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sorted.map((r) => (
        <Card key={r.id} data-testid="my-registration" className="h-full">
          <CardContent className="flex h-full flex-col gap-3 p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {EVENT_TYPE_LABEL[r.event.event_type as EventType] ?? r.event.event_type}
                </p>
                <h3 className="text-lg font-semibold tracking-tight">{r.event.title}</h3>
              </div>
              <Badge variant={STATUS_VARIANT[r.payment_status]} className="shrink-0">
                {PAYMENT_STATUS_LABEL[r.payment_status]}
              </Badge>
            </div>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                {new Date(r.event.starts_at).toLocaleString("pt-BR", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> {r.event.campus_name ?? "Todos os campi"}
              </p>
              <p className="flex items-center gap-2">
                <Ticket className="h-4 w-4" /> {formatTicketPrice(r.amount_cents)}
              </p>
            </div>
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
              <TicketButton registration={r} />
              {r.payment_status === "pending" && r.payment_url && (
                <Button asChild size="sm">
                  <a href={r.payment_url} target="_blank" rel="noopener noreferrer">
                    Pagar
                  </a>
                </Button>
              )}
              <Link
                to="/app/eventos/$id"
                params={{ id: r.event.id }}
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Ver evento <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
