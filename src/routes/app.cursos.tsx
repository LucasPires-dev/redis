import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { AreaTabs } from "@/components/AreaTabs";
import { RouteError } from "@/components/RouteError";
import { capabilitiesOf, useAuth } from "@/lib/api/auth";
import { isOpenPayment, useMyEnrollments } from "@/lib/api/courses";

// The Cursos area: one screen for everyone. Personal tabs (open classes, own
// enrollments) are always there; "Minhas turmas" and "Gestão" are added for
// teachers and coordinators — a coordinator taking a course keeps both.
export const Route = createFileRoute("/app/cursos")({
  head: () => ({ meta: [{ title: "Cursos — Redis" }] }),
  component: CoursesArea,
  errorComponent: RouteError,
});

function CoursesArea() {
  const { me } = useAuth();
  const caps = capabilitiesOf(me).courses;
  const { data: mine } = useMyEnrollments();
  const owing = (mine ?? []).filter((e) => isOpenPayment(e.payment_status)).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cursos</h1>
        <p className="text-sm text-muted-foreground">
          Inscreva-se nas turmas abertas, acompanhe suas matrículas e, se for o caso, suas turmas e
          cursos.
        </p>
      </div>

      <AreaTabs
        tabs={[
          { to: "/app/cursos", label: "Disponíveis", exact: true },
          {
            to: "/app/cursos/matriculas",
            label: (
              <>
                Minhas matrículas
                {owing > 0 && (
                  <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-[10px]">
                    {owing}
                  </Badge>
                )}
              </>
            ),
          },
          { to: "/app/cursos/turmas", label: "Minhas turmas", show: caps.teach },
          { to: "/app/cursos/gestao", label: "Gestão", show: caps.coordinate },
          { to: "/app/cursos/relatorios", label: "Relatórios", show: caps.coordinate },
        ]}
      />

      <Outlet />
    </div>
  );
}
