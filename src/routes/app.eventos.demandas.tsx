import { useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { capabilitiesOf, useAuth } from "@/lib/api/auth";
import { MINISTRY_LABEL, PRODUCTION_MINISTRY_KINDS, type MinistryKind } from "@/lib/api/ministries";
import {
  useAcceptDemand,
  useCompleteDemand,
  useCreateDemand,
  useDemands,
  useEvents,
  useRejectDemand,
  type Demand,
  type DemandPriority,
  type DemandType,
} from "@/lib/api/production";

// "Demandas": requests between ministries, received and sent. Only whoever may
// answer a demand sees Aceitar/Recusar/Concluir (demand.can_answer).
export const Route = createFileRoute("/app/eventos/demandas")({
  head: () => ({ meta: [{ title: "Demandas — Redis" }] }),
  component: DemandsPage,
});

const DEMAND_TYPE_LABEL: Record<DemandType, string> = {
  slide: "Pedido de slide",
  technical_adjustment: "Ajuste técnico",
  repertoire_change: "Mudança de repertório",
  stage_setup: "Montagem de palco",
  material: "Material",
  other: "Outro",
};

const PRIORITY_LABEL: Record<DemandPriority, string> = {
  urgent: "Urgente",
  normal: "Normal",
  planning: "Planejamento",
};

const PRIORITY_VARIANT: Record<DemandPriority, "destructive" | "default" | "outline"> = {
  urgent: "destructive",
  normal: "default",
  planning: "outline",
};

const STATUS_LABEL: Record<Demand["status"], string> = {
  open: "Aberta",
  in_progress: "Em andamento",
  done: "Concluída",
  rejected: "Recusada",
};

function DemandsPage() {
  const { me } = useAuth();
  const { data: received, isLoading: receivedLoading } = useDemands("received");
  const { data: sent, isLoading: sentLoading } = useDemands("sent");
  const [dialogOpen, setDialogOpen] = useState(false);
  // Only ministry leaders send demands (the API checks the sending ministry).
  const canSend = myMinistryKinds(me).length > 0;

  if (me && !capabilitiesOf(me).events.production) return <Navigate to="/app/eventos" replace />;

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Pedidos entre ministérios{me?.campus ? ` · ${me.campus.name}` : ""}
        </p>
        {canSend && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> Nova
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova demanda</DialogTitle>
              </DialogHeader>
              <NewDemandForm onDone={() => setDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="recebidas">
        <TabsList>
          <TabsTrigger value="recebidas">Recebidas</TabsTrigger>
          <TabsTrigger value="enviadas">Enviadas</TabsTrigger>
        </TabsList>
        <TabsContent value="recebidas" className="mt-4">
          <DemandList demands={received} isLoading={receivedLoading} />
        </TabsContent>
        <TabsContent value="enviadas" className="mt-4">
          <DemandList demands={sent} isLoading={sentLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DemandList({ demands, isLoading }: { demands: Demand[] | undefined; isLoading: boolean }) {
  const accept = useAcceptDemand();
  const complete = useCompleteDemand();
  const reject = useRejectDemand();

  if (isLoading && !demands) {
    return <p className="text-sm text-muted-foreground">Carregando…</p>;
  }
  if (!demands || demands.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma demanda por aqui.</p>;
  }

  return (
    <div className="space-y-3">
      {demands.map((d) => (
        <Card key={d.id}>
          <CardContent className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">
                  {d.from_ministry_kind ? MINISTRY_LABEL[d.from_ministry_kind] : "Evento"} →{" "}
                  {MINISTRY_LABEL[d.to_ministry_kind]}
                </div>
                <div className="text-xs text-muted-foreground">
                  {DEMAND_TYPE_LABEL[d.demand_type]}
                  {d.event ? ` · ${d.event.title}` : ""}
                  {d.due_date ? ` · prazo ${new Date(d.due_date).toLocaleDateString("pt-BR")}` : ""}
                </div>
              </div>
              <Badge variant={PRIORITY_VARIANT[d.priority]}>{PRIORITY_LABEL[d.priority]}</Badge>
            </div>
            {d.description && <p className="text-sm">{d.description}</p>}
            <div className="flex items-center justify-between gap-2 pt-1">
              <Badge variant="outline">{STATUS_LABEL[d.status]}</Badge>
              {d.can_answer && d.status === "open" && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={reject.isPending}
                    onClick={() => reject.mutate({ id: d.id })}
                  >
                    Recusar
                  </Button>
                  <Button size="sm" disabled={accept.isPending} onClick={() => accept.mutate(d.id)}>
                    Aceitar
                  </Button>
                </div>
              )}
              {d.can_answer && d.status === "in_progress" && (
                <Button
                  size="sm"
                  disabled={complete.isPending}
                  onClick={() => complete.mutate(d.id)}
                >
                  Concluir
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function myMinistryKinds(
  me: { led_ministries: { kind: MinistryKind }[]; general_led_kinds: MinistryKind[] } | undefined,
) {
  if (!me) return [];
  return Array.from(
    new Set<MinistryKind>([...me.led_ministries.map((m) => m.kind), ...me.general_led_kinds]),
  );
}

function NewDemandForm({ onDone }: { onDone: () => void }) {
  const { me } = useAuth();
  const { data: events } = useEvents();
  const createDemand = useCreateDemand();
  const myKinds = myMinistryKinds(me);

  const [fromKind, setFromKind] = useState<MinistryKind | "">(myKinds[0] ?? "");
  const [toKind, setToKind] = useState<MinistryKind | "">("");
  const [eventId, setEventId] = useState<string>("");
  const [demandType, setDemandType] = useState<DemandType>("other");
  const [priority, setPriority] = useState<DemandPriority>("normal");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!fromKind || !toKind) {
      setError("Selecione o ministério de origem e destino.");
      return;
    }
    try {
      await createDemand.mutateAsync({
        from_ministry_kind: fromKind,
        from_campus_id: me?.campus?.id ?? null,
        to_ministry_kind: toKind,
        to_campus_id: me?.campus?.id ?? null,
        event_id: eventId || null,
        demand_type: demandType,
        priority,
        due_date: dueDate || null,
        description,
      });
      onDone();
    } catch {
      setError("Não foi possível criar a demanda. Verifique se você tem permissão.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {myKinds.length > 1 && (
        <div className="space-y-1.5">
          <Label>De (seu ministério)</Label>
          <Select value={fromKind} onValueChange={(v) => setFromKind(v as MinistryKind)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
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

      <div className="space-y-1.5">
        <Label>Para</Label>
        <Select value={toKind} onValueChange={(v) => setToKind(v as MinistryKind)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o ministério" />
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
        <Label>Culto/Evento (opcional)</Label>
        <Select value={eventId} onValueChange={setEventId}>
          <SelectTrigger>
            <SelectValue placeholder="Nenhum" />
          </SelectTrigger>
          <SelectContent>
            {(events ?? []).map((ev) => (
              <SelectItem key={ev.id} value={ev.id}>
                {ev.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
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
              {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Prazo (opcional)</Label>
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label>Descrição (opcional)</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={createDemand.isPending}>
        Enviar
      </Button>
    </form>
  );
}
