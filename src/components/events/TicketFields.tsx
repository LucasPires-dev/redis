import { Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import type { TicketDraft, TicketErrors } from "./ticket-draft";

/** Typing "15000" shows "150,00": digits fill the value from the cents up. */
function maskCents(raw: string): number {
  const digits = raw.replace(/\D/g, "").slice(0, 9);
  return digits ? Number(digits) : 0;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs text-destructive">
      {message}
    </p>
  );
}

export function TicketFields({
  value,
  onChange,
  errors = {},
  idPrefix = "ticket",
}: {
  value: TicketDraft;
  onChange: (next: TicketDraft) => void;
  errors?: TicketErrors;
  idPrefix?: string;
}) {
  const set = <K extends keyof TicketDraft>(key: K, v: TicketDraft[K]) =>
    onChange({ ...value, [key]: v });
  const ids = {
    price: `${idPrefix}-price`,
    capacity: `${idPrefix}-capacity`,
    deadline: `${idPrefix}-deadline`,
    description: `${idPrefix}-description`,
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Tipo de ingresso</Label>
        <ToggleGroup
          type="single"
          variant="outline"
          value={value.mode}
          onValueChange={(v) => v && set("mode", v as TicketDraft["mode"])}
          className="grid grid-cols-2"
          aria-label="Tipo de ingresso"
        >
          <ToggleGroupItem value="free">Gratuito</ToggleGroupItem>
          <ToggleGroupItem value="paid">Pago</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {value.mode === "paid" && (
        <div className="space-y-1.5">
          <Label htmlFor={ids.price}>Valor do ingresso</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              R$
            </span>
            <Input
              id={ids.price}
              inputMode="numeric"
              autoComplete="off"
              className="pl-9"
              placeholder="0,00"
              value={
                value.priceCents
                  ? (value.priceCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })
                  : ""
              }
              onChange={(e) => set("priceCents", maskCents(e.target.value))}
              aria-invalid={!!errors.priceCents}
              aria-describedby={errors.priceCents ? `${ids.price}-error` : undefined}
            />
          </div>
          <FieldError id={`${ids.price}-error`} message={errors.priceCents} />
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Cada inscrito recebe um link de pagamento (Pix, boleto ou cartão) com vencimento em 3
            dias. A vaga só é confirmada após o pagamento.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={ids.capacity}>Vagas (opcional)</Label>
          <Input
            id={ids.capacity}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            placeholder="Ilimitadas"
            value={value.maxCapacity}
            onChange={(e) => set("maxCapacity", e.target.value)}
            aria-invalid={!!errors.maxCapacity}
            aria-describedby={errors.maxCapacity ? `${ids.capacity}-error` : undefined}
          />
          <FieldError id={`${ids.capacity}-error`} message={errors.maxCapacity} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={ids.deadline}>Inscrições até (opcional)</Label>
          <Input
            id={ids.deadline}
            type="datetime-local"
            value={value.deadline}
            onChange={(e) => set("deadline", e.target.value)}
            aria-invalid={!!errors.deadline}
            aria-describedby={errors.deadline ? `${ids.deadline}-error` : undefined}
          />
          <FieldError id={`${ids.deadline}-error`} message={errors.deadline} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={ids.description}>O que o ingresso inclui (opcional)</Label>
        <Textarea
          id={ids.description}
          rows={2}
          placeholder="Ex.: hospedagem, alimentação e camiseta"
          value={value.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>
    </div>
  );
}
