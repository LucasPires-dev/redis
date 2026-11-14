import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthShell } from "@/components/membership/AuthShell";
import { usePublicCell } from "@/lib/api/explore";

// A cell's public page: only its church, weekday and time. Cells meet in
// homes, so the address and the people stay with the cell's leadership.
export const Route = createFileRoute("/celula/$id")({
  head: () => ({ meta: [{ title: "Célula — Redis" }] }),
  component: PublicCellPage,
});

function PublicCellPage() {
  const { id } = Route.useParams();
  const { data: cell, isLoading, isError } = usePublicCell(id);

  if (isLoading) {
    return (
      <AuthShell>
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </AuthShell>
    );
  }

  if (isError || !cell) {
    return (
      <AuthShell>
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight">Célula não encontrada</h1>
          <p className="text-sm text-muted-foreground">
            Este link não existe ou a célula não está aberta ao público.
          </p>
          <Button asChild variant="outline" className="h-11 w-full">
            <Link to="/explorar">Ver o que está aberto</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="space-y-6" data-testid="public-cell">
        <div className="space-y-2">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Célula aberta
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{cell.church.name}</h1>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" />
            {[cell.meeting_day_display, cell.meeting_time].filter(Boolean).join(", ")}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Os encontros acontecem em casas. O endereço é passado pela liderança da célula a quem
          quiser participar.
        </p>
        <Button asChild variant="outline" className="h-11 w-full">
          <Link to="/explorar">Ver mais do que está aberto</Link>
        </Button>
      </div>
    </AuthShell>
  );
}
