import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AreaTabs } from "@/components/AreaTabs";
import { RouteError } from "@/components/RouteError";
import { capabilitiesOf, useAuth } from "@/lib/api/auth";

// The Células area: one screen for everyone. "Minhas células" (the cells the
// person leads or belongs to) is always there; "Coordenação" is added for who
// coordinates cells — a cell leader who coordinates keeps both.
export const Route = createFileRoute("/app/celulas")({
  head: () => ({ meta: [{ title: "Células — Redis" }] }),
  component: CellsArea,
  errorComponent: RouteError,
});

function CellsArea() {
  const { me } = useAuth();
  const caps = capabilitiesOf(me).cells;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Células</h1>
        <p className="text-sm text-muted-foreground">
          Suas células e, se for o caso, a coordenação das células do campus.
        </p>
      </div>

      <AreaTabs
        tabs={[
          { to: "/app/celulas", label: "Minhas células", exact: true },
          { to: "/app/celulas/coordenacao", label: "Coordenação", show: caps.coordinate },
        ]}
      />

      <Outlet />
    </div>
  );
}
