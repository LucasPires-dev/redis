import { createFileRoute, redirect } from "@tanstack/react-router";

// Old address of the demands page; it's now the "Demandas" tab of Eventos.
export const Route = createFileRoute("/app/producao_/demandas")({
  beforeLoad: () => {
    throw redirect({ to: "/app/eventos/demandas", replace: true });
  },
});
