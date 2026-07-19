import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  HeartHandshake,
  Users,
  ShieldAlert,
  Mail,
  Crown,
  UserRound,
  ClipboardList,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DetailHeader } from "@/components/detail/DetailHeader";
import { StatCard } from "@/components/detail/StatCard";
import { DetailSection, EmptyState } from "@/components/detail/DetailSection";
import { RoleBadge } from "@/components/detail/RoleBadge";
import { deriveRoleLabel, useAuth } from "@/lib/api/auth";
import {
  MINISTRY_LABEL,
  useMinistries,
  useMinistryGeneralLeaderships,
  useMinistryMembers,
  useMinistryTeams,
  type MinistryKind,
} from "@/lib/api/ministries";
import type { PersonMini } from "@/lib/api/people";
import { buildRoster } from "@/lib/roster";

export const Route = createFileRoute("/app/ministerios_/$kind_/$campusId")({
  head: ({ params }) => ({
    meta: [{ title: `${MINISTRY_LABEL[params.kind as MinistryKind] ?? "Ministério"} — Redis` }],
  }),
  component: MinistryAtCampusDetail,
  notFoundComponent: () => (
    <div className="p-10 text-sm text-muted-foreground">
      Ministério não encontrado neste campus.
    </div>
  ),
});

function initials(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("");
}

function MinistryAtCampusDetail() {
  const { kind, campusId } = Route.useParams();
  if (!(kind in MINISTRY_LABEL)) throw notFound();
  const k = kind as MinistryKind;

  const { me } = useAuth();
  const { data: ministries, isLoading } = useMinistries();
  const { data: generalLeaderships } = useMinistryGeneralLeaderships();

  const ministry = (ministries ?? []).find((m) => m.kind === k && m.campus.id === campusId);
  const { data: members } = useMinistryMembers(ministry?.id);
  const { data: teams } = useMinistryTeams(ministry?.id);

  if (!isLoading && !ministry) throw notFound();
  if (!ministry) {
    return <div className="p-10 text-sm text-muted-foreground">Carregando…</div>;
  }

  const generalLeaders = generalLeaderships?.find((g) => g.kind === k)?.leaders ?? [];
  const generalLeaderIds = new Set(generalLeaders.map((l) => l.id));
  const isGeneralLeaderHere = ministry.leaders.some((l) => generalLeaderIds.has(l.id));

  // The old mock-only "manually pick a role to preview" toggle is gone — scope now
  // comes straight from the logged-in person's real leadership relations.
  const allowed =
    !!me &&
    (me.is_manager ||
      me.general_led_kinds.includes(k) ||
      me.led_ministries.some((m) => m.id === ministry.id));

  // WhatsApp-style roster: leaders first, then co-leaders, then plain members —
  // includes leaders/co-leaders even when they aren't in the `members` list.
  const roster = buildRoster(ministry.leaders, ministry.co_leaders, members ?? []);

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
        <span className="text-foreground">{ministry.campus.name}</span>
      </div>

      <DetailHeader
        backTo="/app/ministerios/$kind"
        backLabel={MINISTRY_LABEL[k]}
        icon={<HeartHandshake className="h-6 w-6" />}
        title={`${ministry.name} · ${ministry.campus.name}`}
        subtitle={ministry.campus.city}
        actions={
          ministry.leaders.length > 0 && (
            <Badge variant="outline" className="gap-1.5">
              <Crown className="h-3 w-3" /> {ministry.leaders.map((l) => l.name).join(", ")}
            </Badge>
          )
        }
      />

      {!allowed ? (
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <div>
              Seu perfil atual (
              <span className="font-medium text-foreground">{deriveRoleLabel(me)}</span>) não tem
              escopo para ver os dados deste ministério neste campus.
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard icon={<Users className="h-4 w-4" />} label="Membros" value={roster.length} />
          </div>

          <DetailSection title="Liderança">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <LeaderCard
                label="Líder geral do ministério"
                hint={`Responde por ${MINISTRY_LABEL[k]} em todos os campus.`}
                people={generalLeaders}
              />
              <LeaderCard
                label={
                  ministry.leaders.length > 1 || ministry.co_leaders.length > 0
                    ? "Líderes locais"
                    : "Líder local"
                }
                hint={
                  isGeneralLeaderHere
                    ? "Também é o líder geral do ministério."
                    : `Responde${ministry.leaders.length + ministry.co_leaders.length > 1 ? "m" : ""} por ${MINISTRY_LABEL[k]} em ${ministry.campus.name}.`
                }
                people={[...ministry.leaders, ...ministry.co_leaders]}
              />
            </div>
          </DetailSection>

          <DetailSection title="Membros" count={roster.length}>
            {roster.length === 0 ? (
              <EmptyState>Nenhum membro neste ministério, neste campus.</EmptyState>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {roster.map(({ person: p, role }) => (
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
                        <RoleBadge role={role} />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </DetailSection>

          <DetailSection title="Equipes" count={teams?.length ?? 0}>
            {!teams || teams.length === 0 ? (
              <EmptyState>Nenhuma equipe cadastrada neste ministério.</EmptyState>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {teams.map((team) => (
                  <Link
                    key={team.id}
                    to="/app/ministerios/$kind/$campusId/equipes/$teamId"
                    params={{ kind: k, campusId, teamId: team.id }}
                    className="group"
                  >
                    <Card className="h-full transition-colors group-hover:border-primary/40">
                      <CardContent className="flex items-center gap-3 p-4">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                          <ClipboardList className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{team.name}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {team.member_count} membro{team.member_count === 1 ? "" : "s"}
                          </div>
                        </div>
                        {[...team.leaders, ...team.co_leaders].length > 0 && (
                          <Badge variant="outline" className="gap-1 shrink-0">
                            <Crown className="h-3 w-3" />{" "}
                            {[...team.leaders, ...team.co_leaders].map((l) => l.name).join(", ")}
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </DetailSection>
        </>
      )}
    </div>
  );
}

function LeaderCard({
  label,
  hint,
  people,
}: {
  label: string;
  hint: string;
  people: PersonMini[];
}) {
  const list = people;
  return (
    <Card className="group">
      <CardContent className="flex items-start gap-3 p-4">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback className="bg-accent text-accent-foreground">
            {list.length === 1 ? initials(list[0].name) : <UserRound className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          {list.length === 0 ? (
            <div className="text-sm text-muted-foreground">Sem líder definido</div>
          ) : (
            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
              {list.map((p) => (
                <Link
                  key={p.id}
                  to="/app/pessoas/$id"
                  params={{ id: p.id }}
                  className="truncate text-sm font-medium hover:text-primary"
                >
                  {p.name}
                </Link>
              ))}
            </div>
          )}
          <div className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</div>
        </div>
        {list.length === 1 && (
          <a
            href={`mailto:${list[0].email}`}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
            title={`Enviar email para ${list[0].name}`}
          >
            <Mail className="h-4 w-4" />
          </a>
        )}
      </CardContent>
    </Card>
  );
}
