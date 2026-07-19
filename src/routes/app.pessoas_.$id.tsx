import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Droplet, HeartHandshake, Building2, Mail, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DetailHeader } from "@/components/detail/DetailHeader";
import { StatCard } from "@/components/detail/StatCard";
import { DetailSection } from "@/components/detail/DetailSection";
import { MINISTRY_LABEL } from "@/lib/api/ministries";
import { usePerson } from "@/lib/api/people";

export const Route = createFileRoute("/app/pessoas_/$id")({
  head: () => ({ meta: [{ title: "Pessoa — Redis" }] }),
  component: PersonDetail,
  notFoundComponent: () => (
    <div className="p-10 text-sm text-muted-foreground">Pessoa não encontrada.</div>
  ),
});

function PersonDetail() {
  const { id } = Route.useParams();
  const { data: person, isLoading, isError } = usePerson(id);

  if (isError) throw notFound();
  if (!person) {
    return <div className="p-10 text-sm text-muted-foreground">{isLoading ? "Carregando…" : ""}</div>;
  }

  const initials = person.name.split(" ").map((s) => s[0]).slice(0, 2).join("");

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <DetailHeader
        backTo="/app/pessoas"
        backLabel="Pessoas"
        icon={
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10 text-sm text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
        }
        title={person.name}
        subtitle={
          <span className="inline-flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3 w-3" /> {person.email}
            </span>
            {person.campus && (
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3 w-3" /> {person.campus.name}
              </span>
            )}
          </span>
        }
        actions={
          person.baptized ? (
            <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/10">
              <Droplet className="h-3 w-3" /> Batizado
            </Badge>
          ) : (
            <Badge variant="outline">Não batizado</Badge>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={<Droplet className="h-4 w-4" />}
          label="Batismo"
          value={person.baptized ? "Sim" : "Não"}
          hint={person.baptized_at ?? undefined}
        />
        <StatCard
          icon={<HeartHandshake className="h-4 w-4" />}
          label="Ministérios"
          value={person.ministries.length}
        />
        <StatCard icon={<Award className="h-4 w-4" />} label="Pontos" value={person.total_points} />
      </div>

      <DetailSection title="Perfil">
        <Card>
          <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
            <Info label="Email" value={person.email} />
            <Info label="Telefone" value={person.phone || "—"} />
            <Info
              label="Campus"
              value={
                person.campus ? (
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> {person.campus.name}
                  </span>
                ) : (
                  "—"
                )
              }
            />
            <Info label="Entrou em" value={person.joined_at ?? "—"} />
            <Info label="Batizado em" value={person.baptized_at ?? "—"} />
          </CardContent>
        </Card>
      </DetailSection>

      <DetailSection title="Ministérios" count={person.ministries.length}>
        {person.ministries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem ministérios.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {person.ministries.map((m) => (
              <Link key={m.id} to="/app/ministerios/$kind" params={{ kind: m.kind }}>
                <Card className="transition-colors hover:border-primary/40">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-accent-foreground">
                      <HeartHandshake className="h-4 w-4" />
                    </div>
                    <div className="text-sm font-semibold">{m.name}</div>
                    <Badge variant="outline" className="ml-auto capitalize">
                      {MINISTRY_LABEL[m.kind]}
                    </Badge>
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

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}
