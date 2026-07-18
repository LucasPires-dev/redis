import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Calendar, Globe, Building2, HeartHandshake, Users, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DetailHeader } from "@/components/detail/DetailHeader";
import { StatCard } from "@/components/detail/StatCard";
import { DetailSection } from "@/components/detail/DetailSection";
import { useDB, MINISTRY_LABEL, ROLE_LABEL } from "@/lib/mock-store";

const scopeIcon = { geral: Globe, campus: Building2, ministerio: HeartHandshake } as const;

export const Route = createFileRoute("/app/eventos/$id")({
  head: () => ({ meta: [{ title: "Evento — Redis" }] }),
  component: EventDetail,
  notFoundComponent: () => (
    <div className="p-10 text-sm text-muted-foreground">Evento não encontrado.</div>
  ),
});

function EventDetail() {
  const { id } = Route.useParams();
  const db = useDB((d) => d);
  const ev = db.events.find((e) => e.id === id);
  if (!ev) throw notFound();

  const Icon = scopeIcon[ev.scope];
  const campus = ev.campusId ? db.campuses.find((c) => c.id === ev.campusId) : null;
  const ministry = ev.ministryId ? db.ministries.find((m) => m.id === ev.ministryId) : null;
  const dateStr = new Date(ev.date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // "Compartilhado com" — quantos campus/ministérios veem
  let sharedCampus = 0;
  let sharedMinistries = 0;
  if (ev.scope === "geral") {
    sharedCampus = db.campuses.length;
    sharedMinistries = db.ministries.length;
  } else if (ev.scope === "campus") {
    sharedCampus = 1;
    sharedMinistries = db.ministries.filter((m) => m.campusId === ev.campusId).length;
  } else {
    sharedCampus = 1;
    sharedMinistries = 1;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <DetailHeader
        backTo="/app/eventos"
        backLabel="Eventos"
        icon={<Icon className="h-6 w-6" />}
        title={ev.title}
        subtitle={
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> {dateStr}
          </span>
        }
        actions={
          <Badge variant="secondary" className="capitalize">
            {ev.scope}
          </Badge>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={<Calendar className="h-4 w-4" />} label="Data" value={dateStr} />
        <StatCard
          icon={<Icon className="h-4 w-4" />}
          label="Escopo"
          value={<span className="capitalize">{ev.scope}</span>}
        />
        <StatCard
          icon={<Building2 className="h-4 w-4" />}
          label="Campus"
          value={campus?.name ?? "Todos"}
        />
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Público estimado"
          value="—"
          hint="a definir"
        />
      </div>

      <DetailSection title="Detalhes">
        <Card>
          <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
            <Info
              label="Local"
              value={
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {campus?.city ?? "A definir"}
                </span>
              }
            />
            <Info label="Organizador" value={ROLE_LABEL[ev.creatorRole]} />
            <Info
              label="Ministério"
              value={
                ministry ? (
                  <Link
                    to="/app/ministerios/$kind"
                    params={{ kind: ministry.kind }}
                    className="hover:text-foreground"
                  >
                    {MINISTRY_LABEL[ministry.kind]}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
          </CardContent>
        </Card>
      </DetailSection>

      <DetailSection title="Compartilhado com">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Card>
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Campus</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{sharedCampus}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                {ev.scope === "geral"
                  ? "Cascata geral: todos os campus recebem."
                  : ev.scope === "campus"
                    ? "Compartilhado com o campus e seus ministérios."
                    : "Escopo ministerial dentro do campus."}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Ministérios</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{sharedMinistries}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Líderes gerais do mesmo tipo também visualizam o evento.
              </p>
            </CardContent>
          </Card>
        </div>
      </DetailSection>

      <DetailSection title="Presenças">
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">
            Registro de presença ficará disponível no dia do evento.
          </CardContent>
        </Card>
      </DetailSection>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}
