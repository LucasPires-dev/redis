// Signing up for an event: pick the ticket (type or batch), add companions
// and register. When the places are gone, join the waitlist instead; when a
// place opens for the person, it is held for them here.
import { useState } from "react";
import { toast } from "sonner";
import { Clock, Hourglass, Plus, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCpfPrompt } from "@/hooks/use-cpf-prompt";
import { ApiError, apiErrorMessage } from "@/lib/api/client";
import {
  formatTicketPrice,
  useJoinWaitlist,
  useLeaveWaitlist,
  useMyWaitlist,
  useRegisterForEvent,
  type EventTicketConfig,
} from "@/lib/api/payments";
import { cn, formatDateTime } from "@/lib/utils";

export function SignUpPanel({ eventId, config }: { eventId: string; config: EventTicketConfig }) {
  const types = config.types.filter((t) => t.on_sale);
  const firstAvailable = types.find((t) => !t.sold_out) ?? types[0];
  const [typeId, setTypeId] = useState<string | undefined>(firstAvailable?.id);
  const [guests, setGuests] = useState<string[]>([]);
  const { data: waiting } = useMyWaitlist(eventId);
  const register = useRegisterForEvent();
  const join = useJoinWaitlist();
  const leave = useLeaveWaitlist();
  const cpf = useCpfPrompt();

  const hasTypes = config.types.length > 0;
  const chosen = types.find((t) => t.id === typeId);
  const unit = chosen ? chosen.price_cents : config.price_cents;
  const seats = 1 + guests.length;
  const total = unit * seats;
  const full = config.free_seats !== null && config.free_seats < seats;
  const offer = waiting?.offer_expires_at ? waiting : null;

  if (hasTypes && types.length === 0) {
    return (
      <p className="rounded-lg bg-muted px-3 py-3 text-center text-sm text-muted-foreground">
        Nenhum ingresso à venda no momento.
      </p>
    );
  }

  const signUp = (cpfValue?: string) =>
    register.mutate(
      {
        eventId,
        cpf: cpfValue,
        ticketTypeId: hasTypes ? typeId : undefined,
        guestNames: guests.map((g) => g.trim()),
      },
      {
        onSuccess: (reg) => {
          setGuests([]);
          toast.success(
            reg.payment_url ? "Inscrição feita! Conclua o pagamento." : "Inscrição confirmada!",
          );
        },
        onError: (e) => {
          if (e instanceof ApiError && (e.detail as { code?: string })?.code === "full") {
            toast.error("As vagas acabaram. Você pode entrar na lista de espera.");
            return;
          }
          cpf.handleError(e, "Não foi possível fazer a inscrição.", (c) => signUp(c));
        },
      },
    );

  const guestsMissingName = guests.some((g) => !g.trim());

  return (
    <div className="space-y-4" data-testid="signup-panel">
      {hasTypes && (
        <div className="space-y-2" role="radiogroup" aria-label="Ingresso">
          {types.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={t.id === typeId}
              disabled={t.sold_out}
              onClick={() => setTypeId(t.id)}
              data-testid="ticket-type"
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                t.id === typeId ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                t.sold_out && "cursor-not-allowed opacity-60",
              )}
            >
              <span className="min-w-0">
                <span className="block font-medium">{t.name}</span>
                {t.sold_out ? (
                  <span className="text-xs text-muted-foreground">Esgotado</span>
                ) : (
                  t.sales_end && (
                    <span className="text-xs text-muted-foreground">
                      Até {formatDateTime(t.sales_end)}
                    </span>
                  )
                )}
              </span>
              <span className="shrink-0 font-semibold">{formatTicketPrice(t.price_cents)}</span>
            </button>
          ))}
        </div>
      )}

      {config.max_companions > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Users className="h-4 w-4" /> Acompanhantes
            <span className="font-normal text-muted-foreground">(até {config.max_companions})</span>
          </Label>
          {guests.map((g, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={g}
                onChange={(e) => setGuests(guests.map((x, j) => (j === i ? e.target.value : x)))}
                placeholder={`Nome do acompanhante ${i + 1}`}
                aria-label={`Nome do acompanhante ${i + 1}`}
                maxLength={150}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Remover acompanhante"
                onClick={() => setGuests(guests.filter((_, j) => j !== i))}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {guests.length < config.max_companions && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setGuests([...guests, ""])}
            >
              <Plus className="h-4 w-4" /> Adicionar acompanhante
            </Button>
          )}
        </div>
      )}

      {offer && (
        <p
          className="flex items-start gap-2 rounded-lg bg-emerald-500/10 px-3 py-2.5 text-sm font-medium text-emerald-800 dark:text-emerald-300"
          data-testid="waitlist-offer"
        >
          <Clock className="mt-0.5 h-4 w-4 shrink-0" />
          Abriu vaga! Guardamos {offer.seats === 1 ? "uma vaga" : `${offer.seats} vagas`} para você
          até {formatDateTime(offer.offer_expires_at!)}.
        </p>
      )}

      {full && !offer ? (
        waiting ? (
          <div
            className="space-y-2 rounded-lg border border-dashed p-3 text-sm"
            data-testid="waitlist-status"
          >
            <p className="flex items-center gap-2 font-medium">
              <Hourglass className="h-4 w-4" /> Você está na lista de espera ({waiting.position}º)
            </p>
            <p className="text-muted-foreground">
              Se abrir vaga, ela fica guardada para você e avisamos na hora.
            </p>
            <Button
              size="sm"
              variant="ghost"
              disabled={leave.isPending}
              onClick={() =>
                leave.mutate(waiting.id, {
                  onSuccess: () => toast.success("Você saiu da lista de espera."),
                  onError: (e) => toast.error(apiErrorMessage(e, "Não foi possível.")),
                })
              }
            >
              Sair da lista
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-center text-sm font-medium">
              {config.free_seats ? `Só restam ${config.free_seats} vaga(s).` : "Vagas esgotadas."}
            </p>
            <Button
              className="w-full"
              variant="secondary"
              disabled={join.isPending}
              onClick={() =>
                join.mutate(
                  { eventId, companions: guests.length },
                  {
                    onSuccess: () => toast.success("Você entrou na lista de espera."),
                    onError: (e) => toast.error(apiErrorMessage(e, "Não foi possível.")),
                  },
                )
              }
            >
              Entrar na lista de espera
            </Button>
          </div>
        )
      ) : (
        <Button
          className="w-full"
          disabled={register.isPending || guestsMissingName || (hasTypes && !chosen)}
          onClick={() => signUp()}
        >
          Inscrever-se{seats > 1 && ` (${seats} pessoas)`}
          {total > 0 && ` · ${formatTicketPrice(total)}`}
        </Button>
      )}
      {cpf.dialog}
    </div>
  );
}
