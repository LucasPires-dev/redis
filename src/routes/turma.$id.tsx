import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, Clock, GraduationCap, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthShell } from "@/components/membership/AuthShell";
import { hasAccessToken } from "@/lib/api/client";
import { usePublicClass } from "@/lib/api/explore";
import { WEEKDAY_LABEL } from "@/lib/api/courses";
import { formatTicketPrice } from "@/lib/api/payments";

// A course class's public page, to share anywhere: what, when, where, how much
// and the way in (sign up or log in, then the open classes to enroll).
export const Route = createFileRoute("/turma/$id")({
  head: () => ({ meta: [{ title: "Curso — Redis" }] }),
  component: PublicClassPage,
});

const dateBR = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR");

function PublicClassPage() {
  const { id } = Route.useParams();
  const { data: item, isLoading, isError } = usePublicClass(id);
  // The token lives in localStorage: only known after hydration.
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => setSignedIn(hasAccessToken()), []);

  if (isLoading) {
    return (
      <AuthShell>
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      </AuthShell>
    );
  }

  if (isError || !item) {
    return (
      <AuthShell>
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight">Turma não encontrada</h1>
          <p className="text-sm text-muted-foreground">
            Este link não existe ou a turma não está mais com inscrições abertas ao público.
          </p>
          <Button asChild variant="outline" className="h-11 w-full">
            <Link to="/explorar">Ver o que está aberto</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  const when = [item.weekday ? WEEKDAY_LABEL[item.weekday] : null, item.start_time]
    .filter(Boolean)
    .join(", ");
  const period = [item.start_date, item.end_date].filter(Boolean).map((d) => dateBR(d!));

  return (
    <AuthShell>
      <div className="space-y-6" data-testid="public-class">
        <div className="space-y-2">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <GraduationCap className="h-3.5 w-3.5" /> Inscrições abertas
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{item.course_name}</h1>
          <p className="text-sm text-muted-foreground">{item.name}</p>
          {when && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" /> {when}
            </p>
          )}
          {period.length > 0 && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4 shrink-0" /> {period.join(" a ")}
            </p>
          )}
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            {[item.church.name, item.campus?.name, item.campus?.city].filter(Boolean).join(" · ")}
          </p>
        </div>

        {(item.course_description || item.description) && (
          <p className="whitespace-pre-wrap text-sm">
            {item.description || item.course_description}
          </p>
        )}

        <div className="space-y-1 rounded-lg border p-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm text-muted-foreground">Inscrição</span>
            <span className="text-lg font-semibold">
              {formatTicketPrice(item.base_price_cents)}
            </span>
          </div>
          {item.enrollment_deadline && (
            <p className="text-xs text-muted-foreground">
              Inscrições até {dateBR(item.enrollment_deadline)}
            </p>
          )}
        </div>

        {signedIn ? (
          <Button asChild className="h-11 w-full">
            <Link to="/app/cursos">Fazer inscrição</Link>
          </Button>
        ) : (
          <div className="space-y-2">
            <Button asChild className="h-11 w-full">
              <Link to="/cadastro" search={{ turma: id }}>
                Criar conta e me inscrever
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 w-full">
              <Link to="/login" search={{ redirect: "/app/cursos" }}>
                Já tenho conta
              </Link>
            </Button>
          </div>
        )}
      </div>
    </AuthShell>
  );
}
