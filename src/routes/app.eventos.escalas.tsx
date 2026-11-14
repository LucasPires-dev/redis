import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeftRight, CalendarDays, Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { EmptyState } from "@/components/detail/DetailSection";
import { CardGridSkeleton } from "@/components/skeletons";
import { useAuth } from "@/lib/api/auth";
import { apiErrorMessage } from "@/lib/api/client";
import {
  useAnswerSwap,
  useConfirmRosterEntry,
  useDeclineRosterEntry,
  useMyRoster,
  useMySwaps,
  useRequestSwap,
  useSwapCandidates,
  type RosterEntry,
  type RosterStatus,
  type RosterSwap,
} from "@/lib/api/production";
import { formatDateTime } from "@/lib/utils";

// "Minhas escalas": where the person serves. Answer invitations, ask someone of
// the same ministry to take your place, and answer the swaps asked of you.
// A personal tab: always there, whatever else the person does.
export const Route = createFileRoute("/app/eventos/escalas")({
  head: () => ({ meta: [{ title: "Minhas escalas — Redis" }] }),
  component: MyRoster,
});

const STATUS_LABEL: Record<RosterStatus, string> = {
  invited: "Aguardando sua resposta",
  confirmed: "Confirmado",
  declined: "Recusado",
};

const STATUS_VARIANT: Record<RosterStatus, "default" | "secondary" | "outline" | "destructive"> = {
  invited: "destructive",
  confirmed: "default",
  declined: "outline",
};

const place = (ministry: string, fn: string) => (fn ? `${ministry} · ${fn}` : ministry);

