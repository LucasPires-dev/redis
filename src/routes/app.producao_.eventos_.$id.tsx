import { createFileRoute, redirect } from "@tanstack/react-router";

// Old address of an event's production panel; it now lives under the event.
export const Route = createFileRoute("/app/producao_/eventos_/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/app/eventos/$id/producao", params: { id: params.id }, replace: true });
  },
});
