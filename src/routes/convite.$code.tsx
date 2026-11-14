import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthShell } from "@/components/membership/AuthShell";
import { apiErrorMessage, hasAccessToken } from "@/lib/api/client";
import { useMe } from "@/lib/api/auth";
import { normalizeInviteCode, useInviteLookup, useJoinByInvite } from "@/lib/api/membership";

export const Route = createFileRoute("/convite/$code")({
  head: () => ({ meta: [{ title: "Convite — Redis" }] }),
  component: InvitePage,
});

function InvitePage() {
  const navigate = useNavigate();
  const code = normalizeInviteCode(Route.useParams().code);
  const invite = useInviteLookup(code);
  // The token lives in localStorage: only known after hydration.
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => setSignedIn(hasAccessToken()), []);
  const me = useMe();
  const join = useJoinByInvite();

  const campus = invite.data;
  const loading = invite.isLoading || (signedIn && me.isLoading);

  return (
    <AuthShell>
      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-16 w-16 rounded-2xl" />
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-11 w-full" />
        </div>
      )}

      {!loading && !campus && (
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight">Convite inválido</h1>
          <p className="text-sm text-muted-foreground">
            Este convite não existe ou foi desativado pela liderança do campus. Peça um novo link ou
            crie sua conta e escolha o campus depois.
          </p>
          <Button asChild className="h-11 w-full">
            <Link to={signedIn ? "/app" : "/cadastro"}>
              {signedIn ? "Ir para o app" : "Criar conta"}
            </Link>
          </Button>
        </div>
      )}

      {!loading && campus && (
        <div className="space-y-6">
          <div>
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Building2 className="h-8 w-8" />
            </div>
            <p className="mt-5 text-sm text-muted-foreground">Você foi convidado para</p>
            <h1 className="text-2xl font-semibold tracking-tight">{campus.name}</h1>
            <p className="text-sm text-muted-foreground">
              {campus.church.name}
              {campus.city && ` · ${campus.city}`}
            </p>
          </div>

          {!signedIn || !me.data ? (
            <div className="space-y-3">
              <Button asChild className="h-11 w-full">
                <Link to="/cadastro" search={{ convite: code }}>
                  Criar minha conta
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 w-full">
                <Link to="/login" search={{ redirect: `/convite/${code}` }}>
                  Já tenho conta
                </Link>
              </Button>
            </div>
          ) : me.data.campus?.id === campus.id ? (
            <div className="space-y-4">
              <p className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary" /> Você já faz parte deste campus.
              </p>
              <Button asChild className="h-11 w-full">
                <Link to="/app">Ir para o app</Link>
              </Button>
            </div>
          ) : me.data.campus ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Sua conta já está no campus <strong>{me.data.campus.name}</strong>. Para mudar de
                campus, fale com a liderança.
              </p>
              <Button asChild variant="outline" className="h-11 w-full">
                <Link to="/app">Ir para o app</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                className="h-11 w-full"
                disabled={join.isPending}
                onClick={() => join.mutate(code, { onSuccess: () => navigate({ to: "/app" }) })}
              >
                {join.isPending ? "Entrando…" : `Entrar em ${campus.name}`}
              </Button>
              {join.isError && (
                <p className="text-sm text-destructive">
                  {apiErrorMessage(join.error, "Não foi possível entrar no campus.")}
                </p>
              )}
              <p className="text-center text-xs text-muted-foreground">
                Entrando como {me.data.name}
              </p>
            </div>
          )}
        </div>
      )}
    </AuthShell>
  );
}
