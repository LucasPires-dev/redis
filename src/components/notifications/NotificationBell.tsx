import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { useNotificationsRealtime, useUnreadNotificationCount } from "@/lib/api/notifications";
import { syncPushSubscription } from "@/lib/push";

/** Top-bar bell with the unread count. Also keeps the live connection open, so a
 *  new notification bumps the count and shows a toast wherever the person is. */
export function NotificationBell() {
  const navigate = useNavigate();
  const { data: count = 0 } = useUnreadNotificationCount();

  useEffect(() => {
    void syncPushSubscription();
  }, []);

  useNotificationsRealtime((title) =>
    toast(title, {
      action: { label: "Ver", onClick: () => navigate({ to: "/app/notificacoes" }) },
    }),
  );

  const label =
    count > 0 ? `Notificações: ${count} ${count === 1 ? "não lida" : "não lidas"}` : "Notificações";
  return (
    <Link
      to="/app/notificacoes"
      aria-label={label}
      title={label}
      data-testid="notification-bell"
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
      activeProps={{ className: "bg-muted text-foreground" }}
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span
          data-testid="notification-count"
          className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground tabular-nums"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
