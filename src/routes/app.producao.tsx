import { createFileRoute, redirect } from "@tanstack/react-router";

// Old address of the production home; it's now the "Produção" tab of Eventos.
export const Route = createFileRoute("/app/producao")({
  beforeLoad: () => {
    throw redirect({ to: "/app/eventos/producao", replace: true });
  },
});
