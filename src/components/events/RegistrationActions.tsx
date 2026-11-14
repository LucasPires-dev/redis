// What the organizers can do with someone's registration: refund a paid one
// (through Asaas, or recorded as given back by hand when Asaas can't — a
// boleto) or cancel one that wasn't paid.
import { useState } from "react";
import { toast } from "sonner";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ApiError, apiErrorMessage } from "@/lib/api/client";
import {
  formatBRL,
  useCancelRegistration,
  useRefundRegistration,
  type EventRegistration,
} from "@/lib/api/payments";

/** The API's message when the money must go back by hand, else null. */
function manualRefundMessage(err: unknown): string | null {
  if (!(err instanceof ApiError) || !err.detail || typeof err.detail !== "object") return null;
  const body = err.detail as Record<string, unknown>;
  const first = (v: unknown) => String(Array.isArray(v) ? v[0] : (v ?? ""));
  return first(body.code) === "manual_refund_required" ? first(body.detail) : null;
}

export function RegistrationActions({ registration }: { registration: EventRegistration }) {
  const [dialog, setDialog] = useState<"refund" | "cancel" | null>(null);
  const status = registration.payment_status;
  const paid = status === "confirmed" && registration.amount_cents > 0;
  const cancellable = status === "pending" || (status === "confirmed" && !paid);
  if (!paid && !cancellable) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Ações da inscrição">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {paid ? (
            <DropdownMenuItem onSelect={() => setDialog("refund")}>Reembolsar</DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => setDialog("cancel")}>
              Cancelar inscrição
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {dialog === "refund" && (
        <RefundDialog registration={registration} onClose={() => setDialog(null)} />
      )}
      {dialog === "cancel" && (
        <CancelDialog registration={registration} onClose={() => setDialog(null)} />
      )}
    </>
  );
}

function RefundDialog({
  registration,
  onClose,
}: {
  registration: EventRegistration;
  onClose: () => void;
}) {
  const refund = useRefundRegistration();
  const [note, setNote] = useState("");
  // Set when Asaas can't refund: the organizers give the money back by hand.
  const [manualMessage, setManualMessage] = useState<string | null>(null);

  function submit(manual: boolean) {
    refund.mutate(
      { id: registration.id, note: note.trim(), manual },
      {
        onSuccess: () => {
          toast.success(manual ? "Devolução registrada." : "Reembolso feito.");
          onClose();
        },
        onError: (err) => {
          const message = manualRefundMessage(err);
          if (message) setManualMessage(message);
          else toast.error(apiErrorMessage(err, "Não foi possível reembolsar."));
        },
      },
    );
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reembolsar {registration.person.name}</DialogTitle>
          <DialogDescription>
            {formatBRL(registration.amount_cents)} voltam para quem pagou e a vaga é liberada
            {registration.guests.length > 0 ? ", com a dos acompanhantes" : ""}. A pessoa é avisada.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="refund-note">Motivo (opcional)</Label>
          <Input
            id="refund-note"
            value={note}
            maxLength={120}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex.: não pôde ir"
          />
        </div>
        {manualMessage && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {manualMessage}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Voltar
          </Button>
          {manualMessage ? (
            <Button disabled={refund.isPending} onClick={() => submit(true)}>
              Já devolvi por fora
            </Button>
          ) : (
            <Button variant="destructive" disabled={refund.isPending} onClick={() => submit(false)}>
              Reembolsar {formatBRL(registration.amount_cents)}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelDialog({
  registration,
  onClose,
}: {
  registration: EventRegistration;
  onClose: () => void;
}) {
  const cancel = useCancelRegistration();
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar a inscrição de {registration.person.name}?</DialogTitle>
          <DialogDescription>
            A vaga é liberada e a pessoa é avisada.
            {registration.payment_status === "pending" ? " A cobrança em aberto é cancelada." : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Voltar
          </Button>
          <Button
            variant="destructive"
            disabled={cancel.isPending}
            onClick={() =>
              cancel.mutate(registration.id, {
                onSuccess: () => {
                  toast.success("Inscrição cancelada.");
                  onClose();
                },
                onError: (e) => toast.error(apiErrorMessage(e, "Não foi possível cancelar.")),
              })
            }
          >
            Cancelar inscrição
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
