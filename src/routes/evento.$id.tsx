import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, MapPin, Ticket, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthShell } from "@/components/membership/AuthShell";
import { hasAccessToken } from "@/lib/api/client";
import { formatTicketPrice, usePublicEvent } from "@/lib/api/payments";
import { formatDateTime } from "@/lib/utils";

// The public link of an event, to share anywhere: what it is, when, where and
// how much — and the way in (sign up or log in, then straight to registration).
export const Route = createFileRoute("/evento/$id")({
  head: () => ({ meta: [{ title: "Evento — Redis" }] }),
  component: PublicEventPage,
});

function PublicEventPage() {
  const { id } = Route.useParams();
  const { data: event, isLoading, isError } = usePublicEvent(id);
  // The token lives in localStorage: only known after hydration.
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => setSignedIn(hasAccessToken()), []);

  const appPath = `/app/eventos/${id}`;

  if (isLoading) {
    return (
      <AuthShell>
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </AuthShell>
    );
  }

  if (isError || !event) {
    return (
      <AuthShell>
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight">Evento não encontrado</h1>
          <p className="text-sm text-muted-foreground">
            Este link não existe ou não está mais aberto ao público. Peça um novo link à
            organização.
          </p>
        </div>
      </AuthShell>
    );
  }

  const { ticket } = event;
  const prices = ticket.types.length
    ? ticket.types.map((t) => t.price_cents)
    : [ticket.price_cents];
  const minPrice = Math.min(...prices);
  const priceText =
    prices.length > 1 && Math.max(...prices) !== minPrice
      ? `A partir de ${formatTicketPrice(minPrice)}`
      : formatTicketPrice(minPrice);

  return (
    <AuthShell>
      <div className="space-y-6" data-testid="public-event">
        <div className="space-y-2">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <Ticket className="h-3.5 w-3.5" /> Inscrições{" "}
            {event.registration_open ? "abertas" : "encerradas"}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{event.title}</h1>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4 shrink-0" /> {formatDateTime(event.starts_at)}
          </p>
          {event.campus && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" /> {event.campus.name}
              {event.campus.city && ` · ${event.campus.city}`}
            </p>
          )}
        </div>

        {event.description && <p className="whitespace-pre-wrap text-sm">{event.description}</p>}

        <div className="space-y-2 rounded-lg border p-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm text-muted-foreground">Ingresso</span>
            <span className="text-lg font-semibold">{priceText}</span>
          </div>
          {ticket.types.length > 0 && (
            <ul className="space-y-1 text-sm">
              {ticket.types.map((t) => (
                <li key={t.id} className="flex justify-between gap-2">
                  <span>
                    {t.name}
                    {t.sold_out && <span className="text-muted-foreground"> · esgotado</span>}
                  </span>
                  <span className="font-medium">{formatTicketPrice(t.price_cents)}</span>
                </li>
              ))}
            </ul>
          )}
          {ticket.description && (
            <p className="text-sm text-muted-foreground">{ticket.description}</p>
          )}
          {ticket.max_companions > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> Você pode levar até {ticket.max_companions}{" "}
              acompanhante(s)
            </p>
          )}
          {ticket.registration_deadline && (
            <p className="text-xs text-muted-foreground">
              Inscrições até {formatDateTime(ticket.registration_deadline)}
            </p>
          )}
        </div>

        {event.registration_open &&
          (signedIn ? (
            <Button asChild className="h-11 w-full">
              <Link to="/app/eventos/$id" params={{ id }}>
                {event.sold_out ? "Entrar na lista de espera" : "Fazer inscrição"}
              </Link>
            </Button>
          ) : (
            <div className="space-y-2">
              {event.sold_out && (
                <p className="text-center text-sm text-muted-foreground">
                  Vagas esgotadas — crie a conta para entrar na lista de espera.
                </p>
              )}
              <Button asChild className="h-11 w-full">
                <Link to="/cadastro" search={{ evento: id }}>
                  Criar conta e me inscrever
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 w-full">
                <Link to="/login" search={{ redirect: appPath }}>
                  Já tenho conta
                </Link>
              </Button>
            </div>
          ))}
      </div>
    </AuthShell>
  );
}
