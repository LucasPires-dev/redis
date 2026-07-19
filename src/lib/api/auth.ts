import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, clearTokens, hasAccessToken, setTokens } from "./client";
import { MINISTRY_LABEL, type CampusMini, type MinistryKind } from "./ministries";

interface LedMinistry {
  id: string;
  name: string;
  kind: MinistryKind;
}

interface LedTeam {
  id: string;
  name: string;
  ministry: string;
}

export interface Me {
  id: string;
  name: string;
  email: string;
  phone: string;
  campus: CampusMini | null;
  baptized: boolean;
  is_manager: boolean;
  led_ministries: LedMinistry[];
  general_led_kinds: MinistryKind[];
  led_teams: LedTeam[];
  total_points: number;
}

export async function login(email: string, password: string) {
  const tokens = await apiFetch<{ access: string; refresh: string }>("/api/auth/login/", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setTokens(tokens);
}

export function logout() {
  clearTokens();
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<Me>("/api/auth/me/"),
    enabled: hasAccessToken(),
    retry: false,
  });
}

export function useAuth() {
  const queryClient = useQueryClient();
  const meQuery = useMe();
  return {
    me: meQuery.data,
    isLoading: hasAccessToken() && meQuery.isLoading,
    isAuthenticated: !!meQuery.data,
    logout: () => {
      logout();
      queryClient.setQueryData(["me"], undefined);
      queryClient.clear();
    },
  };
}

// /api/auth/me/ doesn't return one single "role" enum (that was a mock-only concept
// tied to the old demo role-switcher) — it returns is_manager + the leadership
// relations, so the display label is derived client-side from those.
export function deriveRoleLabel(me: Me | undefined): string {
  if (!me) return "";
  if (me.is_manager) return "Gestor da Mega Igreja";
  if (me.general_led_kinds.length > 0) {
    return `Líder Geral de ${me.general_led_kinds.map((k) => MINISTRY_LABEL[k]).join(", ")}`;
  }
  if (me.led_ministries.length > 0) {
    return `Líder de ${me.led_ministries.map((m) => m.name).join(", ")}`;
  }
  if (me.led_teams.length > 0) return "Líder de Equipe";
  return "Membro";
}
