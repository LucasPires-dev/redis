// Organizers' list of an event's ticket types and batches ("Inteira", "Meia",
// "1º lote até 10/12"). With none, the event has a single ticket.
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiErrorMessage } from "@/lib/api/client";
import {
  MIN_PAID_PRICE_CENTS,
  formatTicketPrice,
  useDeleteTicketType,
  useSaveTicketType,
  type EventTicketConfig,
  type TicketType,
} from "@/lib/api/payments";
import { formatDateTime } from "@/lib/utils";

interface Draft {
  id?: string;
  name: string;
  priceCents: number;
  capacity: string;
  salesStart: string;
  salesEnd: string;
}

const EMPTY: Draft = { name: "", priceCents: 0, capacity: "", salesStart: "", salesEnd: "" };

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const toIso = (local: string) => (local ? new Date(local).toISOString() : null);

function salesWindow(t: TicketType) {
  if (t.sales_start && new Date(t.sales_start) > new Date())
    return `Vendas a partir de ${formatDateTime(t.sales_start)}`;
  if (t.sales_end)
    return `${t.on_sale ? "Vendas até" : "Vendas encerradas em"} ${formatDateTime(t.sales_end)}`;
  return null;
}

export function TicketTypesManager({ config }: { config: EventTicketConfig }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const save = useSaveTicketType();
  const remove = useDeleteTicketType();

  const priceError =
    draft && draft.priceCents > 0 && draft.priceCents < MIN_PAID_PRICE_CENTS
      ? `O mínimo de um ingresso pago é ${formatTicketPrice(MIN_PAID_PRICE_CENTS)}.`
      : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft || !draft.name.trim() || priceError) return;
    save.mutate(
      {
        id: draft.id,
        configId: config.id,
        name: draft.name.trim(),
        price_cents: draft.priceCents,
        capacity: draft.capacity ? Number(draft.capacity) : null,
        sales_start: toIso(draft.salesStart),
        sales_end: toIso(draft.salesEnd),
      },
      {
        onSuccess: () => {
          toast.success(draft.id ? "Ingresso atualizado." : "Ingresso criado.");
          setDraft(null);
        },
        onError: (err) => toast.error(apiErrorMessage(err, "Não foi possível salvar o ingresso.")),
      },
    );
  }

  return (
    <div className="space-y-2" data-testid="ticket-types">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">Tipos e lotes</h4>
          <p className="text-xs text-muted-foreground">
            {config.types.length
              ? "A pessoa escolhe um destes ao se inscrever."
              : "Sem tipos: vale o ingresso único acima. Crie tipos para inteira/meia ou lotes."}
          </p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDraft(EMPTY)}>
          <Plus className="h-4 w-4" /> Novo
        </Button>
      </div>

      {config.types.map((t) => (
        <div
          key={t.id}
          className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
        >
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
              {t.name}
              <span className="font-normal">{formatTicketPrice(t.price_cents)}</span>
              {!t.on_sale && <Badge variant="outline">Fora de venda</Badge>}
              {t.sold_out && <Badge variant="secondary">Esgotado</Badge>}
            </p>
            <p className="text-xs text-muted-foreground">
              {t.sold} vendido(s){t.capacity != null && ` de ${t.capacity}`}
              {salesWindow(t) && ` · ${salesWindow(t)}`}
            </p>
          </div>
          <div className="flex shrink-0">
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Editar ${t.name}`}
              onClick={() =>
                setDraft({
                  id: t.id,
                  name: t.name,
                  priceCents: t.price_cents,
                  capacity: t.capacity != null ? String(t.capacity) : "",
                  salesStart: toLocalInput(t.sales_start),
                  salesEnd: toLocalInput(t.sales_end),
                })
              }
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Apagar ${t.name}`}
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(t.id, {
                  onSuccess: () => toast.success("Ingresso apagado."),
                  onError: (err) => toast.error(apiErrorMessage(err, "Não foi possível apagar.")),
                })
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Editar ingresso" : "Novo ingresso"}</DialogTitle>
            <DialogDescription>
              Para um lote, defina até quando ele fica à venda e crie o próximo lote começando nessa
              data.
            </DialogDescription>
          </DialogHeader>
          {draft && (
            <form className="space-y-3" onSubmit={submit}>
              <div className="space-y-1.5">
                <Label htmlFor="type-name">Nome</Label>
                <Input
                  id="type-name"
                  value={draft.name}
                  maxLength={80}
                  placeholder="Ex.: Inteira, Meia, 1º lote"
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="type-price">Valor (R$)</Label>
                  <Input
                    id="type-price"
                    inputMode="numeric"
                    placeholder="0,00 = gratuito"
                    value={
                      draft.priceCents
                        ? (draft.priceCents / 100).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })
                        : ""
                    }
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 9);
                      setDraft({ ...draft, priceCents: digits ? Number(digits) : 0 });
                    }}
                    aria-invalid={!!priceError}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="type-capacity">Vagas (opcional)</Label>
                  <Input
                    id="type-capacity"
                    type="number"
                    min={1}
                    placeholder="Sem limite próprio"
                    value={draft.capacity}
                    onChange={(e) => setDraft({ ...draft, capacity: e.target.value })}
                  />
                </div>
              </div>
              {priceError && <p className="text-xs text-destructive">{priceError}</p>}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="type-start">À venda a partir de</Label>
                  <Input
                    id="type-start"
                    type="datetime-local"
                    value={draft.salesStart}
                    onChange={(e) => setDraft({ ...draft, salesStart: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="type-end">À venda até</Label>
                  <Input
                    id="type-end"
                    type="datetime-local"
                    value={draft.salesEnd}
                    onChange={(e) => setDraft({ ...draft, salesEnd: e.target.value })}
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={save.isPending || !draft.name.trim() || !!priceError}
              >
                Salvar
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
