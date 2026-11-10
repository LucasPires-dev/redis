import { useState } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { Clapperboard, Plus, Send, Ticket, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DetailHeader } from "@/components/detail/DetailHeader";
import { RouteError } from "@/components/RouteError";
import { DetailSkeleton } from "@/components/skeletons";
import { DetailSection, EmptyState } from "@/components/detail/DetailSection";
import { ApiError, apiErrorMessage } from "@/lib/api/client";
import { useAuth } from "@/lib/api/auth";
import {
  MINISTRY_LABEL,
  PRODUCTION_MINISTRY_KINDS,
  useMinistries,
  useMinistryMembers,
  type MinistryKind,
} from "@/lib/api/ministries";
import {
  useChecklistItems,
  useConfirmRosterEntry,
  useCreateChecklistItem,
  useDeclineRosterEntry,
  useEvent,
  useInviteToRoster,
  useRosterEntries,
  useSetRundownItemStatus,
  useToggleChecklistItem,
  type ItemStatusValue,
  type RosterStatus,
  type DemandType,
  type DemandPriority,
  type DemandStatus,
  useEventDemands,
  useCreateDemand,
  useAcceptDemand,
  useCompleteDemand,
  useRejectDemand,
} from "@/lib/api/production";
import { useEventRealtime } from "@/lib/api/realtime";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  useCancelRegistration,
  useCreateTicketConfig,
  useMyRegistration,
  canSelfCancel,
  useRegisterForEvent,
  useRegistrationStats,
  useRegistrations,
  useTicketConfig,
  useUpdateTicketConfig,
  PAYMENT_STATUS_LABEL,
} from "@/lib/api/payments";

export const Route = createFileRoute("/app/producao_/eventos_/$id")({
  head: () => ({ meta: [{ title: "Ordem do Culto — Redis" }] }),
  component: EventRundown,
  errorComponent: RouteError,
  notFoundComponent: () => (
    <div className="p-10 text-sm text-muted-foreground">Evento não encontrado.</div>
  ),
});

const EVENT_STATUS_LABEL: Record<string, string> = {
  planning: "Planejamento",
  confirmed: "Confirmado",
  in_progress: "Em andamento",
  closed: "Encerrado",
};

const ITEM_STATUS: { value: ItemStatusValue; label: string; dot: string }[] = [
  { value: "ok", label: "Pronto", dot: "bg-emerald-500" },
  { value: "attention", label: "Atenção", dot: "bg-amber-500" },
  { value: "problem", label: "Problema", dot: "bg-red-500" },
];

function statusDot(value: ItemStatusValue) {
  return ITEM_STATUS.find((s) => s.value === value)?.dot ?? "bg-muted-foreground";
}

const ROSTER_STATUS_LABEL: Record<RosterStatus, string> = {
  invited: "Convidado",
  confirmed: "Confirmado",
  declined: "Recusado",
};

const ROSTER_STATUS_VARIANT: Record<RosterStatus, "outline" | "default" | "destructive"> = {
  invited: "outline",
  confirmed: "default",
  declined: "destructive",
};

function myMinistryKinds(
  me: { led_ministries: { kind: MinistryKind }[]; general_led_kinds: MinistryKind[] } | undefined,
) {
  if (!me) return [];
  const kinds = new Set<MinistryKind>([
    ...me.led_ministries.map((m) => m.kind),
    ...me.general_led_kinds,
  ]);
  return Array.from(kinds);
}

