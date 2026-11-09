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

interface LedCell {
  id: string;
  name: string;
  campus: string;
}

interface LedCampus {
  id: string;
  name: string;
  city: string;
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
  led_cells: LedCell[];
  led_campuses: LedCampus[];
  // Responsável geral pelas células: defines seasons, manages every cell.
  is_cells_general_leader: boolean;
  // Campuses whose cells the person is in charge of (responsável pelas células do campus).
  led_campuses_cells: LedCampus[];
  is_reconciliador: boolean;
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
  if (me.is_cells_general_leader) return "Responsável Geral pelas Células";
  if (me.led_campuses_cells.length > 0) {
    return `Responsável pelas Células (${me.led_campuses_cells.map((c) => c.name).join(", ")})`;
  }
  if (me.led_campuses.length > 0) {
    return `Líder de Campus (${me.led_campuses.map((c) => c.name).join(", ")})`;
  }
  if (me.general_led_kinds.length > 0) {
    return `Líder Geral de ${me.general_led_kinds.map((k) => MINISTRY_LABEL[k]).join(", ")}`;
  }
  if (me.led_ministries.length > 0) {
    return `Líder de ${me.led_ministries.map((m) => m.name).join(", ")}`;
  }
  if (me.led_teams.length > 0) return "Líder de Equipe";
  if (me.led_cells.length > 0) {
    return `Líder de Célula ${me.led_cells.map((c) => c.name).join(", ")}`;
  }
  if (me.is_reconciliador) return "Reconciliador";
  return "Membro";
}

// A "ministry leader" account (local or general, not the mega-church manager) only
// has Ministérios to manage — the other areas (Campus, Pessoas, Eventos...) are out
// of their scope. Células is the one exception: it stays visible for a ministry
// leader who also leads/co-leads a célula, so they can reach the GT they run.
export function isMinistryLeaderOnly(me: Me | undefined): boolean {
  return (
    !!me && !me.is_manager && (me.led_ministries.length > 0 || me.general_led_kinds.length > 0)
  );
}

export function hasAnyLeadership(me: Me | undefined): boolean {
  return (
    !!me &&
    (me.led_ministries.length > 0 ||
      me.general_led_kinds.length > 0 ||
      me.led_campuses.length > 0 ||
      me.led_teams.length > 0 ||
      me.led_cells.length > 0 ||
      me.led_campuses_cells.length > 0 ||
      me.is_cells_general_leader)
  );
}

// A rank-and-file reconciliador (serves in the Reconciliação ministry, no
// leadership of anything) only needs "Reconciliação" (their own people em
// acompanhamento) — same reasoning as isMinistryLeaderOnly: the other
// managerial areas aren't in their scope.
export function isReconciliadorOnly(me: Me | undefined): boolean {
  return !!me && !me.is_manager && me.is_reconciliador && !hasAnyLeadership(me);
}

export function hasCellLeadership(me: Me | undefined): boolean {
  return (
    !!me &&
    (me.led_cells.length > 0 || me.is_cells_general_leader || me.led_campuses_cells.length > 0)
  );
}

// Church-wide cell powers: define seasons, manage every cell. Mirrors the
// backend's can_coordinate_cells.
export function canCoordinateCells(me: Me | undefined): boolean {
  return !!me && (me.is_manager || me.is_cells_general_leader);
}

// Campuses where the user may create cells (backend: can_coordinate_campus_cells).
// `null` means "every campus".
export function cellCampusIds(me: Me | undefined): Set<string> | null {
  if (!me) return new Set();
  if (canCoordinateCells(me)) return null;
  return new Set([...me.led_campuses, ...me.led_campuses_cells].map((c) => c.id));
}

// Campuses where the user may define the cells leader (backend:
// can_assign_campus_cells_leader). `null` means "every campus".
export function campusCellsLeaderAssignableIds(me: Me | undefined): Set<string> | null {
  if (!me) return new Set();
  if (canCoordinateCells(me)) return null;
  return new Set(me.led_campuses.map((c) => c.id));
}

// Triage authority (assigning leads, reassigning converts) — distinct from simply
// serving as a reconciliador. Gates the triage queue within /app/reconciliacao and
// the "Ver dashboard" link — a rank-and-file reconciliador still gets the page,
// just sees only their own "Minhas Pessoas" section.
export function hasReconciliationTriageAccess(me: Me | undefined): boolean {
  return (
    !!me &&
    (me.is_manager ||
      me.led_campuses.length > 0 ||
      me.general_led_kinds.includes("reconciliacao") ||
      me.led_ministries.some((m) => m.kind === "reconciliacao"))
  );
}
