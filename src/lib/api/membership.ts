// Sign-up and linking an account to a campus: invite codes (immediate) and join
// requests that the campus leadership approves.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiList, setTokens } from "./client";
import type { Me } from "./auth";
import type { PersonMini } from "./people";

export interface CampusPublic {
  id: string;
  name: string;
  city: string;
  church: { id: string; name: string; abbreviation: string };
}

export type JoinRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface JoinRequest {
  id: string;
  campus: CampusPublic;
  person: PersonMini;
  status: JoinRequestStatus;
  created_at: string;
  decided_at: string | null;
  decided_by: PersonMini | null;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  invite_code?: string;
}

export async function register(data: RegisterInput) {
  const tokens = await apiFetch<{ access: string; refresh: string }>("/api/auth/register/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  setTokens(tokens);
}

/** Matches the API: no campus and not the manager → only the link screen. */
export function isUnlinked(me: Me | undefined): boolean {
  return !!me && !me.campus && !me.is_manager;
}

export function canManageCampusMembers(me: Me | undefined, campusId: string): boolean {
  return !!me && (me.is_manager || me.led_campuses.some((c) => c.id === campusId));
}

export function inviteLink(code: string): string {
  return `${window.location.origin}/convite/${code}`;
}

export function normalizeInviteCode(raw: string): string {
  return raw.replace(/\s/g, "").toUpperCase();
}

export function useInviteLookup(code: string | undefined) {
  return useQuery({
    queryKey: ["invite", code],
    queryFn: () => apiFetch<CampusPublic>(`/api/auth/invite/${encodeURIComponent(code!)}/`),
    enabled: !!code,
    retry: false,
  });
}

export function usePublicCampuses(enabled = true) {
  return useQuery({
    queryKey: ["campuses", "public"],
    queryFn: () => apiList<CampusPublic>("/api/campuses/"),
    enabled,
  });
}

export function useJoinRequests(
  params: { status?: JoinRequestStatus; campus?: string } = {},
  options: { enabled?: boolean; refetchInterval?: number | false } = {},
) {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.campus) search.set("campus", params.campus);
  const qs = search.toString();
  return useQuery({
    queryKey: ["campus-join-requests", params],
    queryFn: () => apiList<JoinRequest>(`/api/campus-join-requests/${qs ? `?${qs}` : ""}`),
    enabled: options.enabled ?? true,
    refetchInterval: options.refetchInterval,
  });
}

/** After a link changes, everything the person can see changes too. */
function useRefreshAll() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries();
}

export function useJoinByInvite() {
  const refreshAll = useRefreshAll();
  return useMutation({
    mutationFn: (code: string) =>
      apiFetch<CampusPublic>("/api/campuses/join/", {
        method: "POST",
        body: JSON.stringify({ code: normalizeInviteCode(code) }),
      }),
    onSuccess: refreshAll,
  });
}

export function useCreateJoinRequest() {
  const refreshAll = useRefreshAll();
  return useMutation({
    mutationFn: (campusId: string) =>
      apiFetch<JoinRequest>("/api/campus-join-requests/", {
        method: "POST",
        body: JSON.stringify({ campus_id: campusId }),
      }),
    onSuccess: refreshAll,
  });
}

export function useDecideJoinRequest() {
  const refreshAll = useRefreshAll();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "approve" | "reject" | "cancel" }) =>
      apiFetch<JoinRequest>(`/api/campus-join-requests/${id}/${decision}/`, { method: "POST" }),
    onSuccess: refreshAll,
  });
}

export function useCampusInvite(campusId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["campus-invite", campusId],
    queryFn: () => apiFetch<{ code: string | null }>(`/api/campuses/${campusId}/invite/`),
    enabled,
  });
}

export function useCampusInviteChange(campusId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (change: "rotate" | "disable") => {
      if (change === "disable") {
        await apiFetch<void>(`/api/campuses/${campusId}/invite/`, { method: "DELETE" });
        return { code: null };
      }
      return apiFetch<{ code: string }>(`/api/campuses/${campusId}/invite/`, { method: "POST" });
    },
    onSuccess: (data) => queryClient.setQueryData(["campus-invite", campusId], data),
  });
}
