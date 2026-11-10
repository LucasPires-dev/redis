// Appointing responsibles across the access hierarchy:
// - manager → general (church-wide) leaders of each area;
// - campus leader / general leader of the area → that area's leaders at a campus.
// Each area follows the same general + local pattern in the backend.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LeadershipRole } from "./cells";
import { apiFetch } from "./client";
import type { MinistryKind } from "./ministries";
import type { PersonMini } from "./people";

// One entry of an editable list; `role` only exists for leader/co-leader areas.
export interface Responsible {
  person: PersonMini;
  role?: LeadershipRole;
}

interface RoleLeadership {
  id: string;
  person: PersonMini;
  role: LeadershipRole;
}

const toResponsibles = (people: PersonMini[]): Responsible[] =>
  people.map((person) => ({ person }));
const fromLeaderships = (rows: RoleLeadership[]): Responsible[] =>
  rows.map(({ person, role }) => ({ person, role }));

// --- Generic hooks: list + add + remove over one endpoint ------------------------------

function useResponsibleList(
  key: readonly unknown[],
  path: string | null,
  parse: (data: never) => Responsible[],
) {
  return useQuery({
    queryKey: key,
    queryFn: async () => parse((await apiFetch<unknown>(path!)) as never),
    enabled: !!path,
  });
}

function useAddResponsible(
  key: readonly unknown[],
  path: string,
  extraInvalidate: string[][] = [],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { person_id: string; role?: LeadershipRole }) =>
      apiFetch(path, { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
      extraInvalidate.forEach((k) => queryClient.invalidateQueries({ queryKey: k }));
    },
  });
}

function useRemoveResponsible(
  key: readonly unknown[],
  path: string,
  extraInvalidate: string[][] = [],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (personId: string) => apiFetch<void>(`${path}${personId}/`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
      extraInvalidate.forEach((k) => queryClient.invalidateQueries({ queryKey: k }));
    },
  });
}

// --- General (church-wide) leaders: chosen by the manager -----------------------------

export type ChurchArea = "cells" | "courses" | "events";

const CHURCH_AREA_PATH: Record<ChurchArea, string> = {
  cells: "cells-general-leaders",
  courses: "courses-general-leaders",
  events: "event-general-producers",
};

export function useChurchAreaLeaders(churchId: string | undefined, area: ChurchArea) {
  const key = ["general-leaders", area, churchId] as const;
  const path = churchId ? `/api/churches/${churchId}/${CHURCH_AREA_PATH[area]}/` : null;
  const list = useResponsibleList(key, path, toResponsibles as (d: never) => Responsible[]);
  const base = path ?? "";
  // Invalidating "me" refreshes the nav/permissions if the manager appoints themselves.
  const add = useAddResponsible(key, base, [["me"]]);
  const remove = useRemoveResponsible(key, base, [["me"]]);
  return { list, add, remove };
}

// Ministry general leaders are per kind (e.g. líder geral de Jovens).
export function useMinistryKindLeaders(kind: MinistryKind) {
  const key = ["ministry-general-leaderships"] as const;
  const path = `/api/ministry-general-leaderships/${kind}/leaders/`;
  const add = useAddResponsible(key, path, [["me"], ["ministries"]]);
  const remove = useRemoveResponsible(key, path, [["me"], ["ministries"]]);
  return { add, remove };
}

// --- Campus-level responsibles: appointed by the campus leader (or a level above) ------

export type CampusArea = "courses" | "events";

export function useCampusAreaLeaders(campusId: string | undefined, area: CampusArea) {
  const key = ["campus-area-leaders", area, campusId] as const;
  const segment = area === "courses" ? "courses-leaderships" : "event-producers";
  const path = campusId ? `/api/campuses/${campusId}/${segment}/` : null;
  const parse = (area === "courses" ? fromLeaderships : toResponsibles) as (
    d: never,
  ) => Responsible[];
  const list = useResponsibleList(key, path, parse);
  const base = path ?? "";
  return {
    list,
    add: useAddResponsible(key, base, [["me"]]),
    remove: useRemoveResponsible(key, base, [["me"]]),
  };
}

// --- Leaders of one ministry at one campus ----------------------------------------------

export function useMinistryLeaders(ministryId: string | undefined) {
  const key = ["ministry-leaderships", ministryId] as const;
  const path = ministryId ? `/api/ministries/${ministryId}/leaderships/` : null;
  const list = useResponsibleList(key, path, fromLeaderships as (d: never) => Responsible[]);
  const base = path ?? "";
  // The ministry cards show leaders/co_leaders, so refresh the ministries list too.
  return {
    list,
    add: useAddResponsible(key, base, [["ministries"], ["me"]]),
    remove: useRemoveResponsible(key, base, [["ministries"], ["me"]]),
  };
}