function MyRoster() {
  const { me } = useAuth();
  const { data: entries, isLoading } = useMyRoster();
  const { data: swaps } = useMySwaps();
  const askedOfMe = (swaps ?? []).filter((s) => s.substitute.id === me?.id);

  if (isLoading) return <CardGridSkeleton />;

  return (
    <div className="space-y-6">
      {askedOfMe.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Pedidos de troca para você</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {askedOfMe.map((swap) => (
              <SwapRequestCard key={swap.id} swap={swap} />
            ))}
          </div>
        </section>
      )}

      {!entries?.length ? (
        <EmptyState>Você não está escalado(a) em nenhum evento por enquanto.</EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

function EntryCard({ entry }: { entry: RosterEntry }) {
  const confirm = useConfirmRosterEntry(entry.event.id);
  const decline = useDeclineRosterEntry(entry.event.id);
  const cancelSwap = useAnswerSwap("cancel");
  const busy = confirm.isPending || decline.isPending;
  const fail = (e: unknown) => toast.error(apiErrorMessage(e, "Não foi possível."));

  return (
    <Card data-testid="my-roster-entry" className="h-full">
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              to="/app/eventos/$id"
              params={{ id: entry.event.id }}
              className="font-semibold tracking-tight hover:underline"
            >
              {entry.event.title}
            </Link>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" /> {formatDateTime(entry.event.starts_at)}
            </p>
            <p className="text-sm">{place(entry.ministry.name, entry.function)}</p>
          </div>
          <Badge variant={STATUS_VARIANT[entry.status]} className="shrink-0">
            {STATUS_LABEL[entry.status]}
          </Badge>
        </div>

        {entry.conflicts.length > 0 && (
          <p
            className="flex items-start gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-2 text-xs text-amber-800 dark:text-amber-300"
            data-testid="roster-conflict"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            No mesmo horário você também serve em {entry.conflicts.map((c) => c.title).join(", ")}.
          </p>
        )}

        {entry.pending_swap && (
          <div className="flex items-center justify-between gap-2 rounded-md bg-muted px-2.5 py-2 text-xs">
            <span className="flex items-center gap-1.5">
              <Repeat className="h-3.5 w-3.5" /> Aguardando {entry.pending_swap.substitute.name}{" "}
              aceitar a troca
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7"
              disabled={cancelSwap.isPending}
              onClick={() =>
                cancelSwap.mutate(entry.pending_swap!.id, {
                  onSuccess: () => toast.success("Pedido de troca cancelado."),
                  onError: fail,
                })
              }
            >
              Cancelar
            </Button>
          </div>
        )}

        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          {entry.status === "invited" && (
            <>
              <Button
                size="sm"
                disabled={busy}
                onClick={() =>
                  confirm.mutate(entry.id, {
                    onSuccess: () => toast.success("Presença confirmada. Obrigado por servir!"),
                    onError: fail,
                  })
                }
              >
                Confirmar
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  decline.mutate(entry.id, {
                    onSuccess: () => toast.success("Escala recusada. A liderança foi avisada."),
                    onError: fail,
                  })
                }
              >
                Recusar
              </Button>
            </>
          )}
          {entry.status !== "declined" && !entry.pending_swap && <SwapDialog entry={entry} />}
        </div>
      </CardContent>
    </Card>
  );
}

function SwapDialog({ entry }: { entry: RosterEntry }) {
  const [open, setOpen] = useState(false);
  const [substitute, setSubstitute] = useState("");
  const [message, setMessage] = useState("");
  const { data: candidates, isLoading } = useSwapCandidates(open ? entry.id : undefined);
  const request = useRequestSwap();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="gap-1.5">
          <ArrowLeftRight className="h-4 w-4" /> Pedir troca
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pedir troca</DialogTitle>
          <DialogDescription>
            Escolha alguém de {entry.ministry.name} para servir no seu lugar em {entry.event.title}.
            Quando a pessoa aceitar, a vaga passa para ela.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!substitute) return;
            request.mutate(
              { entryId: entry.id, substitute_id: substitute, message },
              {
                onSuccess: () => {
                  toast.success("Pedido enviado. Avisaremos quando a pessoa responder.");
                  setOpen(false);
                  setSubstitute("");
                  setMessage("");
                },
                onError: (err) =>
                  toast.error(apiErrorMessage(err, "Não foi possível pedir a troca.")),
              },
            );
          }}
        >
          <div className="space-y-1.5">
            <Label>Quem vai no seu lugar</Label>
            <Select value={substitute} onValueChange={setSubstitute}>
              <SelectTrigger aria-label="Quem vai no seu lugar">
                <SelectValue placeholder={isLoading ? "Carregando…" : "Selecione"} />
              </SelectTrigger>
              <SelectContent>
                {(candidates ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.conflict ? " (já serve nesse horário)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {candidates && candidates.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Não há mais ninguém no ministério para trocar. Fale com a liderança.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="swap-message">Recado (opcional)</Label>
            <Textarea
              id="swap-message"
              value={message}
              maxLength={300}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex.: vou estar viajando nesse fim de semana"
            />
          </div>
          <Button type="submit" className="w-full" disabled={!substitute || request.isPending}>
            Enviar pedido
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SwapRequestCard({ swap }: { swap: RosterSwap }) {
  const accept = useAnswerSwap("accept");
  const decline = useAnswerSwap("decline");
  const busy = accept.isPending || decline.isPending;
  const fail = (e: unknown) => toast.error(apiErrorMessage(e, "Não foi possível."));

  return (
    <Card data-testid="swap-request" className="border-primary/40">
      <CardContent className="space-y-3 p-4">
        <div>
          <p className="text-sm">
            <span className="font-medium">{swap.requested_by.name}</span> pediu para você servir no
            lugar dele(a):
          </p>
          <p className="font-semibold tracking-tight">{swap.entry.event.title}</p>
          <p className="text-sm text-muted-foreground">
            {formatDateTime(swap.entry.event.starts_at)} ·{" "}
            {place(swap.entry.ministry.name, swap.entry.function)}
          </p>
          {swap.message && <p className="mt-1 text-sm italic">“{swap.message}”</p>}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              accept.mutate(swap.id, {
                onSuccess: () => toast.success("Troca aceita. Agora a escala é sua."),
                onError: fail,
              })
            }
          >
            Aceitar
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              decline.mutate(swap.id, {
                onSuccess: () => toast.success("Troca recusada."),
                onError: fail,
              })
            }
          >
            Não posso
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
