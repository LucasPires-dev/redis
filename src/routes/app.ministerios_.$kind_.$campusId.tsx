import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  HeartHandshake,
  Users,
  Droplet,
  Sparkles,
  Calendar,
  ShieldAlert,
  Mail,
  Crown,
  UserRound,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DetailHeader } from "@/components/detail/DetailHeader";
import { StatCard } from "@/components/detail/StatCard";
import { DetailSection, EmptyState } from "@/components/detail/DetailSection";
import { MINISTRY_LABEL, ROLE_LABEL, canAccessMinistryAtCampus, useDB, type MinistryKind } from "@/lib/mock-store";

export const Route = createFileRoute("/app/ministerios_/$kind_/$campusId")({
  head: ({ params }) => ({
    meta: [{ title: `${MINISTRY_LABEL[params.kind as MinistryKind] ?? "Ministério"} — Redis` }],
  }),
  component: MinistryAtCampusDetail,
  notFoundComponent: () => (
    <div className="p-10 text-sm text-muted-foreground">Ministério não encontrado neste campus.</div>
  ),
});

function initials(name: string) {
  return name.split(" ").map((s) => s[0]).slice(0, 2).join("");
}

function MinistryAtCampusDetail() {
  const { kind, campusId } = Route.useParams();
  const db = useDB((d) => d);

  if (!(kind in MINISTRY_LABEL)) throw notFound();
  const k = kind as MinistryKind;

  const campus = db.campuses.find((c) => c.id === campusId);
  const ministry = db.ministries.find((m) => m.campusId === campusId && m.kind === k);
  if (!campus || !ministry) throw notFound();

  const allowed = canAccessMinistryAtCampus(db, k, campusId);

  const members = db.people.filter((p) => p.ministryIds.includes(ministry.id));
  const baptized = members.filter((p) => p.baptized).length;
  const inCell = members.filter((p) => p.cellId).length;
  const localLeader = db.people.find((p) => p.id === ministry.leaderId);
  const generalLeaderId = db.ministryGeneralLeaders[k];
  const generalLeader = db.people.find((p) => p.id === generalLeaderId);
  const isGeneralLeaderHere = generalLeaderId === ministry.leaderId;

  const events = db.events.filter(
    (e) => e.scope === "ministerio" && e.ministryId === ministry.id && e.campusId === campusId,
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <Link to="/app/ministerios" className="hover:text-foreground">
          Ministérios
        </Link>
        <span>/</span>
        <Link to="/app/ministerios/$kind" params={{ kind: k }} className="hover:text-foreground">
          {MINISTRY_LABEL[k]}
        </Link>
        <span>/</span>
        <span className="text-foreground">{campus.name}</span>
      </div>

      <DetailHeader
        backTo="/app/ministerios/$kind"
        backLabel={MINISTRY_LABEL[k]}
        icon={<HeartHandshake className="h-6 w-6" />}
        title={`${MINISTRY_LABEL[k]} · ${campus.name}`}
        subtitle={campus.city}
        actions={
          localLeader && (
            <Badge variant="outline" className="gap-1.5">
              <Crown className="h-3 w-3" /> {localLeader.name}
            </Badge>
          )
        }
      />

      {!allowed ? (
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <div>
              Seu perfil atual (<span className="font-medium text-foreground">{ROLE_LABEL[db.currentRole]}</span>)
              não tem escopo para ver os dados deste ministério neste campus. Troque o perfil de demonstração
              acima para visualizar.
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard icon={<Users className="h-4 w-4" />} label="Membros" value={members.length} />
            <StatCard icon={<Droplet className="h-4 w-4" />} label="Batizados" value={baptized} />
            <StatCard icon={<Sparkles className="h-4 w-4" />} label="Em célula" value={inCell} />
            <StatCard icon={<Calendar className="h-4 w-4" />} label="Eventos" value={events.length} />
          </div>

          <DetailSection title="Liderança">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <LeaderCard
                label="Líder geral do ministério"
                hint={`Responde por ${MINISTRY_LABEL[k]} em todos os campus.`}
                person={generalLeader}
              />
              <LeaderCard
                label="Líder local"
                hint={
                  isGeneralLeaderHere
                    ? "Também é o líder geral do ministério."
                    : `Responde por ${MINISTRY_LABEL[k]} em ${campus.name}.`
                }
                person={localLeader}
              />
            </div>
          </DetailSection>

          <DetailSection title="Membros" count={members.length}>
            {members.length === 0 ? (
              <EmptyState>Nenhum membro neste ministério, neste campus.</EmptyState>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {members.map((p) => (
                  <Link key={p.id} to="/app/pessoas/$id" params={{ id: p.id }} className="group">
                    <Card className="h-full transition-colors group-hover:border-primary/40">
                      <CardContent className="flex items-center gap-3 p-4">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-xs text-primary">
                            {initials(p.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{p.name}</div>
                          <div className="truncate text-xs text-muted-foreground">{p.email}</div>
                        </div>
                        {p.id === ministry.leaderId && (
                          <Badge variant="outline" className="gap-1 shrink-0">
                            <Crown className="h-3 w-3" /> Líder
                          </Badge>
                        )}
                        {p.baptized && (
                          <Badge className="gap-1 shrink-0 bg-primary/10 text-primary hover:bg-primary/10">
                            <Droplet className="h-3 w-3" />
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </DetailSection>

          <DetailSection title="Eventos deste ministério neste campus" count={events.length}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {events.map((e) => (
                <Link key={e.id} to="/app/eventos/$id" params={{ id: e.id }}>
                  <Card className="transition-colors hover:border-primary/40">
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <div className="text-sm font-semibold">{e.title}</div>
                        <div className="text-xs text-muted-foreground">{e.date}</div>
                      </div>
                      <Badge variant="secondary" className="gap-1">
                        <Calendar className="h-3 w-3" />
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              {events.length === 0 && <EmptyState>Nenhum evento marcado.</EmptyState>}
            </div>
          </DetailSection>
        </>
      )}
    </div>
  );
}

function LeaderCard({
  label,
  hint,
  person,
}: {
  label: string;
  hint: string;
  person?: { id: string; name: string; email: string };
}) {
  return (
    <Card className="group">
      <CardContent className="flex items-center gap-3 p-4">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-accent text-accent-foreground">
            {person ? initials(person.name) : <UserRound className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          {person ? (
            <Link
              to="/app/pessoas/$id"
              params={{ id: person.id }}
              className="truncate text-sm font-medium hover:text-primary"
            >
              {person.name}
            </Link>
          ) : (
            <div className="text-sm text-muted-foreground">Sem líder definido</div>
          )}
          <div className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</div>
        </div>
        {person && (
          <a
            href={`mailto:${person.email}`}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
            title={`Enviar email para ${person.name}`}
          >
            <Mail className="h-4 w-4" />
          </a>
        )}
      </CardContent>
    </Card>
  );
}
