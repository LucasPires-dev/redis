import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  Sparkles,
  Users,
  Calendar,
  Building2,
  History,
  Pencil,
  RefreshCw,
  UserMinus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { CellFormDialog } from "@/components/cells/CellFormDialog";
import { CellMeetingsSection } from "@/components/cells/CellMeetingsSection";
import { PersonSearch } from "@/components/cells/PersonSearch";
import { RenewCellDialog } from "@/components/cells/RenewCellDialog";
import { ApiError, apiErrorMessage } from "@/lib/api/client";
import {
  formatSchedule,
  useAddCellMember,
  useAssignCellLeader,
  useCell,
  useCellMembers,
  useRemoveCellLeader,
  useRemoveCellMember,
  type Cell,
  type LeadershipRole,
} from "@/lib/api/cells";
import { formatDate } from "@/lib/api/seasons";
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
  const [editing, setEditing] = useState(false);
  const [renewing, setRenewing] = useState(false);

  if (error instanceof ApiError && [404, 403].includes(error.status)) throw notFound();
  if (isLoading || !cell) {
    return <div className="p-10 text-sm text-muted-foreground">Carregando…</div>;
  }

  const roster = buildRoster(cell.leaders, cell.co_leaders, members ?? []);
  const schedule = formatSchedule(cell.meeting_day, cell.meeting_time);
  const memberIds = new Set((members ?? []).map((m) => m.id));

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <DetailHeader
        backTo="/app/celulas"
        backLabel="Células"
        icon={<Sparkles className="h-6 w-6" />}
        title={cell.name}
        subtitle={cell.campus.name}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {schedule && (
              <Badge variant="outline" className="gap-1">
                <Calendar className="h-3 w-3" /> {schedule}
              </Badge>
            )}
            {cell.can_manage && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-4 w-4" /> Editar
              </Button>
            )}
            {cell.can_coordinate && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => setRenewing(true)}
              >
                <RefreshCw className="h-4 w-4" /> Renovar
              </Button>
            )}
          </div>
        }
      />
      {cell.can_manage && <CellFormDialog open={editing} onOpenChange={setEditing} cell={cell} />}
      {cell.can_coordinate && (
        <RenewCellDialog open={renewing} onOpenChange={setRenewing} cell={cell} />
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={<Users className="h-4 w-4" />} label="Membros" value={roster.length} />
      </div>

      <DetailSection title="Sobre">
        <Card>
          <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <Info
              label="Temporada"
              value={
                cell.season ? (
                  <span className="inline-flex items-center gap-2">
                    {cell.season.name}
                    {cell.season.is_current && <Badge variant="secondary">Atual</Badge>}
                  </span>
                ) : (
                  "—"
                )
              }
            />
            <Info
              label="Período"
              value={
                cell.effective_start && cell.effective_end
                  ? `${formatDate(cell.effective_start)} a ${formatDate(cell.effective_end)}`
                  : "—"
              }
            />
            <Info label="Dia" value={cell.meeting_day_display || "—"} />
            <Info label="Horário" value={cell.meeting_time ?? "—"} />
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
            {cell.previous_cell && (
              <Info
                label="Histórico"
                value={
                  <Link
                    to="/app/celulas/$id"
                    params={{ id: cell.previous_cell }}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <History className="h-3 w-3" /> Temporada anterior
                  </Link>
                }
              />
            )}
          </CardContent>
        </Card>
        {cell.description && (
          <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
            {cell.description}
          </p>
        )}
      </DetailSection>

      <DetailSection title="Liderança">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <LeaderCard label="Líderes" people={cell.leaders} cell={cell} />
          <LeaderCard label="Colíderes" people={cell.co_leaders} cell={cell} />
        </div>
        {cell.can_coordinate && <AddLeader cell={cell} />}
      </DetailSection>

      <DetailSection title="Membros" count={roster.length}>
        {cell.can_manage && <AddMember cell={cell} memberIds={memberIds} />}
        {roster.length === 0 ? (
          <EmptyState>Nenhum membro cadastrado.</EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {roster.map(({ person: p, role }) => (
              <Card key={p.id} className="h-full transition-colors hover:border-primary/40">
                <CardContent className="flex items-center gap-3 p-4">
                  <Link
                    to="/app/pessoas/$id"
                    params={{ id: p.id }}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-xs text-primary">
                        {initials(p.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{p.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{p.email}</div>
                    </div>
                  </Link>
                  <RoleBadge role={role} />
                  {/* Leaders who aren't in `members` are removed via the leadership card. */}
                  {cell.can_manage && memberIds.has(p.id) && (
                    <RemoveMemberButton cellId={cell.id} person={p} />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DetailSection>

      <CellMeetingsSection cell={cell} roster={roster} />
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

function LeaderCard({ label, people, cell }: { label: string; people: PersonMini[]; cell: Cell }) {
  const removeLeader = useRemoveCellLeader(cell.id);
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        {people.length === 0 ? (
          <div className="mt-1 text-sm text-muted-foreground">Nenhum definido</div>
        ) : (
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {people.map((p) => (
              <span key={p.id} className="inline-flex items-center gap-1">
                <Link
                  to="/app/pessoas/$id"
                  params={{ id: p.id }}
                  className="truncate text-sm font-medium hover:text-primary"
                >
                  {p.name}
                </Link>
                {cell.can_coordinate && (
                  <button
                    type="button"
                    aria-label={`Remover ${p.name} da liderança`}
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    disabled={removeLeader.isPending}
                    onClick={() => {
                      if (!window.confirm(`Remover ${p.name} da liderança?`)) return;
                      removeLeader.mutate(p.id, {
                        onSuccess: () => toast.success("Liderança removida"),
                        onError: (e) =>
                          toast.error(apiErrorMessage(e, "Não foi possível remover.")),
                      });
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Leaders must belong to the cell's campus — the search only returns those.
function AddLeader({ cell }: { cell: Cell }) {
  const assign = useAssignCellLeader(cell.id);
  const [role, setRole] = useState<LeadershipRole>("leader");
  const current = new Set([...cell.leaders, ...cell.co_leaders].map((p) => p.id));
  return (
    <Card className="mt-3">
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">Adicionar liderança</span>
          <Select value={role} onValueChange={(v) => setRole(v as LeadershipRole)}>
            <SelectTrigger className="h-8 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="leader">Líder</SelectItem>
              <SelectItem value="co_leader">Colíder</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <PersonSearch
          endpoint={`/api/cells/${cell.id}/people-search/?for=leaders`}
          placeholder={`Buscar pessoas do campus ${cell.campus.name}`}
          excludeIds={current}
          disabled={assign.isPending}
          onSelect={(p) =>
            assign.mutate(
              { person_id: p.id, role },
              {
                onSuccess: () =>
                  toast.success(`${p.name} agora é ${role === "leader" ? "líder" : "colíder"}`),
                onError: (e) => toast.error(apiErrorMessage(e, "Não foi possível adicionar.")),
              },
            )
          }
        />
      </CardContent>
    </Card>
  );
}

// Members may come from any campus.
function AddMember({ cell, memberIds }: { cell: Cell; memberIds: Set<string> }) {
  const addMember = useAddCellMember(cell.id);
  return (
    <div className="mb-3 max-w-md">
      <PersonSearch
        endpoint={`/api/cells/${cell.id}/people-search/`}
        placeholder="Adicionar membro: buscar por nome ou email"
        excludeIds={memberIds}
        disabled={addMember.isPending}
        onSelect={(p) =>
          addMember.mutate(p.id, {
            onSuccess: () => toast.success(`${p.name} adicionado(a) à célula`),
            onError: (e) => toast.error(apiErrorMessage(e, "Não foi possível adicionar.")),
          })
        }
      />
    </div>
  );
}

function RemoveMemberButton({ cellId, person }: { cellId: string; person: PersonMini }) {
  const removeMember = useRemoveCellMember(cellId);
  return (
    <Button
      size="icon"
      variant="ghost"
      aria-label={`Remover ${person.name}`}
      disabled={removeMember.isPending}
      onClick={() => {
        if (!window.confirm(`Remover ${person.name} da célula?`)) return;
        removeMember.mutate(person.id, {
          onSuccess: () => toast.success("Membro removido"),
          onError: (e) => toast.error(apiErrorMessage(e, "Não foi possível remover.")),
        });
      }}
    >
      <UserMinus className="h-4 w-4" />
    </Button>
  );
}
