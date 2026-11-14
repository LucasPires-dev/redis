import { createFileRoute, redirect } from "@tanstack/react-router";

// Old address of the coordination screen; it's now the "Coordenação" tab of Células.
export const Route = createFileRoute("/app/celulas_/coordination")({
  beforeLoad: () => {
    throw redirect({ to: "/app/celulas/coordenacao", replace: true });
  },
});
