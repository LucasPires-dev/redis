import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { AreaTabs } from "@/components/AreaTabs";
import { RouteError } from "@/components/RouteError";
import { capabilitiesOf, useAuth } from "@/lib/api/auth";
import { useMyRegistrations } from "@/lib/api/payments";

// The Eventos area: one screen for everyone. Personal tabs (upcoming events,
// own registrations) are always there; "Produção" and "Demandas" are added for
// producers and ministry people — a producer registered for an event keeps both.
export const Route = createFileRoute("/app/eventos")({
  head: () => ({ meta: [{ title: "Eventos — Redis" }] }),
  component: EventsArea,
  errorComponent: RouteError,
});

function EventsArea() {
  const { me } = useAuth();
  const caps = capabilitiesOf(me).events;
  const { data: mine } = useMyRegistrations();
  const owing = (mine ?? []).filter((r) => r.payment_status === "pending").length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Eventos</h1>
        <p className="text-sm text-muted-foreground">
          Eventos da sua igreja, suas inscrições e, se for o caso, a produção.
        </p>
      </div>

      <AreaTabs
        tabs={[
          { to: "/app/eventos", label: "Próximos", exact: true },
          {
            to: "/app/eventos/inscricoes",
            label: (
              <>
                Minhas inscrições
                {owing > 0 && (
                  <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-[10px]">
                    {owing}
                  </Badge>
                )}
              </>
            ),
          },
          { to: "/app/eventos/producao", label: "Produção", show: caps.production },
          { to: "/app/eventos/demandas", label: "Demandas", show: caps.production },
        ]}
      />

      <Outlet />
    </div>
  );
}
