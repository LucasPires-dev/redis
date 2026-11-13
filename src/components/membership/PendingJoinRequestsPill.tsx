import { Link } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";
import { useAuth } from "@/lib/api/auth";
import { useJoinRequests } from "@/lib/api/membership";

/** Top-bar shortcut for whoever answers join requests (campus leadership, manager). */
export function PendingJoinRequestsPill() {
  const { me } = useAuth();
  const answers = !!me && (me.is_manager || me.led_campuses.length > 0);
  const { data } = useJoinRequests(
    { status: "pending" },
    { enabled: answers, refetchInterval: 60_000 },
  );
  if (!answers || !data?.length) return null;

  const campusId = data[0].campus.id;
  return (
    <Link
      to="/app/campus/$id"
      params={{ id: campusId }}
      hash="pedidos"
      aria-label={`${data.length} ${data.length === 1 ? "pedido" : "pedidos"} de vínculo aguardando resposta`}
      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary/10 px-3 text-sm font-medium text-primary hover:bg-primary/15"
    >
      <UserPlus className="h-4 w-4" />
      <span className="tabular-nums">{data.length}</span>
      <span className="hidden sm:inline">
        {data.length === 1 ? "pedido de vínculo" : "pedidos de vínculo"}
      </span>
    </Link>
  );
}
