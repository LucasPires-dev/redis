import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cpfDigits, formatCpf, isValidCpf } from "@/lib/cpf";

/** CPF field with mask and check-digit validation (value kept formatted). */
export function CpfInput({
  id = "cpf",
  label = "CPF",
  value,
  onChange,
  hint = "Pedido pelo Asaas para gerar a cobrança. Fica guardado só para pagamentos.",
}: {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  const complete = cpfDigits(value).length === 11;
  const invalid = complete && !isValidCpf(value);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder="000.000.000-00"
        value={value}
        onChange={(e) => onChange(formatCpf(e.target.value))}
        aria-invalid={invalid}
      />
      {invalid ? (
        <p className="text-xs text-destructive">CPF inválido.</p>
      ) : (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
