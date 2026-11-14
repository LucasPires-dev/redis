import { createFileRoute } from "@tanstack/react-router";
import { ExploreList } from "@/components/explore/ExploreList";

// "Explorar" inside the app: what any church opened to everyone. Also the way
// in for accounts not linked to a church yet.
export const Route = createFileRoute("/app/explorar")({
  head: () => ({ meta: [{ title: "Explorar — Redis" }] }),
  component: AppExplore,
});

function AppExplore() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Explorar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Eventos, cursos e células abertos a todos os públicos.
        </p>
      </div>
      <ExploreList />
    </div>
  );
}
