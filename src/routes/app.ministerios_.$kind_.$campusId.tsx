import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  HeartHandshake,
  Users,
  ShieldAlert,
  Mail,
  UserRound,
  ClipboardList,
  UserCheck,
  Building2,
  Droplet,
  Sparkles,
  GraduationCap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DetailHeader } from "@/components/detail/DetailHeader";
import { StatCard } from "@/components/detail/StatCard";
import { DetailSection, EmptyState } from "@/components/detail/DetailSection";
import { RoleBadge } from "@/components/detail/RoleBadge";
import { deriveRoleLabel, hasReconciliationTriageAccess, useAuth, type Me } from "@/lib/api/auth";
import {
  MINISTRY_LABEL,
  useCampuses,
  useMinistries,
  useMinistryGeneralLeaderships,
  useMinistryMembers,
  useMinistryTeams,
  type MinistryKind,
} from "@/lib/api/ministries";
import type { PersonMini } from "@/lib/api/people";
import { buildRoster } from "@/lib/roster";
import {
  useAssignLead,
  useDiscardLead,
  useReconciliationLeads,
  useReconciliations,
  useTriageLead,
  type Reconciliation,
  type ReconciliationLead,
} from "@/lib/api/reconciliation";

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
      me.led_ministries.some((m) => m.id === ministry.id) ||
      me.led_campuses.some((c) => c.id === campusId) ||
      (k === "reconciliacao" && me.is_reconciliador));

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
            <StatCard
              icon={<ClipboardList className="h-4 w-4" />}
              label="Equipes"
              value={teams?.length ?? 0}
            />
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
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
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

          {k === "reconciliacao" && me && <ReconciliationSections me={me} campusId={campusId} />}
        </>
      )}
    </div>
  );
}

// Reconciliação is a ministry like any other (roster/leadership above are the
// same as Jovens/Adolescentes) — this section adds what's specific to it: each
// reconciliador's own people em acompanhamento, and (for triage-level roles) the
// queue of new-convert leads waiting to be assigned.
function ReconciliationSections({ me, campusId }: { me: Me; campusId: string }) {
  const triageAccess = hasReconciliationTriageAccess(me);
  const { data: reconciliations, isLoading } = useReconciliations(campusId);
  const mine = (reconciliations ?? []).filter((r) => r.reconciliador.id === me.id);

  return (
    <>
      <DetailSection
        title="Minhas pessoas"
        count={mine.length}
        action={
          triageAccess ? (
            <Button variant="outline" size="sm" asChild>
              <Link to="/app/reconciliacao/dashboard">Ver dashboard</Link>
            </Button>
          ) : undefined
        }
      >
        {mine.length === 0 ? (
          <EmptyState>
            {isLoading ? "Carregando…" : "Você ainda não tem ninguém para acompanhar."}
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {mine.map((r) => (
              <MinhaPessoaCard key={r.id} reconciliation={r} />
            ))}
          </div>
        )}
      </DetailSection>

      {triageAccess && <TriageQueue campusId={campusId} />}
    </>
  );
}

function MinhaPessoaCard({ reconciliation }: { reconciliation: Reconciliation }) {
  const { convert, baptized, in_cell, serving, jornada_completed } = reconciliation;

  return (
    <Link to="/app/pessoas/$id" params={{ id: convert.id }}>
      <Card className="h-full transition-colors hover:border-primary/40">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-xs text-primary">
                {initials(convert.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{convert.name}</div>
              <div className="truncate text-xs text-muted-foreground">{convert.email}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={baptized ? "default" : "outline"} className="gap-1">
              <Droplet className="h-3 w-3" /> {baptized ? "Batizado" : "Não batizado"}
            </Badge>
            <Badge variant={in_cell ? "default" : "outline"} className="gap-1">
              <Sparkles className="h-3 w-3" /> {in_cell ? "Em um GT" : "Sem GT"}
            </Badge>
            <Badge variant={serving ? "default" : "outline"} className="gap-1">
              <HeartHandshake className="h-3 w-3" /> {serving ? "Servindo" : "Não serve"}
            </Badge>
            <Badge variant={jornada_completed ? "default" : "outline"} className="gap-1">
              <GraduationCap className="h-3 w-3" /> {jornada_completed ? "Jornada ok" : "Jornada pendente"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function TriageQueue({ campusId }: { campusId: string }) {
  const { data: leads, isLoading } = useReconciliationLeads("pending");
  const { data: campuses } = useCampuses();
  const { data: ministries } = useMinistries();
  const reconciliacaoMinistries = (ministries ?? []).filter((m) => m.kind === "reconciliacao");
  // This ministry detail page is already scoped to one campus — the triage queue
  // shown here only needs unassigned leads plus leads already pinned here.
  const relevantLeads = (leads ?? []).filter((l) => !l.campus || l.campus.id === campusId);

  return (
    <DetailSection title="Fila de triagem" count={relevantLeads.length}>
      <div className="space-y-3">
        {relevantLeads.map((lead) => (
          <LeadRow
            key={lead.id}
            lead={lead}
            campuses={campuses ?? []}
            reconciliacaoMinistries={reconciliacaoMinistries}
          />
        ))}
        {!isLoading && relevantLeads.length === 0 && (
          <EmptyState>Nenhum lead pendente para este campus no momento.</EmptyState>
        )}
        {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      </div>
    </DetailSection>
  );
}

interface LeadRowProps {
  lead: ReconciliationLead;
  campuses: { id: string; name: string; city: string }[];
  reconciliacaoMinistries: { id: string; campus: { id: string } }[];
}

function LeadRow({ lead, campuses, reconciliacaoMinistries }: LeadRowProps) {
  const [campusId, setCampusId] = useState(lead.campus?.id ?? "");
  const [reconciliadorId, setReconciliadorId] = useState("");
  const triageLead = useTriageLead();
  const discardLead = useDiscardLead();
  const assignLead = useAssignLead();

  const ministry = reconciliacaoMinistries.find((m) => m.campus.id === campusId);
  const { data: members } = useMinistryMembers(ministry?.id);

  const canAssign = !!campusId && !!reconciliadorId;

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-4 p-5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
          <UserCheck className="h-5 w-5" />
        </div>
        <div className="min-w-45 flex-1">
          <div className="font-semibold">{lead.name}</div>
          <div className="text-sm text-muted-foreground">{lead.phone || lead.email || "—"}</div>
          {lead.raw_campus_label && (
            <Badge variant="outline" className="mt-1 gap-1">
              <Building2 className="h-3 w-3" /> {lead.raw_campus_label}
            </Badge>
          )}
        </div>

        <Select value={campusId} onValueChange={(v) => { setCampusId(v); setReconciliadorId(""); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Campus" />
          </SelectTrigger>
          <SelectContent>
            {campuses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={reconciliadorId} onValueChange={setReconciliadorId} disabled={!campusId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Reconciliador" />
          </SelectTrigger>
          <SelectContent>
            {(members ?? []).map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          {lead.campus?.id !== campusId && campusId && (
            <Button
              variant="outline"
              size="sm"
              disabled={triageLead.isPending}
              onClick={() => triageLead.mutate({ id: lead.id, campusId })}
            >
              Salvar campus
            </Button>
          )}
          <Button
            size="sm"
            disabled={!canAssign || assignLead.isPending}
            onClick={() => assignLead.mutate({ id: lead.id, reconciliadorId, campusId })}
          >
            Atribuir
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={discardLead.isPending}
            onClick={() => discardLead.mutate(lead.id)}
          >
            Descartar
          </Button>
        </div>
      </CardContent>
    </Card>
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
