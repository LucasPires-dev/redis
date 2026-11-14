import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, Hourglass, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiErrorMessage } from "@/lib/api/client";
import { useAnswerCellJoin, useAskToJoinCell, useMyCellJoinRequests } from "@/lib/api/cellJoin";

/**
 * "Quero participar" on a cell's public page. Without an account: sign up or
 * log in and come back. With one: ask (with an optional message), wait, and
 * once the leadership accepts, see where and with whom.
 */
export function JoinCellPanel({ cellId, signedIn }: { cellId: string; signedIn: boolean }) {
  if (!signedIn) {
    return (
      <div className="space-y-2">
        <Button asChild className="h-11 w-full">
          <Link to="/cadastro" search={{ celula: cellId }}>
            Criar conta e pedir para participar
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-11 w-full">
          <Link to="/login" search={{ redirect: `/celula/${cellId}` }}>
            Já tenho conta
          </Link>
        </Button>
      </div>
    );
  }
  return <SignedInPanel cellId={cellId} />;
}

function SignedInPanel({ cellId }: { cellId: string }) {
  const { data: requests, isLoading } = useMyCellJoinRequests(cellId, true);
  const ask = useAskToJoinCell();
  const cancel = useAnswerCellJoin("cancel");
  const [message, setMessage] = useState("");

  if (isLoading) return null;
  const latest = requests?.[0];

  if (latest?.status === "approved") {
    const cell = latest.cell;
    return (
      <div className="space-y-3 rounded-lg border p-4" data-testid="cell-accepted">
        <p className="text-sm font-medium text-primary">Você foi aceito na célula!</p>
        <div className="text-lg font-semibold">{cell.name}</div>
        {cell.address && (
          <p className="flex items-start gap-1.5 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {cell.address}
          </p>
        )}
        <p className="flex items-center gap-1.5 text-sm">
          <Clock className="h-4 w-4 shrink-0" />
          {[cell.meeting_day_display, cell.meeting_time].filter(Boolean).join(", ")}
        </p>
        {!!cell.leaders?.length && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Liderança</div>
            {cell.leaders.map((l) => (
              <div key={l.name} className="flex items-center justify-between gap-2 text-sm">
                <span>{l.name}</span>
                {l.phone && (
                  <a
                    href={`tel:${l.phone}`}
                    className="inline-flex items-center gap-1 text-primary"
                  >
                    <Phone className="h-3.5 w-3.5" /> {l.phone}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (latest?.status === "pending") {
    return (
      <div className="space-y-3 rounded-lg border p-4" data-testid="cell-request-pending">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <Hourglass className="h-4 w-4" /> Pedido enviado
        </p>
        <p className="text-sm text-muted-foreground">
          A liderança da célula vai responder. Você recebe um aviso com o endereço quando for
          aceito.
        </p>
        <Button
          variant="outline"
          className="w-full"
          disabled={cancel.isPending}
          onClick={() =>
            cancel.mutate(latest.id, {
              onSuccess: () => toast.success("Pedido cancelado."),
              onError: (e) => toast.error(apiErrorMessage(e, "Não foi possível cancelar.")),
            })
          }
        >
          Cancelar pedido
        </Button>
      </div>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        ask.mutate(
          { cellId, message: message.trim() },
          {
            onSuccess: () => {
              setMessage("");
              toast.success("Pedido enviado à liderança da célula.");
            },
            onError: (err) => toast.error(apiErrorMessage(err, "Não foi possível enviar.")),
          },
        );
      }}
    >
      {latest?.status === "rejected" && (
        <p className="text-sm text-muted-foreground">
          A liderança não pôde aceitar seu último pedido. Você pode pedir de novo ou procurar outra
          célula.
        </p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="join-message">Mensagem para a liderança (opcional)</Label>
        <Textarea
          id="join-message"
          rows={2}
          maxLength={300}
          placeholder="Ex.: moro no bairro e gostaria de conhecer"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>
      <Button type="submit" className="h-11 w-full" disabled={ask.isPending}>
        Quero participar
      </Button>
    </form>
  );
}
