import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  User,
  Droplet,
  Sparkles,
  HeartHandshake,
  Building2,
  Mail,
  Calendar,
  GraduationCap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DetailHeader } from "@/components/detail/DetailHeader";
import { StatCard } from "@/components/detail/StatCard";
import { DetailSection } from "@/components/detail/DetailSection";
import { useDB, MINISTRY_LABEL } from "@/lib/mock-store";

export const Route = createFileRoute("/app/pessoas_/$id")({
  head: () => ({ meta: [{ title: "Pessoa — Redis" }] }),
  component: PersonDetail,
  notFoundComponent: () => (
    <div className="p-10 text-sm text-muted-foreground">Pessoa não encontrada.</div>
  ),
});

function PersonDetail() {
  const { id } = Route.useParams();
  const db = useDB((d) => d);
  const person = db.people.find((p) => p.id === id);
  if (!person) throw notFound();

  const campus = db.campuses.find((c) => c.id === person.campusId);
  const cell = person.cellId ? db.cells.find((c) => c.id === person.cellId) : null;
  const ministries = db.ministries.filter((m) => person.ministryIds.includes(m.id));
  const discipuler = person.discipulerId
    ? db.people.find((p) => p.id === person.discipulerId)
    : null;
  const attendance = db.attendance.filter((a) => a.personId === person.id);
  const cultos = attendance.filter((a) => a.kind === "culto").length;
  const celulas = attendance.filter((a) => a.kind === "celula").length;

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
            {campus && (
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3 w-3" /> {campus.name}
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
          hint={person.baptizedAt}
        />
        <StatCard
          icon={<Sparkles className="h-4 w-4" />}
          label="Célula"
          value={cell ? "Ativa" : "—"}
          hint={cell?.name}
        />
        <StatCard
          icon={<HeartHandshake className="h-4 w-4" />}
          label="Ministérios"
          value={ministries.length}
        />
        <StatCard
          icon={<Calendar className="h-4 w-4" />}
          label="Presenças"
          value={cultos + celulas}
          hint={`${cultos} cultos · ${celulas} células`}
        />
      </div>

      <DetailSection title="Perfil">
        <Card>
          <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
            <Info label="Email" value={person.email} />
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
            <Info
              label="Célula / GT"
              value={
                cell ? (
                  <Link
                    to="/app/celulas/$id"
                    params={{ id: cell.id }}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <Sparkles className="h-3 w-3" /> {cell.name}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
            <Info label="Discipulador" value={discipuler?.name ?? "—"} />
            <Info label="Entrou em" value={person.joinedAt} />
            <Info label="Batizado em" value={person.baptizedAt ?? "—"} />
          </CardContent>
        </Card>
      </DetailSection>

      <DetailSection title="Ministérios" count={ministries.length}>
        {ministries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem ministérios.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {ministries.map((m) => (
              <Link key={m.id} to="/app/ministerios/$kind" params={{ kind: m.kind }}>
                <Card className="transition-colors hover:border-primary/40">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-accent-foreground">
                      <HeartHandshake className="h-4 w-4" />
                    </div>
                    <div className="text-sm font-semibold">{MINISTRY_LABEL[m.kind]}</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </DetailSection>

      <DetailSection title="Trajetória">
        <Card>
          <CardContent className="space-y-3 p-5 text-sm">
            <TimelineItem icon={<User className="h-3.5 w-3.5" />} label="Entrou na igreja" date={person.joinedAt} />
            {person.baptized && (
              <TimelineItem
                icon={<Droplet className="h-3.5 w-3.5" />}
                label="Batismo"
                date={person.baptizedAt ?? "—"}
              />
            )}
            {cell && (
              <TimelineItem
                icon={<Sparkles className="h-3.5 w-3.5" />}
                label={`Entrou na célula ${cell.name}`}
                date="—"
              />
            )}
            <TimelineItem
              icon={<GraduationCap className="h-3.5 w-3.5" />}
              label="Cursos concluídos"
              date="—"
            />
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

function TimelineItem({
  icon,
  label,
  date,
}: {
  icon: React.ReactNode;
  label: string;
  date: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-7 w-7 place-items-center rounded-full bg-accent text-accent-foreground">
        {icon}
      </div>
      <div className="flex-1">{label}</div>
      <div className="text-xs text-muted-foreground">{date}</div>
    </div>
  );
}
