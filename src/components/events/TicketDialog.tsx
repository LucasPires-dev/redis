// The person's tickets: a QR code (and the same code in text) to show at the
// door — theirs and, when they brought companions, one for each companion.
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatTicketCode, type EventRegistration } from "@/lib/api/payments";
import { cn, formatDateTime } from "@/lib/utils";

export function TicketButton({ registration: r }: { registration: EventRegistration }) {
  const [index, setIndex] = useState(0);
  if (r.payment_status !== "confirmed" || !r.ticket_code) return null;

  const tickets = [
    { name: r.person.name, code: r.ticket_code, checkedInAt: r.checked_in_at },
    ...(r.guests ?? []).map((g) => ({
      name: g.name,
      code: g.ticket_code,
      checkedInAt: g.checked_in_at,
    })),
  ];
  const ticket = tickets[Math.min(index, tickets.length - 1)];

  return (
    <Dialog onOpenChange={(open) => open && setIndex(0)}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <QrCode className="mr-1.5 h-4 w-4" />
          {tickets.length > 1 ? `Ver ingressos (${tickets.length})` : "Ver ingresso"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{r.event.title}</DialogTitle>
          <DialogDescription>
            {formatDateTime(r.event.starts_at)} · {ticket.name}
            {r.ticket_type && ` · ${r.ticket_type.name}`}
          </DialogDescription>
        </DialogHeader>
        {tickets.length > 1 && (
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Ingressos">
            {tickets.map((t, i) => (
              <button
                key={t.code}
                type="button"
                role="tab"
                aria-selected={i === index}
                onClick={() => setIndex(i)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  i === index
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                )}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-col items-center gap-3 py-2" data-testid="ticket">
          <div className="rounded-xl bg-white p-4">
            <QRCodeSVG value={ticket.code} size={220} level="M" />
          </div>
          <p className="font-mono text-lg font-semibold tracking-widest" data-testid="ticket-code">
            {formatTicketCode(ticket.code)}
          </p>
          {ticket.checkedInAt ? (
            <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> Check-in feito em{" "}
              {formatDateTime(ticket.checkedInAt)}
            </p>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Mostre este código na entrada. Aumente o brilho da tela para facilitar a leitura.
              {tickets.length > 1 && " Cada pessoa tem o próprio código."}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
