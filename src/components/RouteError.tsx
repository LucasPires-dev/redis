import { useRouter } from "@tanstack/react-router";
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthError } from "@/lib/api/client";

interface Props {
  error: Error;
  reset?: () => void;
}

export function RouteError({ error, reset }: Props) {
  const router = useRouter();

  if (error instanceof AuthError) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-10 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Sessão expirada</h2>
        <p className="text-sm text-muted-foreground">
          Sua sessão expirou. Faça login novamente para continuar.
        </p>
        <Button onClick={() => router.navigate({ to: "/login" })}>
          Ir para o login
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-10 text-center">
      <AlertCircle className="h-10 w-10 text-destructive" />
      <h2 className="text-lg font-semibold">Algo deu errado</h2>
      <p className="text-sm text-muted-foreground">
        Não foi possível carregar esta página. Tente novamente ou volte para o
        início.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => router.history.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Button>
        <Button
          onClick={() => {
            router.invalidate();
            reset?.();
          }}
        >
          <RefreshCw className="mr-1 h-4 w-4" /> Tentar novamente
        </Button>
      </div>
    </div>
  );
}