function EventRundown() {
  const { id } = Route.useParams();
  const { me } = useAuth();
  useEventRealtime(id);
  const { data: event, isLoading, error } = useEvent(id, { poll: true });
  const setStatus = useSetRundownItemStatus(id);
  const myKinds = myMinistryKinds(me);
  const [reportingKind, setReportingKind] = useState<MinistryKind | "">(myKinds[0] ?? "");

  const { data: rosterEntries } = useRosterEntries(id);
  const confirmEntry = useConfirmRosterEntry(id);
  const declineEntry = useDeclineRosterEntry(id);

  const { data: checklistItems } = useChecklistItems(id);
  const toggleChecklistItem = useToggleChecklistItem(id);

  if (error instanceof ApiError && [404, 403].includes(error.status)) throw notFound();
  if (isLoading || !event) {
    return <DetailSkeleton />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <DetailHeader
        backTo="/app/producao"
        backLabel="Produção"
        icon={<Clapperboard className="h-6 w-6" />}
        title={event.title}
        subtitle={
          <>
            {new Date(event.starts_at).toLocaleString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
            {event.campus ? ` · ${event.campus.name}` : " · Todos os campi"}
          </>
        }
        actions={<Badge variant="outline">{EVENT_STATUS_LABEL[event.status]}</Badge>}
      />

      {myKinds.length > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Reportando como:</span>
          <Select value={reportingKind} onValueChange={(v) => setReportingKind(v as MinistryKind)}>
            <SelectTrigger className="h-8 w-48">
              <SelectValue placeholder="Selecione o ministério" />
            </SelectTrigger>
            <SelectContent>
              {myKinds.map((k) => (
                <SelectItem key={k} value={k}>
                  {MINISTRY_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <DetailSection title="Ordem do culto" count={event.rundown_items.length}>
        {event.rundown_items.length === 0 ? (
          <EmptyState>Nenhum item na ordem do culto ainda.</EmptyState>
        ) : (
          <div className="space-y-2">
            {event.rundown_items.map((item) => (
              <Card key={item.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{item.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.scheduled_time
                          ? new Date(item.scheduled_time).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                        {" · "}
                        {MINISTRY_LABEL[item.ministry_kind]}
                      </div>
                    </div>
                  </div>

                  {item.statuses.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {item.statuses.map((s) => (
                        <Badge key={s.ministry_kind} variant="outline" className="gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${statusDot(s.status)}`} />
                          {MINISTRY_LABEL[s.ministry_kind]}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {reportingKind && (
                    <div className="flex gap-1.5 pt-1">
                      {ITEM_STATUS.map((s) => (
                        <Button
                          key={s.value}
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          disabled={setStatus.isPending}
                          onClick={() =>
                            setStatus.mutate({
                              itemId: item.id,
                              ministryKind: reportingKind,
                              status: s.value,
                            })
                          }
                        >
                          <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                          {s.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DetailSection>

      <DetailSection
        title="Escala"
        count={rosterEntries?.length ?? 0}
        action={<InviteToRosterDialog eventId={event.id} campusId={event.campus?.id} />}
      >
        {!rosterEntries || rosterEntries.length === 0 ? (
          <EmptyState>Ninguém escalado ainda.</EmptyState>
        ) : (
          <div className="space-y-2">
            {rosterEntries.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{entry.person.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {entry.ministry.name}
                      {entry.function ? ` · ${entry.function}` : ""}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {entry.status === "invited" && entry.person.id === me?.id && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={declineEntry.isPending}
                          onClick={() => declineEntry.mutate(entry.id)}
                        >
                          Recusar
                        </Button>
                        <Button
                          size="sm"
                          disabled={confirmEntry.isPending}
                          onClick={() => confirmEntry.mutate(entry.id)}
                        >
                          Confirmar
                        </Button>
                      </>
                    )}
                    <Badge variant={ROSTER_STATUS_VARIANT[entry.status]}>
                      {ROSTER_STATUS_LABEL[entry.status]}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DetailSection>

      <DetailSection title="Checklist" count={checklistItems?.length ?? 0}>
        <div className="space-y-2">
          {(checklistItems ?? []).map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-center gap-3 p-3">
                <Checkbox
                  checked={item.is_done}
                  disabled={toggleChecklistItem.isPending}
                  onCheckedChange={() => toggleChecklistItem.mutate(item.id)}
                />
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-sm ${item.is_done ? "text-muted-foreground line-through" : ""}`}
                  >
                    {item.text}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {MINISTRY_LABEL[item.ministry_kind]}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {(!checklistItems || checklistItems.length === 0) && (
            <EmptyState>Nenhum item de checklist ainda.</EmptyState>
          )}
        </div>
        {myKinds.length > 0 && <AddChecklistItemForm eventId={event.id} myKinds={myKinds} />}
      </DetailSection>

      <DelegationSection
        eventId={event.id}
        campusId={event.campus?.id}
        isManager={!!me?.is_manager || !!me?.is_event_producer}
      />

      <TicketConfigSection
        eventId={event.id}
        isManager={!!me?.is_manager || !!me?.is_event_producer}
      />

      <RegistrationSection
        eventId={event.id}
        isManager={!!me?.is_manager || !!me?.is_event_producer}
      />
    </div>
  );
}

function InviteToRosterDialog({
  eventId,
  campusId,
}: {
  eventId: string;
  campusId: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const { data: ministries } = useMinistries();
  const [ministryId, setMinistryId] = useState("");
  const { data: members } = useMinistryMembers(ministryId || undefined);
  const [personId, setPersonId] = useState("");
  const [fn, setFn] = useState("");
  const [error, setError] = useState("");
  const invite = useInviteToRoster();

  const options = (ministries ?? []).filter((m) => !campusId || m.campus.id === campusId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!ministryId || !personId) {
      setError("Selecione o ministério e a pessoa.");
      return;
    }
    try {
      await invite.mutateAsync({
        event_id: eventId,
        ministry_id: ministryId,
        person_id: personId,
        function: fn,
      });
      setOpen(false);
      setMinistryId("");
      setPersonId("");
      setFn("");
    } catch {
      setError("Não foi possível convidar. Verifique se você lidera esse ministério.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Plus className="h-4 w-4" /> Convidar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar para a escala</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Ministério</Label>
            <Select
              value={ministryId}
              onValueChange={(v) => {
                setMinistryId(v);
                setPersonId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {options.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Pessoa</Label>
            <Select value={personId} onValueChange={setPersonId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={ministryId ? "Selecione" : "Escolha o ministério primeiro"}
                />
              </SelectTrigger>
              <SelectContent>
                {(members ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Função (opcional)</Label>
            <Input value={fn} onChange={(e) => setFn(e.target.value)} placeholder="Ex: Câmera 2" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={invite.isPending}>
            Convidar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const DEMAND_TYPE_LABEL: Record<DemandType, string> = {
  slide: "Pedido de slide",
  technical_adjustment: "Ajuste técnico",
  repertoire_change: "Mudança de repertório",
  stage_setup: "Montagem de palco",
  material: "Material",
  other: "Outro",
};

const DEMAND_STATUS_LABEL: Record<DemandStatus, string> = {
  open: "Aberta",
  in_progress: "Em andamento",
  done: "Concluída",
  rejected: "Rejeitada",
};

const DEMAND_STATUS_VARIANT: Record<
  DemandStatus,
  "outline" | "default" | "destructive" | "secondary"
> = {
  open: "outline",
  in_progress: "secondary",
  done: "default",
  rejected: "destructive",
};

function DelegationSection({
  eventId,
  campusId,
  isManager,
}: {
  eventId: string;
  campusId: string | undefined;
  isManager: boolean;
}) {
  const { data: demands } = useEventDemands(eventId);
  const accept = useAcceptDemand();
  const complete = useCompleteDemand();

  if (!isManager && (!demands || demands.length === 0)) return null;

  const grouped = (demands ?? []).reduce(
    (acc, d) => {
      const key = d.to_ministry_kind;
      if (!acc[key]) acc[key] = [];
      acc[key].push(d);
      return acc;
    },
    {} as Record<MinistryKind, typeof demands>,
  );

  return (
    <DetailSection
      title="Delegações"
      count={demands?.length ?? 0}
      action={
        isManager ? <CreateDelegationDialog eventId={eventId} campusId={campusId} /> : undefined
      }
    >
      {!demands || demands.length === 0 ? (
        <EmptyState>Nenhuma delegação criada ainda.</EmptyState>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([kind, items]) => (
            <div key={kind}>
              <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                {MINISTRY_LABEL[kind as MinistryKind]}
              </h4>
              <div className="space-y-2">
                {(items ?? []).map((d) => (
                  <Card key={d.id}>
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">
                          {DEMAND_TYPE_LABEL[d.demand_type]}
                        </div>
                        {d.description && (
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            {d.description}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {d.status === "open" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={accept.isPending}
                            onClick={() => accept.mutate(d.id)}
                          >
                            Aceitar
                          </Button>
                        )}
                        {d.status === "in_progress" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={complete.isPending}
                            onClick={() => complete.mutate(d.id)}
                          >
                            Concluir
                          </Button>
                        )}
                        <Badge variant={DEMAND_STATUS_VARIANT[d.status]}>
                          {DEMAND_STATUS_LABEL[d.status]}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </DetailSection>
  );
}

function CreateDelegationDialog({
  eventId,
  campusId,
}: {
  eventId: string;
  campusId: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [toKind, setToKind] = useState<MinistryKind>(PRODUCTION_MINISTRY_KINDS[0]);
  const [demandType, setDemandType] = useState<DemandType>("other");
  const [priority, setPriority] = useState<DemandPriority>("normal");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const createDemand = useCreateDemand();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await createDemand.mutateAsync({
        event_id: eventId,
        from_ministry_kind: null,
        to_ministry_kind: toKind,
        to_campus_id: campusId ?? null,
        demand_type: demandType,
        priority,
        description,
        due_date: dueDate || null,
      });
      setOpen(false);
      setDescription("");
      setDueDate("");
    } catch {
      setError("Não foi possível criar a delegação.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Send className="h-4 w-4" /> Delegar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delegar para ministério</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Ministério destino</Label>
            <Select value={toKind} onValueChange={(v) => setToKind(v as MinistryKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRODUCTION_MINISTRY_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {MINISTRY_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={demandType} onValueChange={(v) => setDemandType(v as DemandType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DEMAND_TYPE_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Prioridade</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as DemandPriority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgent">Urgente</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="planning">Planejamento</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="O que precisa ser feito"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Prazo (opcional)</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={createDemand.isPending}>
            Criar delegação
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TicketConfigSection({ eventId, isManager }: { eventId: string; isManager: boolean }) {
  const { data: config, isLoading } = useTicketConfig(eventId);
  const createConfig = useCreateTicketConfig();
  const updateConfig = useUpdateTicketConfig();
  const [open, setOpen] = useState(false);
  const [priceCents, setPriceCents] = useState(0);
  const [maxCapacity, setMaxCapacity] = useState("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");

  if (!isManager) return null;

  function openEdit() {
    if (config) {
      setPriceCents(config.price_cents);
      setMaxCapacity(config.max_capacity != null ? String(config.max_capacity) : "");
      setDeadline(config.registration_deadline?.slice(0, 16) ?? "");
      setDescription(config.description ?? "");
    } else {
      setPriceCents(0);
      setMaxCapacity("");
      setDeadline("");
      setDescription("");
    }
    setOpen(true);
  }

  async function handleSave() {
    const payload = {
      event_id: eventId,
      price_cents: priceCents,
      max_capacity: maxCapacity ? Number(maxCapacity) : null,
      registration_deadline: deadline ? new Date(deadline).toISOString() : null,
      description,
    };
    try {
      if (config) {
        await updateConfig.mutateAsync({ id: config.id, ...payload });
      } else {
        await createConfig.mutateAsync(payload);
      }
      setOpen(false);
      toast.success(config ? "Ingresso atualizado" : "Ingresso configurado");
    } catch {
      toast.error("Não foi possível salvar a configuração.");
    }
  }

  const priceFmt = config?.price_cents
    ? `R$ ${(config.price_cents / 100).toFixed(2).replace(".", ",")}`
    : "Gratuito";

  return (
    <DetailSection
      title="Configuração de Ingresso"
      action={
        <Button size="sm" variant="outline" onClick={openEdit}>
          {config ? "Editar" : "Configurar"}
        </Button>
      }
    >
      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {!isLoading && !config && (
        <EmptyState>Nenhum ingresso configurado. Configure para habilitar inscrições.</EmptyState>
      )}
      {config && (
        <Card>
          <CardContent className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
            <div>
              <div className="text-xs text-muted-foreground">Preço</div>
              <div className="text-sm font-medium">{priceFmt}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Capacidade</div>
              <div className="text-sm font-medium">{config.max_capacity ?? "Ilimitada"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Prazo</div>
              <div className="text-sm font-medium">
                {config.registration_deadline
                  ? new Date(config.registration_deadline).toLocaleDateString("pt-BR")
                  : "Sem prazo"}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Descrição</div>
              <div className="text-sm font-medium">{config.description || "—"}</div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{config ? "Editar ingresso" : "Configurar ingresso"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Preço (R$)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={(priceCents / 100).toFixed(2)}
                onChange={(e) => setPriceCents(Math.round(Number(e.target.value) * 100))}
              />
              <p className="text-xs text-muted-foreground">0 = gratuito com inscrição</p>
            </div>
            <div className="space-y-1.5">
              <Label>Capacidade máxima (opcional)</Label>
              <Input
                type="number"
                min={1}
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(e.target.value)}
                placeholder="Ilimitada"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Prazo de inscrição (opcional)</Label>
              <Input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="O que o ingresso inclui"
              />
            </div>
          </div>
          <Button
            className="mt-2 w-full"
            onClick={handleSave}
            disabled={createConfig.isPending || updateConfig.isPending}
          >
            Salvar
          </Button>
        </DialogContent>
      </Dialog>
    </DetailSection>
  );
}

function RegistrationSection({ eventId, isManager }: { eventId: string; isManager: boolean }) {
  const { data: config, isLoading: configLoading } = useTicketConfig(eventId);
  const { data: stats } = useRegistrationStats(eventId);
  const { data: myReg } = useMyRegistration(eventId);
  const { data: allRegs } = useRegistrations(isManager ? eventId : undefined);
  const register = useRegisterForEvent();
  const cancel = useCancelRegistration();

  if (configLoading || !config) return null;

  const priceFmt = config.price_cents
    ? `R$ ${(config.price_cents / 100).toFixed(2).replace(".", ",")}`
    : "Gratuito";

  return (
    <DetailSection
      title="Inscrições"
      count={stats?.total ?? 0}
      action={
        <Badge variant="outline" className="gap-1.5">
          <Ticket className="h-3.5 w-3.5" />
          {priceFmt}
        </Badge>
      }
    >
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Confirmados" value={stats.confirmed} />
          <StatCard label="Pendentes" value={stats.pending} />
          <StatCard
            label="Capacidade"
            value={stats.capacity != null ? `${stats.total}/${stats.capacity}` : stats.total}
          />
          {config.price_cents > 0 && (
            <StatCard
              label="Receita"
              value={`R$ ${(stats.revenue_cents / 100).toFixed(2).replace(".", ",")}`}
            />
          )}
        </div>
      )}

      {stats?.capacity != null && (
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(100, (stats.total / stats.capacity) * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {stats.total} de {stats.capacity} vagas preenchidas
          </p>
        </div>
      )}

      {!myReg && (
        <Button
          className="mt-3 w-full gap-1.5"
          disabled={register.isPending}
          onClick={() =>
            register.mutate(eventId, {
              onSuccess: (reg) => {
                toast.success(
                  reg.payment_url
                    ? "Inscrição feita! Conclua o pagamento."
                    : "Inscrição confirmada!",
                );
              },
              onError: (e) =>
                toast.error(apiErrorMessage(e, "Não foi possível fazer a inscrição.")),
            })
          }
        >
          <Users className="h-4 w-4" /> Inscrever-se
        </Button>
      )}

      {myReg && (
        <Card className="mt-3">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium">Sua inscrição</p>
              <Badge variant="outline">{PAYMENT_STATUS_LABEL[myReg.payment_status]}</Badge>
            </div>
            <div className="flex gap-2">
              {myReg.payment_url && myReg.payment_status === "pending" && (
                <Button size="sm" variant="outline" asChild>
                  <a href={myReg.payment_url} target="_blank" rel="noreferrer">
                    Pagar
                  </a>
                </Button>
              )}
              {canSelfCancel(myReg) && (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={cancel.isPending}
                  onClick={() =>
                    cancel.mutate(myReg.id, {
                      onSuccess: () => toast.success("Inscrição cancelada."),
                      onError: (e) =>
                        toast.error(apiErrorMessage(e, "Não foi possível cancelar a inscrição.")),
                    })
                  }
                >
                  Cancelar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isManager && allRegs && allRegs.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Todos os inscritos</h4>
          {allRegs.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div className="text-sm">{r.person.name}</div>
                <Badge variant="outline">{PAYMENT_STATUS_LABEL[r.payment_status]}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DetailSection>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function AddChecklistItemForm({ eventId, myKinds }: { eventId: string; myKinds: MinistryKind[] }) {
  const [ministryKind, setMinistryKind] = useState<MinistryKind>(myKinds[0]);
  const [text, setText] = useState("");
  const createItem = useCreateChecklistItem();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await createItem.mutateAsync({
      event_id: eventId,
      ministry_kind: ministryKind,
      text: text.trim(),
    });
    setText("");
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
      {myKinds.length > 1 && (
        <Select value={ministryKind} onValueChange={(v) => setMinistryKind(v as MinistryKind)}>
          <SelectTrigger className="w-40 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {myKinds.map((k) => (
              <SelectItem key={k} value={k}>
                {MINISTRY_LABEL[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Novo item do checklist"
        className="flex-1"
      />
      <Button type="submit" size="sm" disabled={createItem.isPending || !text.trim()}>
        Adicionar
      </Button>
    </form>
  );
}
