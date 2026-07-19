import { useQuery } from "@tanstack/react-query";
import { apiFetch, apiList } from "./client";
import type { PersonMini } from "./people";

export type MinistryKind =
  "jovens" | "criancas" | "adolescentes" | "mulheres" | "homens" | "casais";

export const MINISTRY_LABEL: Record<MinistryKind, string> = {
  jovens: "Jovens",
  criancas: "Crianças",
  adolescentes: "Adolescentes",
  mulheres: "Mulheres",
  homens: "Homens",
  casais: "Casais",
};

export interface CampusMini {
  id: string;
  name: string;
  city: string;
}

export interface Ministry {
  id: string;
  campus: CampusMini;
  kind: MinistryKind;
  name: string;
  description: string;
  min_age: number | null;
  max_age: number | null;
  leaders: PersonMini[];
  co_leaders: PersonMini[];
  member_count: number;
}

export interface MinistryGeneralLeadership {
  id: string;
  kind: MinistryKind;
  leaders: PersonMini[];
}

export interface MinistryMini {
  id: string;
  name: string;
  kind: MinistryKind;
}

export interface Team {
  id: string;
  ministry: MinistryMini;
  name: string;
  description: string;
  leaders: PersonMini[];
  co_leaders: PersonMini[];
  member_count: number;
  total_points: number;
}

// The API returns a flat list scoped to the caller's role — there's no server-side
// "grouped by kind" endpoint, so grouping/filtering by kind or campus happens here,
// client-side, same as the old mock-store.ts pages already did.
export function useMinistries() {
  return useQuery({
    queryKey: ["ministries"],
    queryFn: () => apiList<Ministry>("/api/ministries/"),
  });
}

export function useMinistryGeneralLeaderships() {
  return useQuery({
    queryKey: ["ministry-general-leaderships"],
    queryFn: () => apiList<MinistryGeneralLeadership>("/api/ministry-general-leaderships/"),
  });
}

export function useCampuses() {
  return useQuery({
    queryKey: ["campuses"],
    queryFn: () => apiList<CampusMini>("/api/campuses/"),
  });
}

export function useMinistryMembers(ministryId: string | undefined) {
  return useQuery({
    queryKey: ["ministry-members", ministryId],
    queryFn: () => apiFetch<PersonMini[]>(`/api/ministries/${ministryId}/members/`),
    enabled: !!ministryId,
  });
}

export function useMinistryTeams(ministryId: string | undefined) {
  return useQuery({
    queryKey: ["teams", { ministry: ministryId }],
    queryFn: () => apiList<Team>(`/api/teams/?ministry=${ministryId}`),
    enabled: !!ministryId,
  });
}

export function useTeam(teamId: string | undefined) {
  return useQuery({
    queryKey: ["teams", teamId],
    queryFn: () => apiFetch<Team>(`/api/teams/${teamId}/`),
    enabled: !!teamId,
  });
}

export function useTeamMembers(teamId: string | undefined) {
  return useQuery({
    queryKey: ["team-members", teamId],
    queryFn: () => apiFetch<PersonMini[]>(`/api/teams/${teamId}/members/`),
    enabled: !!teamId,
  });
}
