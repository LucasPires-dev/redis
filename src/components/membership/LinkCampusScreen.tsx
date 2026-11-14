import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Check, Clock, LogOut, Search, Ticket } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RedisLogo } from "@/components/brand/RedisLogo";
import { apiErrorMessage } from "@/lib/api/client";
import type { Me } from "@/lib/api/auth";
import {
  normalizeInviteCode,
  useCreateJoinRequest,
  useDecideJoinRequest,
  useJoinByInvite,
  useJoinRequests,
  usePublicCampuses,
  type CampusPublic,
} from "@/lib/api/membership";

/** What an account without a campus sees instead of the app: ask to join a
 *  campus (a leader approves) or enter an invite code (immediate). */
export function LinkCampusScreen({ me, onLogout }: { me: Me; onLogout: () => void }) {
  const firstName = me.name.split(" ")[0];
  const pending = me.pending_join_request;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur">
        <RedisLogo withWordmark className="text-sm" />
        <Button variant="ghost" size="sm" onClick={onLogout}>
          <LogOut className="mr-1.5 h-4 w-4" /> Sair
        </Button>
      </header>

      <main className="mx-auto w-full max-w-lg space-y-6 px-4 py-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Olá, {firstName}!</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Para ver células, cursos e eventos da sua igreja, vincule sua conta a um campus.
          </p>
        </div>

        {pending ? <PendingRequest pending={pending} /> : <PickCampus />}
        <InviteCodeCard />
      </main>
    </div>
  );
}

function PendingRequest({ pending }: { pending: NonNullable<Me["pending_join_request"]> }) {
  const queryClient = useQueryClient();
  const decide = useDecideJoinRequest();
  // The leadership may answer at any moment: check again every 30s.
  const requests = useJoinRequests({}, { refetchInterval: 30_000 });
  const latest = requests.data?.[0];
  useEffect(() => {
    if (latest && latest.id === pending.id && latest.status !== "pending") {
      queryClient.invalidateQueries({ queryKey: ["me"] });
    }
  }, [latest, pending.id, queryClient]);

  return (
    <Card className="border-primary/30">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Clock className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold">Pedido enviado</div>
            <p className="text-sm text-muted-foreground">
              A liderança do campus <strong>{pending.campus.name}</strong> vai confirmar sua
              entrada. Pedido feito{" "}
              {formatDistanceToNow(new Date(pending.created_at), { addSuffix: true, locale: ptBR })}
              .
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="h-11 w-full"
          disabled={decide.isPending}
          onClick={() =>
            decide.mutate(
              { id: pending.id, decision: "cancel" },
              { onSuccess: () => toast.success("Pedido cancelado") },
            )
          }
        >
          Cancelar pedido
        </Button>
      </CardContent>
    </Card>
  );
}

function PickCampus() {
  const campuses = usePublicCampuses();
  const requests = useJoinRequests();
  const createRequest = useCreateJoinRequest();
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<CampusPublic | null>(null);

  const rejected = requests.data?.[0]?.status === "rejected" ? requests.data[0] : null;
  const list = useMemo(() => {
    const term = query.trim().toLowerCase();
    const all = campuses.data ?? [];
    if (!term) return all;
    return all.filter((c) =>
      [c.name, c.city, c.church.name].some((v) => v.toLowerCase().includes(term)),
    );
  }, [campuses.data, query]);
  const manyChurches = new Set((campuses.data ?? []).map((c) => c.church.id)).size > 1;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Escolha seu campus
      </h2>

      {rejected && (
        <p className="rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
          Seu pedido para <strong>{rejected.campus.name}</strong> não foi aprovado. Confira se é o
          campus certo ou fale com a liderança.
        </p>
      )}

      {(campuses.data?.length ?? 0) > 5 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-11 pl-9"
            placeholder="Buscar por nome ou cidade"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      {campuses.isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      <ul className="space-y-2">
        {list.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => setChosen(c)}
              className="flex min-h-16 w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 active:bg-accent"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{c.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {[manyChurches ? c.church.name : null, c.city].filter(Boolean).join(" · ") || " "}
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
      {!campuses.isLoading && list.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum campus encontrado.</p>
      )}

      <AlertDialog open={!!chosen} onOpenChange={(open) => !open && setChosen(null)}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] rounded-lg sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Pedir para entrar em {chosen?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              A liderança do campus recebe seu pedido e confirma sua entrada. Você entra como
              membro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="h-11"
              disabled={createRequest.isPending}
              onClick={() => {
                if (!chosen) return;
                createRequest.mutate(chosen.id, {
                  onSuccess: () => toast.success("Pedido enviado à liderança do campus"),
                  onError: (err) =>
                    toast.error(apiErrorMessage(err, "Não foi possível enviar o pedido.")),
                });
              }}
            >
              Enviar pedido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function InviteCodeCard() {
  const join = useJoinByInvite();
  const [code, setCode] = useState("");
  const normalized = normalizeInviteCode(code);

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
            <Ticket className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold">Recebeu um código de convite?</div>
            <p className="text-sm text-muted-foreground">Com ele você entra na hora.</p>
          </div>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            join.mutate(normalized, {
              onSuccess: (campus) => toast.success(`Bem-vindo ao ${campus.name}!`),
            });
          }}
        >
          <Input
            aria-label="Código de convite"
            className="h-11 min-w-0 flex-1 font-mono uppercase tracking-[0.2em] placeholder:font-sans placeholder:normal-case placeholder:tracking-normal"
            placeholder="Código de 8 letras"
            autoCapitalize="characters"
            autoComplete="off"
            maxLength={12}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Button type="submit" className="h-11" disabled={normalized.length < 8 || join.isPending}>
            <Check className="mr-1 h-4 w-4" /> Entrar
          </Button>
        </form>
        {join.isError && (
          <p className="text-sm text-destructive">
            {apiErrorMessage(join.error, "Não foi possível usar este código.")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
