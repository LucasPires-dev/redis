import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ClipboardList, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { DetailHeader } from "@/components/detail/DetailHeader";
import { DetailSection, EmptyState } from "@/components/detail/DetailSection";
import { RoleBadge } from "@/components/detail/RoleBadge";
import { StatCard } from "@/components/detail/StatCard";
import { ApiError } from "@/lib/api/client";
import { MINISTRY_LABEL, useTeam, useTeamMembers, type MinistryKind } from "@/lib/api/ministries";
import type { PersonMini } from "@/lib/api/people";
import { buildRoster } from "@/lib/roster";

export const Route = createFileRoute("/app/ministerios_/$kind_/$campusId_/equipes/$teamId")({
  component: TeamDetail,
  notFoundComponent: () => (
    <div className="p-10 text-sm text-muted-foreground">Equipe não encontrada.</div>
  ),
});

function initials(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("");
}

function TeamDetail() {
  const { kind, campusId, teamId } = Route.useParams();
  const k = kind as MinistryKind;

  const { data: team, isLoading, error } = useTeam(teamId);
  const { data: members } = useTeamMembers(teamId);

  if (error instanceof ApiError && [404, 403].includes(error.status)) throw notFound();
  if (isLoading || !team) {
    return <div className="p-10 text-sm text-muted-foreground">Carregando…</div>;
  }

  const roster = buildRoster(team.leaders, team.co_leaders, members ?? []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <Link to="/app/ministerios" className="hover:text-foreground">
          Ministérios
        </Link>
        <span>/</span>
        <Link to="/app/ministerios/$kind" params={{ kind: k }} className="hover:text-foreground">
          {MINISTRY_LABEL[k] ?? team.ministry.name}
        </Link>
        <span>/</span>
        <Link
          to="/app/ministerios/$kind/$campusId"
          params={{ kind: k, campusId }}
          className="hover:text-foreground"
        >
          {team.ministry.name}
        </Link>
        <span>/</span>
        <span className="text-foreground">{team.name}</span>
      </div>

      <DetailHeader
        backTo="/app/ministerios/$kind/$campusId"
        backLabel={team.ministry.name}
        icon={<ClipboardList className="h-6 w-6" />}
        title={team.name}
        subtitle={team.description || undefined}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={<Users className="h-4 w-4" />} label="Membros" value={roster.length} />
      </div>

      <DetailSection title="Liderança">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <LeaderCard label="Líderes" people={team.leaders} />
          <LeaderCard label="Colíderes" people={team.co_leaders} />
        </div>
      </DetailSection>

      <DetailSection title="Membros" count={roster.length}>
        {roster.length === 0 ? (
          <EmptyState>Nenhum membro nesta equipe.</EmptyState>
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
    </div>
  );
}

function LeaderCard({ label, people }: { label: string; people: PersonMini[] }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        {people.length === 0 ? (
          <div className="mt-1 text-sm text-muted-foreground">Nenhum definido</div>
        ) : (
          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
            {people.map((p) => (
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
      </CardContent>
    </Card>
  );
}
