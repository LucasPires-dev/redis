import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Sparkles, Users, Calendar, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DetailHeader } from "@/components/detail/DetailHeader";
import { StatCard } from "@/components/detail/StatCard";
import { DetailSection, EmptyState } from "@/components/detail/DetailSection";
import { RoleBadge } from "@/components/detail/RoleBadge";
import { ApiError } from "@/lib/api/client";
import { useCell, useCellMembers } from "@/lib/api/cells";
import { MINISTRY_LABEL } from "@/lib/api/ministries";
import type { PersonMini } from "@/lib/api/people";
import { buildRoster } from "@/lib/roster";

export const Route = createFileRoute("/app/celulas_/$id")({
  head: () => ({ meta: [{ title: "Célula — Redis" }] }),
  component: CellDetail,
  notFoundComponent: () => (
    <div className="p-10 text-sm text-muted-foreground">Célula não encontrada.</div>
  ),
});

function initials(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("");
}

function CellDetail() {
  const { id } = Route.useParams();
  const { data: cell, isLoading, error } = useCell(id);
  const { data: members } = useCellMembers(id);

  if (error instanceof ApiError && [404, 403].includes(error.status)) throw notFound();
  if (isLoading || !cell) {
    return <div className="p-10 text-sm text-muted-foreground">Carregando…</div>;
  }

  const roster = buildRoster(cell.leaders, cell.co_leaders, members ?? []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <DetailHeader
        backTo="/app/celulas"
        backLabel="Células"
        icon={<Sparkles className="h-6 w-6" />}
        title={cell.name}
        subtitle={cell.campus.name}
        actions={
          cell.weekday ? (
            <Badge variant="outline" className="gap-1">
              <Calendar className="h-3 w-3" /> {cell.weekday}
            </Badge>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={<Users className="h-4 w-4" />} label="Membros" value={roster.length} />
      </div>

      <DetailSection title="Sobre">
        <Card>
          <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-4">
            <Info label="Dia" value={cell.weekday || "—"} />
            <Info
              label="Público-alvo"
              value={cell.target_audience ? MINISTRY_LABEL[cell.target_audience] : "—"}
            />
            <Info label="Endereço" value={cell.address || "—"} />
            <Info
              label="Campus"
              value={
                <Link
                  to="/app/campus/$id"
                  params={{ id: cell.campus.id }}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  <Building2 className="h-3 w-3" /> {cell.campus.name}
                </Link>
              }
            />
          </CardContent>
        </Card>
      </DetailSection>

      <DetailSection title="Liderança">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <LeaderCard label="Líderes" people={cell.leaders} />
          <LeaderCard label="Colíderes" people={cell.co_leaders} />
        </div>
      </DetailSection>

      <DetailSection title="Membros" count={roster.length}>
        {roster.length === 0 ? (
          <EmptyState>Nenhum membro cadastrado.</EmptyState>
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

      <DetailSection title="Últimos encontros">
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">
            Histórico de encontros ficará disponível quando essa funcionalidade for implementada.
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
