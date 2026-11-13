// Notification center: the signed-in person's notifications, the unread count
// for the bell, and the WebSocket that says when a new one arrives.
import { useEffect, useRef } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { apiFetch, getTokens, wsUrl, type Paginated } from "./client";

export interface AppNotification {
  id: string;
  kind: string;
  title: string;
  body: string;
  /** App path the notification opens ("" when there's nowhere to go). */
  link: string;
  read_at: string | null;
  created_at: string;
}

const KEY = ["notifications"] as const;

export function useNotifications(unreadOnly: boolean) {
  return useInfiniteQuery({
    queryKey: [...KEY, "list", unreadOnly],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      apiFetch<Paginated<AppNotification>>(
        `/api/notifications/?page=${pageParam}${unreadOnly ? "&unread=1" : ""}`,
      ),
    getNextPageParam: (last, pages) => (last.next ? pages.length + 1 : undefined),
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: [...KEY, "unread-count"],
    queryFn: () => apiFetch<{ count: number }>("/api/notifications/unread-count/"),
    select: (d) => d.count,
    // The WebSocket refreshes it right away; polling covers a dropped socket.
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<AppNotification>(`/api/notifications/${id}/read/`, { method: "POST" }),
    onSuccess: (updated) => {
      // Mark it in place (no list jump while the person is reading), then
      // refresh the count.
      qc.setQueriesData<InfiniteData<Paginated<AppNotification>>>(
        { queryKey: [...KEY, "list"] },
        (data) =>
          data && {
            ...data,
            pages: data.pages.map((p) => ({
              ...p,
              results: p.results.map((n) => (n.id === updated.id ? updated : n)),
            })),
          },
      );
      qc.invalidateQueries({ queryKey: [...KEY, "unread-count"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ updated: number }>("/api/notifications/read-all/", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export interface NotificationCategory {
  key: string;
  label: string;
  description: string;
  /** Also by email / as push (the center always shows everything). */
  email: boolean;
  push: boolean;
}

export type NotificationChannel = "email" | "push";

export interface NotificationPreferences {
  /** False while the church hasn't set up email sending. */
  email_available: boolean;
  email_address: string;
  /** False while push isn't set up on the server (no VAPID keys). */
  push_available: boolean;
  push_public_key: string;
  categories: NotificationCategory[];
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: [...KEY, "preferences"],
    queryFn: () => apiFetch<NotificationPreferences>("/api/notifications/preferences/"),
  });
}

export function useSaveNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (change: Partial<Record<NotificationChannel, Record<string, boolean>>>) =>
      apiFetch<NotificationPreferences>("/api/notifications/preferences/", {
        method: "PATCH",
        body: JSON.stringify(change),
      }),
    onSuccess: (data) => qc.setQueryData([...KEY, "preferences"], data),
  });
}

const RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10000, 30000];

/** Keeps a WebSocket open while signed in; on each new notification refreshes
 *  the bell and the list and calls `onNew` (e.g. to show a toast). */
export function useNotificationsRealtime(onNew?: (title: string) => void) {
  const qc = useQueryClient();
  const onNewRef = useRef(onNew);
  onNewRef.current = onNew;

  useEffect(() => {
    let socket: WebSocket | null = null;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let closedByEffect = false;

    function retry() {
      if (closedByEffect) return;
      const delay = RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)];
      attempt += 1;
      timer = setTimeout(connect, delay);
    }

    function connect() {
      // Read the token on every attempt: it may have been refreshed meanwhile.
      const token = getTokens()?.access;
      if (!token) return; // signed out
      socket = new WebSocket(wsUrl(`/ws/notifications/?token=${token}`));
      socket.onopen = () => {
        attempt = 0;
      };
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as { kind?: string; title?: string };
          if (data.kind !== "notification") return;
          qc.invalidateQueries({ queryKey: KEY });
          if (data.title) onNewRef.current?.(data.title);
        } catch {
          // not JSON: ignore
        }
      };
      socket.onclose = retry;
    }

    connect();
    return () => {
      closedByEffect = true;
      if (timer) clearTimeout(timer);
      socket?.close();
    };
  }, [qc]);
}
