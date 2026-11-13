import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, CheckCheck, ChevronRight, Settings } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RouteError } from "@/components/RouteError";
import { apiErrorMessage } from "@/lib/api/client";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
  type AppNotification,
} from "@/lib/api/notifications";
import { cn, formatTimeAgo } from "@/lib/utils";

// The person's notification center: newest first, unread highlighted; opening
// one marks it as read and goes to the screen it is about.
export const Route = createFileRoute("/app/notificacoes")({
  head: () => ({ meta: [{ title: "Notificações — Redis" }] }),
  component: NotificationsPage,
  errorComponent: RouteError,
});

function NotificationsPage() {
  const router = useRouter();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useNotifications(unreadOnly);
  const { data: unread = 0 } = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const items = data?.pages.flatMap((p) => p.results) ?? [];

  const open = (n: AppNotification) => {
    if (!n.read_at) markRead.mutate(n.id);
    // history.push keeps a "#section" in the link.
    if (n.link) router.history.push(n.link);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold tracking-tight">Notificações</h1>
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <Button
              size="sm"
              variant="outline"
              disabled={markAll.isPending}
              onClick={() =>
                markAll.mutate(undefined, {
                  onError: (e) => toast.error(apiErrorMessage(e, "Não foi possível.")),
                })
              }
            >
              <CheckCheck className="mr-1.5 h-4 w-4" /> Marcar todas como lidas
            </Button>
          )}
          <Button size="icon" variant="ghost" asChild>
            <Link
              to="/app/notificacoes/preferencias"
              aria-label="Preferências de e-mail"
              title="Preferências de e-mail"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="inline-flex rounded-lg bg-muted p-1 text-sm" role="tablist">
        {[
          { value: false, label: "Todas" },
          { value: true, label: unread > 0 ? `Não lidas (${unread})` : "Não lidas" },
        ].map((f) => (
          <button
            key={f.label}
            role="tab"
            aria-selected={unreadOnly === f.value}
            onClick={() => setUnreadOnly(f.value)}
            className={cn(
              "rounded-md px-3 py-1.5 font-medium text-muted-foreground transition-colors",
              unreadOnly === f.value && "bg-background text-foreground shadow-sm",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p
          className="py-10 text-center text-sm text-muted-foreground"
          data-testid="notifications-empty"
        >
          {unreadOnly
            ? "Tudo em dia: nenhuma notificação não lida."
            : "Nenhuma notificação por aqui ainda."}
        </p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-lg border bg-card">
          {items.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => open(n)}
                data-testid="notification-item"
                data-unread={!n.read_at || undefined}
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
                  !n.read_at && "bg-primary/5",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    n.read_at ? "bg-transparent" : "bg-primary",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm", !n.read_at && "font-semibold")}>
                    {n.title}
                  </span>
                  {n.body && (
                    <span className="mt-0.5 block text-sm text-muted-foreground">{n.body}</span>
                  )}
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {formatTimeAgo(n.created_at)}
                    {!n.read_at && <span className="sr-only"> · não lida</span>}
                  </span>
                </span>
                {n.link && <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />}
              </button>
            </li>
          ))}
        </ul>
      )}

      {hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            disabled={isFetchingNextPage}
            onClick={() => fetchNextPage()}
          >
            {isFetchingNextPage ? "Carregando…" : "Ver mais antigas"}
          </Button>
        </div>
      )}
    </div>
  );
}
