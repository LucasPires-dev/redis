import { cn } from "@/lib/utils";
import { PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE, type PaymentStatus } from "@/lib/api/courses";

export function PaymentStatusBadge({
  status,
  overdue = false,
  className,
}: {
  status: PaymentStatus;
  overdue?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        PAYMENT_STATUS_TONE[status],
        className,
      )}
      data-testid="payment-status"
    >
      {PAYMENT_STATUS_LABEL[status]}
      {overdue && <span className="text-destructive">· parcela atrasada</span>}
    </span>
  );
}
