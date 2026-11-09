import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Droplet, HeartHandshake, Building2, Mail, Award, UserCheck, GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DetailHeader } from "@/components/detail/DetailHeader";
import { StatCard } from "@/components/detail/StatCard";
import { DetailSection } from "@/components/detail/DetailSection";
import { useAuth } from "@/lib/api/auth";
import { formatSchedule } from "@/lib/api/cells";
import { MINISTRY_LABEL } from "@/lib/api/ministries";
import { usePerson, useUpdatePerson } from "@/lib/api/people";
import {
  useAddReconciliationToCell,
  useAddReconciliationToMinistry,
  useAvailableCells,
  useAvailableMinistries,
  useReconciliationByConvert,
  useUpdateJornada,
} from "@/lib/api/reconciliation";

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
  const { data: reconciliation } = useReconciliationByConvert(id);
  const { me } = useAuth();

  if (isError) throw notFound();
  if (!person) {
    return <div className="p-10 text-sm text-muted-foreground">{isLoading ? "Carregando…" : ""}</div>;
  }

  const canManageReconciliation =
    !!me &&
    !!reconciliation &&
    (me.is_manager ||
      me.id === reconciliation.reconciliador.id ||
      me.led_campuses.some((c) => c.id === person.campus?.id) ||
      me.general_led_kinds.includes("reconciliacao") ||
      me.led_ministries.some((m) => m.kind === "reconciliacao"));

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

      {reconciliation && (
        <DetailSection title="Jornada de Reconciliação">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="inline-flex items-center gap-1">
                  <UserCheck className="h-3 w-3 text-muted-foreground" /> Reconciliador:{" "}
                  <span className="font-medium">{reconciliation.reconciliador.name}</span>
                </span>
                <Badge variant={reconciliation.jornada_completed ? "default" : "outline"} className="gap-1">
                  <GraduationCap className="h-3 w-3" />
                  {reconciliation.jornada_completed ? "Jornada concluída" : "Jornada pendente"}
                </Badge>
              </div>
              {canManageReconciliation && (
                <ReconciliationActions
                  personId={person.id}
                  reconciliationId={reconciliation.id}
                  baptized={person.baptized}
                  jornadaCompleted={reconciliation.jornada_completed}
                  inCell={reconciliation.in_cell}
                  serving={reconciliation.serving}
                />
              )}
            </CardContent>
          </Card>
        </DetailSection>
      )}
    </div>
  );
}

function ReconciliationActions({
  personId,
  reconciliationId,
  baptized,
  jornadaCompleted,
  inCell,
  serving,
}: {
  personId: string;
  reconciliationId: string;
  baptized: boolean;
  jornadaCompleted: boolean;
  inCell: boolean;
  serving: boolean;
}) {
  const [cellId, setCellId] = useState("");
  const [ministryId, setMinistryId] = useState("");
  const updatePerson = useUpdatePerson(personId);
  const updateJornada = useUpdateJornada();
  const addToCell = useAddReconciliationToCell();
  const addToMinistry = useAddReconciliationToMinistry();
  // Dedicated endpoints, not the generic useCells()/useMinistries() — a plain
  // reconciliador (no leadership) has no read access to those under the normal
  // campus/leadership-based scoping, only to what's assignable for their own
  // convert (see apps.reconciliation.views available_cells/available_ministries).
  const { data: campusCells } = useAvailableCells(reconciliationId);
  const { data: campusMinistries } = useAvailableMinistries(reconciliationId);

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
      {!baptized && (
        <Button
          variant="outline"
          size="sm"
          disabled={updatePerson.isPending}
          onClick={() => updatePerson.mutate({ baptized: true, baptized_at: new Date().toISOString().slice(0, 10) })}
        >
          <Droplet className="h-3 w-3" /> Marcar como batizado
        </Button>
      )}
      {!jornadaCompleted && (
        <Button
          variant="outline"
          size="sm"
          disabled={updateJornada.isPending}
          onClick={() => updateJornada.mutate({ id: reconciliationId, jornadaCompleted: true })}
        >
          <GraduationCap className="h-3 w-3" /> Marcar Jornada concluída
        </Button>
      )}
      {!inCell && (
        <div className="flex items-center gap-1">
          <Select value={cellId} onValueChange={setCellId}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="GT" />
            </SelectTrigger>
            <SelectContent>
              {(campusCells ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {(c.meeting_day || c.meeting_time) && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {formatSchedule(c.meeting_day, c.meeting_time)}
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            disabled={!cellId || addToCell.isPending}
            onClick={() => addToCell.mutate({ id: reconciliationId, cellId })}
          >
            Adicionar a um GT
          </Button>
        </div>
      )}
      {!serving && (
        <div className="flex items-center gap-1">
          <Select value={ministryId} onValueChange={setMinistryId}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Ministério" />
            </SelectTrigger>
            <SelectContent>
              {(campusMinistries ?? []).map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            disabled={!ministryId || addToMinistry.isPending}
            onClick={() => addToMinistry.mutate({ id: reconciliationId, ministryId })}
          >
            Adicionar a um Ministério
          </Button>
        </div>
      )}
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
