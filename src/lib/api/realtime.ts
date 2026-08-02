import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getTokens, wsUrl } from "./client";

// Mapa kind -> queryKey a invalidar. O payload do servidor é deliberadamente
// enxuto (só `kind`) — o cliente reage refetchando via REST, em vez de tentar
// manter dois caminhos (WS e REST) sincronizados. `production-demands` não é
// filtrada por evento (a lista é por direção sent/received), então invalida
// só pelo prefixo — as outras têm o evento como segundo elemento da key.
function queryKeyFor(kind: string, eventId: string): unknown[] | undefined {
  switch (kind) {
    case "rundown_item_status":
    case "rundown_item":
      return ["production-events", eventId];
    case "roster_entry":
      return ["production-roster-entries", eventId];
    case "checklist_item":
      return ["production-checklist-items", eventId];
    case "demand":
      return ["production-demands"];
    default:
      return undefined;
  }
}

const RECONNECT_DELAYS_MS = [1000, 2000, 4000, 8000, 10000];

export function useEventRealtime(eventId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!eventId) return;
    const currentEventId = eventId;
    const accessToken = getTokens()?.access;
    if (!accessToken) return;

    let socket: WebSocket | null = null;
    let reconnectAttempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let closedByEffect = false;

    function connect() {
      socket = new WebSocket(
        wsUrl(`/ws/production/events/${currentEventId}/?token=${accessToken}`),
      );

      socket.onopen = () => {
        reconnectAttempt = 0;
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as { kind?: string };
          const queryKey = data.kind ? queryKeyFor(data.kind, currentEventId) : undefined;
          if (queryKey) {
            queryClient.invalidateQueries({ queryKey });
          }
        } catch {
          // ignora mensagens que não sejam JSON válido
        }
      };

      socket.onclose = () => {
        if (closedByEffect) return;
        const delay =
          RECONNECT_DELAYS_MS[Math.min(reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)];
        reconnectAttempt += 1;
        reconnectTimer = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      closedByEffect = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [eventId, queryClient]);
}
