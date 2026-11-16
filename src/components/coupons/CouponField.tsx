// "Tenho um cupom": the person checks a code before registering/enrolling.
// The server applies it again on submit; this only previews the discount.
import { useState } from "react";
import { BadgePercent, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiErrorMessage, ApiError } from "@/lib/api/client";
import { checkCoupon, type CheckedCoupon, type CouponTarget } from "@/lib/api/coupons";

function couponError(e: unknown) {
  if (e instanceof ApiError) {
    const detail = e.detail as { coupon_code?: string | string[] } | undefined;
    const msg = detail?.coupon_code;
    if (msg) return Array.isArray(msg) ? msg[0] : msg;
  }
  return apiErrorMessage(e, "Não foi possível verificar o cupom.");
}

export function CouponField({
  target,
  value,
  onChange,
  discountCents,
}: {
  target: CouponTarget;
  value: CheckedCoupon | null;
  onChange: (coupon: CheckedCoupon | null) => void;
  discountCents: number;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  if (value) {
    return (
      <div
        className="flex items-center justify-between gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300"
        data-testid="coupon-applied"
      >
        <span className="flex min-w-0 items-center gap-2">
          <BadgePercent className="h-4 w-4 shrink-0" />
          <span className="min-w-0">
            Cupom <span className="font-mono font-semibold">{value.code}</span>: {value.label}
            {discountCents > 0 && (
              <span className="block text-xs">
                −{" "}
                {(discountCents / 100).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            )}
          </span>
        </span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Remover cupom"
          onClick={() => onChange(null)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        onClick={() => setOpen(true)}
      >
        Tenho um cupom de desconto
      </button>
    );
  }

  const apply = async () => {
    setChecking(true);
    setError("");
    try {
      onChange(await checkCoupon(target, code.trim()));
      setCode("");
    } catch (e) {
      setError(couponError(e));
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <Input
          id="coupon-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter" && code.trim()) {
              e.preventDefault();
              void apply();
            }
          }}
          placeholder="Código do cupom"
          aria-label="Código do cupom"
          maxLength={30}
          autoCapitalize="characters"
          className="font-mono"
        />
        <Button type="button" variant="outline" disabled={!code.trim() || checking} onClick={apply}>
          Aplicar
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive" data-testid="coupon-error">
          {error}
        </p>
      )}
    </div>
  );
}
