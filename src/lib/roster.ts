import type { PersonMini } from "@/lib/api/people";

export type RosterRole = "leader" | "co_leader" | "trainee" | "member";

export interface RosterEntry {
  person: PersonMini;
  role: RosterRole;
}

// WhatsApp-style roster: leaders first, then co-leaders, leaders in training
// (cells only), then everyone else — alphabetical within each group. Leaders/co-leaders are included even when they
// aren't in the plain `members` list (e.g. a ministry leader who isn't a "member").
export function buildRoster(
  leaders: PersonMini[],
  coLeaders: PersonMini[],
  members: PersonMini[],
  trainees: PersonMini[] = [],
): RosterEntry[] {
  const roleById = new Map<string, RosterRole>();
  for (const p of leaders) roleById.set(p.id, "leader");
  for (const p of coLeaders) if (!roleById.has(p.id)) roleById.set(p.id, "co_leader");
  for (const p of trainees) if (!roleById.has(p.id)) roleById.set(p.id, "trainee");

  const byId = new Map<string, PersonMini>();
  for (const p of [...leaders, ...coLeaders, ...trainees, ...members]) byId.set(p.id, p);

  const rank: Record<RosterRole, number> = { leader: 0, co_leader: 1, trainee: 2, member: 3 };
  return [...byId.values()]
    .map((person) => ({ person, role: roleById.get(person.id) ?? ("member" as const) }))
    .sort(
      (a, b) => rank[a.role] - rank[b.role] || a.person.name.localeCompare(b.person.name, "pt-BR"),
    );
}
