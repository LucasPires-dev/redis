import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { RouteError } from "@/components/RouteError";
import { apiErrorMessage } from "@/lib/api/client";
import {
  useNotificationPreferences,
  useSaveNotificationPreferences,
} from "@/lib/api/notifications";

// What the person also gets by email, by category. The notification center
// always shows everything. Linked from every notification email.
export const Route = createFileRoute("/app/notificacoes_/preferencias")({
  head: () => ({ meta: [{ title: "Preferências de notificação — Redis" }] }),
  component: NotificationPreferencesPage,
  errorComponent: RouteError,
});

function NotificationPreferencesPage() {
  const { data, isLoading } = useNotificationPreferences();
  const save = useSaveNotificationPreferences();

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      <Link
        to="/app/notificacoes"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Notificações
      </Link>
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <Mail className="h-5 w-5 text-primary" /> Receber também por e-mail
        </h1>
        <p className="text-sm text-muted-foreground">
          Tudo continua aparecendo no sininho. Escolha o que também deve chegar no seu e-mail
          {data?.email_address ? ` (${data.email_address})` : ""}.
        </p>
      </div>

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
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-lg border bg-card">
          {data.categories.map((c) => (
            <li key={c.key}>
              <label
                className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3"
                data-testid="email-category"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{c.label}</span>
                  <span className="block text-sm text-muted-foreground">{c.description}</span>
                </span>
                <Switch
                  checked={c.email}
                  aria-label={`${c.label} por e-mail`}
                  disabled={save.isPending}
                  onCheckedChange={(on) =>
                    save.mutate(
                      { [c.key]: on },
                      {
                        onSuccess: () =>
                          toast.success(
                            on ? `${c.label}: vai chegar por e-mail` : `${c.label}: só no sininho`,
                          ),
                        onError: (e) => toast.error(apiErrorMessage(e, "Não foi possível salvar.")),
                      },
                    )
                  }
                />
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
