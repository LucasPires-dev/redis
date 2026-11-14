// CPF: Asaas only charges customers with one, so the payment screens ask for
// it when the person has none on file (Me.has_cpf). The API keeps it on the
// person and never returns it.
import { ApiError } from "@/lib/api/client";

export function cpfDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

/** "52998224725" → "529.982.247-25" (partial input too). */
export function formatCpf(value: string): string {
  const d = cpfDigits(value);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

export function isValidCpf(value: string): boolean {
  const d = cpfDigits(value);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const nums = d.split("").map(Number);
  for (const size of [9, 10]) {
    let total = 0;
    for (let i = 0; i < size; i++) total += nums[i] * (size + 1 - i);
    if (((total * 10) % 11) % 10 !== nums[size]) return false;
  }
  return true;
}

/** The API refused to charge because the person has no CPF on file. */
export function needsCpf(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    !!error.detail &&
    typeof error.detail === "object" &&
    "cpf" in (error.detail as Record<string, unknown>)
  );
}
