import { createFileRoute, redirect } from "@tanstack/react-router";

// Old address of the member view; kept so links and bookmarks still work.
// Open classes now live at /app/cursos and own enrollments at /app/cursos/matriculas.
export const Route = createFileRoute("/app/meus-cursos")({
  beforeLoad: () => {
    throw redirect({ to: "/app/cursos/matriculas", replace: true });
  },
});
