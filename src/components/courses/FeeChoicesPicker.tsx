import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ClassFeeItem } from "@/lib/api/courses";
import { installmentOptions, selectionTotal, type FeeSelection } from "@/lib/fee-selection";
import { formatBRL } from "@/lib/api/payments";

interface Props {
  items: ClassFeeItem[];
  selection: FeeSelection;
  onChange: (selection: FeeSelection) => void;
  maxInstallments: number;
  installments: number;
  onInstallmentsChange: (n: number) => void;
}

export function FeeChoicesPicker({
  items,
  selection,
  onChange,
  maxInstallments,
  installments,
  onInstallmentsChange,
}: Props) {
  const total = selectionTotal(items, selection);
  const counts = installmentOptions(total, maxInstallments);

  const toggle = (id: string, on: boolean) => {
    const next = { ...selection };
    if (on) next[id] = "";
    else delete next[id];
    onChange(next);
    if (!installmentOptions(selectionTotal(items, next), maxInstallments).includes(installments)) {
      onInstallmentsChange(1);
    }
  };

  return (
    <div className="space-y-3" data-testid="fee-choices">
      <ul className="space-y-2">
        {items.map((item) => {
          const id = item.id!;
          const chosen = id in selection;
          return (
            <li key={id} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={chosen}
                    disabled={item.required}
                    onCheckedChange={(v) => toggle(id, v === true)}
                    aria-label={item.name}
                  />
                  <span className="font-medium">{item.name}</span>
                  {item.required && (
                    <span className="text-xs text-muted-foreground">(obrigatório)</span>
                  )}
                </label>
                <span className="text-sm tabular-nums">{formatBRL(item.price_cents)}</span>
              </div>
              {chosen && item.options.length > 0 && (
                <div className="mt-2 pl-6">
                  <Select
                    value={selection[id]}
                    onValueChange={(option) => onChange({ ...selection, [id]: option })}
                  >
                    <SelectTrigger className="h-8 w-40" aria-label={`Opção de ${item.name}`}>
                      <SelectValue placeholder="Escolha" />
                    </SelectTrigger>
                    <SelectContent>
                      {item.options.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
        <div className="text-sm">
          Total: <strong data-testid="enroll-total">{formatBRL(total)}</strong>
        </div>
        {total > 0 && counts.length > 1 && (
          <div className="flex items-center gap-2">
            <Label className="text-sm">Parcelas</Label>
            <Select
              value={String(installments)}
              onValueChange={(v) => onInstallmentsChange(Number(v))}
            >
              <SelectTrigger className="h-8 w-44" aria-label="Parcelas">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {counts.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n === 1 ? "À vista" : `${n}x de ${formatBRL(Math.ceil(total / n))}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
