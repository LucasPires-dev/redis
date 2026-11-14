// The person's ticket: a QR code (and the same code in text) to show at the door.
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
import { formatDateTime } from "@/lib/utils";

export function TicketButton({ registration: r }: { registration: EventRegistration }) {
  if (r.payment_status !== "confirmed" || !r.ticket_code) return null;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <QrCode className="mr-1.5 h-4 w-4" /> Ver ingresso
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{r.event.title}</DialogTitle>
          <DialogDescription>
            {formatDateTime(r.event.starts_at)} · {r.person.name}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 py-2" data-testid="ticket">
          <div className="rounded-xl bg-white p-4">
            <QRCodeSVG value={r.ticket_code} size={220} level="M" />
          </div>
          <p className="font-mono text-lg font-semibold tracking-widest" data-testid="ticket-code">
            {formatTicketCode(r.ticket_code)}
          </p>
          {r.checked_in_at ? (
            <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> Check-in feito em{" "}
              {formatDateTime(r.checked_in_at)}
            </p>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Mostre este código na entrada. Aumente o brilho da tela para facilitar a leitura.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
