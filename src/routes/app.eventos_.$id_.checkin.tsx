import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CameraOff,
  CheckCircle2,
  Search,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { RouteError } from "@/components/RouteError";
import { QrScanner } from "@/components/events/QrScanner";
import { ApiError, apiErrorMessage } from "@/lib/api/client";
import { useEvent } from "@/lib/api/production";
import {
  useCheckin,
  useDoorList,
  useUndoCheckin,
  type CheckinTarget,
  type DoorRow,
} from "@/lib/api/payments";
import { useEventRealtime } from "@/lib/api/realtime";
import { cn } from "@/lib/utils";

// Check-in at the door, for the organizers and the confirmed roster: read the
// ticket's QR code, type its code or find the person by name. Several phones
// can work the door at once (the list and the count update live).
export const Route = createFileRoute("/app/eventos_/$id_/checkin")({
  head: () => ({ meta: [{ title: "Check-in — Redis" }] }),
  component: CheckinPage,
  errorComponent: RouteError,
});

type Feedback = { tone: "ok" | "warn" | "error"; text: string };

const TICKET_CODE = /^[A-Z0-9]{10}$/;
const normalize = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

function CheckinPage() {
  const { id } = Route.useParams();
  const { data: event, error } = useEvent(id);
  const { data: door, isLoading } = useDoorList(id);
  const checkin = useCheckin(id);
  const undo = useUndoCheckin(id);
  const [query, setQuery] = useState("");
  const [scanning, setScanning] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  useEventRealtime(id);

  if (error instanceof ApiError && [404, 403].includes(error.status)) throw notFound();

  const submit = (target: CheckinTarget) =>
    checkin.mutate(target, {
      onSuccess: ({ registration: r, already_checked_in }) => {
        if (already_checked_in) {
          setFeedback({
            tone: "warn",
            text: `${r.person.name} já tinha feito check-in às ${time(r.checked_in_at!)}.`,
          });
        } else {
          navigator.vibrate?.(80);
          setFeedback({ tone: "ok", text: `${r.person.name}: check-in feito.` });
        }
        setQuery("");
      },
      onError: (e) =>
        setFeedback({
          tone: "error",
          text: apiErrorMessage(e, "Não foi possível fazer o check-in."),
        }),
    });

  const rows = useMemo(() => {
    const all = door?.registrations ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (r) => r.person.name.toLowerCase().includes(q) || r.person.email.toLowerCase().includes(q),
    );
  }, [door, query]);

  const typedCode = normalize(query);
  const looksLikeCode = TICKET_CODE.test(typedCode) && rows.length === 0;
  const percent = door?.confirmed ? Math.round((door.checked_in / door.confirmed) * 100) : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      <Link
        to="/app/eventos/$id"
        params={{ id }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {event?.title ?? "Evento"}
      </Link>
      <h1 className="text-xl font-semibold tracking-tight">Check-in</h1>

      <div className="rounded-lg border bg-card p-4" data-testid="checkin-count">
        {door ? (
          <>
            <p className="text-sm text-muted-foreground">Presentes</p>
            <p className="text-3xl font-semibold tabular-nums">
              {door.checked_in}
              <span className="text-base font-normal text-muted-foreground">
                {" "}
                de {door.confirmed} confirmados
              </span>
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          </>
        ) : (
          <Skeleton className="h-16 w-full" />
        )}
      </div>

      <Button
        className="w-full"
        variant={scanning ? "outline" : "default"}
        onClick={() => setScanning((s) => !s)}
      >
        {scanning ? (
          <>
            <CameraOff className="mr-2 h-4 w-4" /> Fechar câmera
          </>
        ) : (
          <>
            <Camera className="mr-2 h-4 w-4" /> Ler QR code do ingresso
          </>
        )}
      </Button>
      {scanning && (
        <QrScanner paused={checkin.isPending} onCode={(text) => submit({ code: text })} />
      )}

      {feedback && (
        <div
          role="status"
          data-testid="checkin-feedback"
          className={cn(
            "flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm font-medium",
            feedback.tone === "ok" && "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
            feedback.tone === "warn" && "bg-amber-500/10 text-amber-800 dark:text-amber-300",
            feedback.tone === "error" && "bg-destructive/10 text-destructive",
          )}
        >
          {feedback.tone === "ok" && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
          {feedback.tone === "warn" && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
          {feedback.tone === "error" && <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          {feedback.text}
        </div>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (TICKET_CODE.test(typedCode)) submit({ code: typedCode });
          else if (
            rows.length === 1 &&
            !rows[0].checked_in_at &&
            rows[0].payment_status === "confirmed"
          )
            submit({ registration_id: rows[0].id });
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nome ou código do ingresso"
            aria-label="Nome ou código do ingresso"
            className="pl-8"
            autoComplete="off"
          />
        </div>
        {looksLikeCode && (
          <Button type="submit" disabled={checkin.isPending}>
            Confirmar código
          </Button>
        )}
      </form>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {query
            ? looksLikeCode
              ? "Toque em “Confirmar código” para fazer o check-in."
              : "Ninguém encontrado com esse nome."
            : "Ainda não há inscrições neste evento."}
        </p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-lg border bg-card">
          {rows.map((r) => (
            <DoorItem
              key={r.id}
              row={r}
              busy={checkin.isPending || undo.isPending}
              onCheckin={() => submit({ registration_id: r.id })}
              onUndo={() =>
                undo.mutate(
                  { registration_id: r.id },
                  {
                    onSuccess: () =>
                      setFeedback({ tone: "warn", text: `Check-in de ${r.person.name} desfeito.` }),
                    onError: (e) =>
                      setFeedback({ tone: "error", text: apiErrorMessage(e, "Não foi possível.") }),
                  },
                )
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function DoorItem({
  row: r,
  busy,
  onCheckin,
  onUndo,
}: {
  row: DoorRow;
  busy: boolean;
  onCheckin: () => void;
  onUndo: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3" data-testid="door-row">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{r.person.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {r.guest_of ? `Acompanhante de ${r.guest_of}` : r.person.email}
        </p>
      </div>
      {r.payment_status !== "confirmed" ? (
        <Badge variant="outline" className="shrink-0">
          Pagamento pendente
        </Badge>
      ) : r.checked_in_at ? (
        <div className="flex shrink-0 items-center gap-1">
          <Badge className="bg-emerald-600 hover:bg-emerald-600">✓ {time(r.checked_in_at)}</Badge>
          <Button size="sm" variant="ghost" disabled={busy} onClick={onUndo}>
            Desfazer
          </Button>
        </div>
      ) : (
        <Button size="sm" className="shrink-0" disabled={busy} onClick={onCheckin}>
          Check-in
        </Button>
      )}
    </li>
  );
}
