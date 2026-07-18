import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Sparkles, Users, Droplet, Calendar, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DetailHeader } from "@/components/detail/DetailHeader";
import { StatCard } from "@/components/detail/StatCard";
import { DetailSection, EmptyState } from "@/components/detail/DetailSection";
import { useDB } from "@/lib/mock-store";

export const Route = createFileRoute("/app/celulas/$id")({
  head: () => ({ meta: [{ title: "Célula — Redis" }] }),
  component: CellDetail,
  notFoundComponent: () => (
    <div className="p-10 text-sm text-muted-foreground">Célula não encontrada.</div>
  ),
});

function CellDetail() {
  const { id } = Route.useParams();
  const db = useDB((d) => d);
  const cell = db.cells.find((c) => c.id === id);
  if (!cell) throw notFound();

  const campus = db.campuses.find((c) => c.id === cell.campusId);
  const leader = db.people.find((p) => p.id === cell.leaderId);
  const members = db.people.filter((p) => cell.memberIds.includes(p.id));
  const baptized = members.filter((m) => m.baptized).length;
  const meetings = 4; // mock — 1 por semana no mês

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <DetailHeader
        backTo="/app/celulas"
        backLabel="Células"
        icon={<Sparkles className="h-6 w-6" />}
        title={cell.name}
        subtitle={campus?.name}
        actions={
          <Badge variant="outline" className="gap-1">
            <Calendar className="h-3 w-3" /> {cell.weekday}
          </Badge>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={<Users className="h-4 w-4" />} label="Membros" value={members.length} />
        <StatCard icon={<Droplet className="h-4 w-4" />} label="Batizados" value={baptized} />
        <StatCard
          icon={<Sparkles className="h-4 w-4" />}
          label="Frequência média"
          value={members.length ? `${Math.round((baptized / members.length) * 100)}%` : "—"}
          hint="mock"
        />
        <StatCard icon={<Calendar className="h-4 w-4" />} label="Encontros/mês" value={meetings} />
      </div>

      <DetailSection title="Sobre">
        <Card>
          <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
            <Info label="Líder" value={leader?.name ?? "—"} />
            <Info label="Dia" value={cell.weekday} />
            <Info
              label="Campus"
              value={
                campus ? (
                  <Link
                    to="/app/campus/$id"
                    params={{ id: campus.id }}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <Building2 className="h-3 w-3" /> {campus.name}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
          </CardContent>
        </Card>
      </DetailSection>

      <DetailSection title="Membros" count={members.length}>
        {members.length === 0 ? (
          <EmptyState>Nenhum membro cadastrado.</EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {members.map((p) => (
              <Link key={p.id} to="/app/pessoas/$id" params={{ id: p.id }}>
                <Card className="transition-colors hover:border-primary/40">
                  <CardContent className="flex items-center gap-3 p-4">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-xs text-primary">
                        {p.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{p.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{p.email}</div>
                    </div>
                    {p.baptized && (
                      <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/10">
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

      <DetailSection title="Últimos encontros">
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">
            Histórico de frequência ficará disponível quando os encontros forem registrados.
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
