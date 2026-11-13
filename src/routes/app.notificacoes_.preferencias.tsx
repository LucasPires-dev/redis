import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, BellRing, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { RouteError } from "@/components/RouteError";
import { apiErrorMessage } from "@/lib/api/client";
import {
  useNotificationPreferences,
  useSaveNotificationPreferences,
  type NotificationCategory,
  type NotificationChannel,
} from "@/lib/api/notifications";
import { disablePush, enablePush, pushState, type PushState } from "@/lib/push";

// What the person also gets by email and as push on their devices, by
// category. The notification center always shows everything. Linked from
// every notification email.
export const Route = createFileRoute("/app/notificacoes_/preferencias")({
  head: () => ({ meta: [{ title: "Preferências de notificação — Redis" }] }),
  component: NotificationPreferencesPage,
  errorComponent: RouteError,
});

const CHANNEL_LABEL: Record<NotificationChannel, string> = { email: "E-mail", push: "Celular" };

function NotificationPreferencesPage() {
  const { data, isLoading } = useNotificationPreferences();
  const save = useSaveNotificationPreferences();

  const toggle = (c: NotificationCategory, channel: NotificationChannel, on: boolean) =>
    save.mutate(
      { [channel]: { [c.key]: on } },
      {
        onSuccess: () =>
          toast.success(
            `${c.label}: ${on ? "vai chegar" : "não vai mais chegar"} por ${channel === "email" ? "e-mail" : "notificação no celular"}`,
          ),
        onError: (e) => toast.error(apiErrorMessage(e, "Não foi possível salvar.")),
      },
    );

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4 sm:p-6">
      <Link
        to="/app/notificacoes"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Notificações
      </Link>
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <Settings2 className="h-5 w-5 text-primary" /> Preferências de notificação
        </h1>
        <p className="text-sm text-muted-foreground">
          Tudo continua aparecendo no sininho. Escolha o que também deve chegar por e-mail
          {data?.email_address ? ` (${data.email_address})` : ""} e no celular.
        </p>
      </div>

      {data?.push_available && <ThisDevice publicKey={data.push_public_key} />}

      {data && !data.email_available && (
        <p
          className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground"
          data-testid="email-unavailable"
        >
          O envio de e-mails ainda não foi ativado. Suas escolhas já ficam salvas e passam a valer
          assim que for.
        </p>
      )}

      {isLoading || !data ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-lg border bg-card">
          {data.categories.map((c) => (
            <li key={c.key} className="space-y-2 px-4 py-3" data-testid="notification-category">
              <div>
                <p className="text-sm font-medium">{c.label}</p>
                <p className="text-sm text-muted-foreground">{c.description}</p>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {(["email", "push"] as const)
                  .filter((ch) => ch === "email" || data.push_available)
                  .map((ch) => (
                    <label key={ch} className="flex cursor-pointer items-center gap-2 text-sm">
                      <Switch
                        checked={c[ch]}
                        aria-label={`${c.label}: ${CHANNEL_LABEL[ch]}`}
                        disabled={save.isPending}
                        onCheckedChange={(on) => toggle(c, ch, on)}
                      />
                      {CHANNEL_LABEL[ch]}
                    </label>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const STATE_TEXT: Record<PushState, string> = {
  on: "Ativadas neste aparelho.",
  off: "Receba os avisos na tela do celular ou do computador, mesmo com o app fechado.",
  denied:
    "As notificações estão bloqueadas para este site. Libere nas configurações do navegador e volte aqui.",
  "needs-install":
    "No iPhone e no iPad, adicione o Redis à tela de início (Compartilhar → Adicionar à Tela de Início) e abra por lá para ativar.",
  unsupported: "Este navegador não recebe notificações.",
};

function ThisDevice({ publicKey }: { publicKey: string }) {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void pushState().then(setState);
  }, []);

  const run = async (action: () => Promise<PushState>) => {
    setBusy(true);
    try {
      const next = await action();
      setState(next);
      if (next === "on") toast.success("Notificações ativadas neste aparelho");
    } catch (e) {
      toast.error(apiErrorMessage(e, "Não foi possível ativar as notificações."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center">
      <BellRing className="h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Notificações neste aparelho</p>
        <p className="text-sm text-muted-foreground" data-testid="push-state">
          {state ? STATE_TEXT[state] : "…"}
        </p>
      </div>
      {state === "off" && (
        <Button size="sm" disabled={busy} onClick={() => run(() => enablePush(publicKey))}>
          Ativar
        </Button>
      )}
      {state === "on" && (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => run(disablePush)}>
          Desativar
        </Button>
      )}
    </div>
  );
}
