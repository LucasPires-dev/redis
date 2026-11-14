import { Check, Mail, Phone, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DetailSection } from "@/components/detail/DetailSection";
import { apiErrorMessage } from "@/lib/api/client";
import { useAnswerCellJoin, useCellJoinRequests } from "@/lib/api/cellJoin";
import { formatTimeAgo } from "@/lib/utils";

/**
 * "Quero participar" requests of a public cell, for its leadership: accept
 * (the person becomes a visitor and gets the address) or decline. Hidden when
 * there is none.
 */
export function CellJoinRequestsSection({ cellId }: { cellId: string }) {
  const { data: requests } = useCellJoinRequests(cellId, true);
  const accept = useAnswerCellJoin("accept");
  const decline = useAnswerCellJoin("decline");

  if (!requests?.length) return null;

  const answer = (id: string, accepted: boolean) =>
    (accepted ? accept : decline).mutate(id, {
      onSuccess: () =>
        toast.success(
          accepted
            ? "Pedido aceito: a pessoa entrou nos visitantes e recebeu o endereço."
            : "Pedido recusado.",
        ),
      onError: (e) => toast.error(apiErrorMessage(e, "Não foi possível responder.")),
    });

  return (
    <DetailSection title="Querem participar" count={requests.length}>
      <div className="space-y-2" data-testid="cell-join-requests">
        {requests.map((r) => (
          <Card key={r.id} data-testid="cell-join-request">
            <CardContent className="space-y-2 p-4">
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-medium">{r.person?.name}</div>
                <div className="shrink-0 text-xs text-muted-foreground">
                  {formatTimeAgo(r.created_at)}
                </div>
              </div>
              {r.message && <p className="text-sm">“{r.message}”</p>}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {r.person?.phone && (
                  <a href={`tel:${r.person.phone}`} className="inline-flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> {r.person.phone}
                  </a>
                )}
                {r.person?.email && (
                  <a href={`mailto:${r.person.email}`} className="inline-flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" /> {r.person.email}
                  </a>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={accept.isPending || decline.isPending}
                  onClick={() => answer(r.id, true)}
                >
                  <Check className="h-4 w-4" /> Aceitar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={accept.isPending || decline.isPending}
                  onClick={() => answer(r.id, false)}
                >
                  <X className="h-4 w-4" /> Recusar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DetailSection>
  );
}
