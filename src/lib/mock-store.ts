// Frontend-only mock store. Persists in localStorage. No backend.
import { useSyncExternalStore } from "react";

export type RoleKey =
  | "gestor" // Gestor da Mega Igreja
  | "lider_campus" // Líder de Campus
  | "lider_geral_ministerio" // Líder geral de um ministério (todos os campus)
  | "lider_ministerio_campus"; // Líder de ministério de um campus / GT / discipulador

export interface Campus {
  id: string;
  name: string;
  city: string;
  leaderId: string;
}

export type MinistryKind = "jovens" | "criancas" | "adolescentes" | "mulheres" | "homens" | "casais";

export interface Ministry {
  id: string;
  campusId: string;
  kind: MinistryKind;
  leaderId: string;
}

export interface Person {
  id: string;
  name: string;
  email: string;
  campusId: string;
  ministryIds: string[];
  cellId?: string;
  discipulerId?: string;
  baptized: boolean;
  baptizedAt?: string;
  joinedAt: string;
}

export interface Cell {
  id: string;
  campusId: string;
  name: string;
  leaderId: string;
  weekday: string;
  memberIds: string[];
}

export interface Course {
  id: string;
  campusId: string | null; // null = geral (toda a igreja)
  name: string;
  description: string;
  enrolled: number;
}

export type EventScope = "geral" | "campus" | "ministerio";
export interface ChurchEvent {
  id: string;
  title: string;
  scope: EventScope;
  campusId?: string;
  ministryId?: string;
  date: string;
  creatorRole: RoleKey;
}

export interface Attendance {
  id: string;
  personId: string;
  kind: "culto" | "celula" | "atividade";
  date: string;
}

interface DB {
  currentRole: RoleKey;
  currentCampusId: string;
  currentMinistryKind: MinistryKind;
  campuses: Campus[];
  ministries: Ministry[];
  people: Person[];
  cells: Cell[];
  courses: Course[];
  events: ChurchEvent[];
  attendance: Attendance[];
}

const KEY = "mega-church-db-v1";

function seed(): DB {
  const campuses: Campus[] = [
    { id: "c1", name: "Sede Central", city: "São Paulo", leaderId: "p1" },
    { id: "c2", name: "Campus Zona Sul", city: "São Paulo", leaderId: "p2" },
    { id: "c3", name: "Campus Rio", city: "Rio de Janeiro", leaderId: "p3" },
  ];
  const kinds: MinistryKind[] = ["jovens", "criancas", "adolescentes", "mulheres", "homens"];
  const ministries: Ministry[] = campuses.flatMap((c, ci) =>
    kinds.map((k, i) => ({ id: `m-${c.id}-${k}`, campusId: c.id, kind: k, leaderId: `p${10 + ci * 10 + i}` })),
  );
  const cells: Cell[] = campuses.flatMap((c, i) => [
    { id: `cell-${c.id}-1`, campusId: c.id, name: `Célula Vida ${i + 1}`, leaderId: `p${100 + i}`, weekday: "Quarta", memberIds: [] },
    { id: `cell-${c.id}-2`, campusId: c.id, name: `Célula Restauração ${i + 1}`, leaderId: `p${110 + i}`, weekday: "Sexta", memberIds: [] },
  ]);
  const firstNames = ["Ana", "Bruno", "Carla", "Daniel", "Eduarda", "Felipe", "Giovana", "Henrique", "Isabela", "João", "Karina", "Lucas", "Mariana", "Nicolas", "Olívia", "Pedro", "Rafaela", "Samuel", "Tainá", "Vinícius"];
  const surnames = ["Silva", "Souza", "Oliveira", "Costa", "Ferreira", "Rocha", "Almeida", "Ribeiro", "Cardoso", "Nunes"];
  const people: Person[] = [];
  for (let i = 0; i < 60; i++) {
    const campus = campuses[i % campuses.length];
    const camMinistries = ministries.filter((m) => m.campusId === campus.id);
    const ms = [camMinistries[i % camMinistries.length].id];
    const cell = cells.filter((c) => c.campusId === campus.id)[i % 2];
    const baptized = i % 3 !== 0;
    const fn = firstNames[i % firstNames.length];
    const sn = surnames[(i * 3) % surnames.length];
    people.push({
      id: `p-${i}`,
      name: `${fn} ${sn}`,
      email: `${fn.toLowerCase()}.${sn.toLowerCase()}@igreja.org`,
      campusId: campus.id,
      ministryIds: ms,
      cellId: cell.id,
      baptized,
      baptizedAt: baptized ? `2023-0${(i % 9) + 1}-15` : undefined,
      joinedAt: `2022-0${(i % 9) + 1}-10`,
    });
    cell.memberIds.push(`p-${i}`);
  }
  const courses: Course[] = [
    { id: "co1", campusId: null, name: "Escola de Líderes", description: "Formação de novos líderes.", enrolled: 42 },
    { id: "co2", campusId: null, name: "Fundamentos da Fé", description: "Curso para novos convertidos.", enrolled: 128 },
    { id: "co3", campusId: "c1", name: "Casais Restaurados", description: "Curso para casais na Sede.", enrolled: 24 },
  ];
  const events: ChurchEvent[] = [
    { id: "e1", title: "Conferência Nacional 2026", scope: "geral", date: "2026-08-14", creatorRole: "gestor" },
    { id: "e2", title: "Culto Especial Zona Sul", scope: "campus", campusId: "c2", date: "2026-07-30", creatorRole: "lider_campus" },
    { id: "e3", title: "Retiro de Jovens Sede", scope: "ministerio", campusId: "c1", ministryId: "m-c1-jovens", date: "2026-09-05", creatorRole: "lider_ministerio_campus" },
    { id: "e4", title: "Encontro de Mulheres Rio", scope: "ministerio", campusId: "c3", ministryId: "m-c3-mulheres", date: "2026-08-20", creatorRole: "lider_ministerio_campus" },
  ];
  const attendance: Attendance[] = [];
  for (let i = 0; i < 200; i++) {
    const p = people[i % people.length];
    attendance.push({ id: `a-${i}`, personId: p.id, kind: i % 2 ? "culto" : "celula", date: `2026-0${(i % 7) + 1}-1${i % 9}` });
  }
  return {
    currentRole: "gestor",
    currentCampusId: "c1",
    currentMinistryKind: "jovens",
    campuses,
    ministries,
    people,
    cells,
    courses,
    events,
    attendance,
  };
}

let db: DB = load();
const listeners = new Set<() => void>();

function load(): DB {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as DB;
  } catch {}
  const s = seed();
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
  return s;
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {}
  listeners.forEach((l) => l());
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getSnapshot(): DB {
  return db;
}

export function useDB<T>(selector: (d: DB) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(db),
    () => selector(db),
  );
}

export const actions = {
  setRole(r: RoleKey) {
    db = { ...db, currentRole: r };
    persist();
  },
  setCampus(id: string) {
    db = { ...db, currentCampusId: id };
    persist();
  },
  setMinistryKind(k: MinistryKind) {
    db = { ...db, currentMinistryKind: k };
    persist();
  },
  addCampus(name: string, city: string) {
    db = { ...db, campuses: [...db.campuses, { id: `c-${Date.now()}`, name, city, leaderId: "" }] };
    persist();
  },
  addPerson(p: Omit<Person, "id" | "joinedAt">) {
    const person: Person = { ...p, id: `p-${Date.now()}`, joinedAt: new Date().toISOString().slice(0, 10) };
    db = { ...db, people: [...db.people, person] };
    persist();
  },
  addEvent(e: Omit<ChurchEvent, "id" | "creatorRole"> & { creatorRole?: RoleKey }) {
    const ev: ChurchEvent = { ...e, id: `e-${Date.now()}`, creatorRole: e.creatorRole ?? db.currentRole };
    db = { ...db, events: [...db.events, ev] };
    persist();
  },
  addCell(c: Omit<Cell, "id" | "memberIds">) {
    db = { ...db, cells: [...db.cells, { ...c, id: `cell-${Date.now()}`, memberIds: [] }] };
    persist();
  },
  reset() {
    db = seed();
    persist();
  },
};

export const ROLE_LABEL: Record<RoleKey, string> = {
  gestor: "Gestor da Mega Igreja",
  lider_campus: "Líder de Campus",
  lider_geral_ministerio: "Líder Geral de Ministério",
  lider_ministerio_campus: "Líder de Ministério / GT",
};

export const MINISTRY_LABEL: Record<MinistryKind, string> = {
  jovens: "Jovens",
  criancas: "Crianças",
  adolescentes: "Adolescentes",
  mulheres: "Mulheres",
  homens: "Homens",
  casais: "Casais",
};

// Visibility helpers — encode the sharing cascade described in the brief
export function visibleEvents(d: DB): ChurchEvent[] {
  switch (d.currentRole) {
    case "gestor":
      return d.events;
    case "lider_campus":
      // eventos geral + do próprio campus + ministeriais desse campus
      return d.events.filter(
        (e) => e.scope === "geral" || e.campusId === d.currentCampusId,
      );
    case "lider_geral_ministerio":
      // eventos geral + ministeriais do seu tipo em todos os campus
      return d.events.filter(
        (e) =>
          e.scope === "geral" ||
          (e.scope === "ministerio" &&
            d.ministries.find((m) => m.id === e.ministryId)?.kind === d.currentMinistryKind),
      );
    case "lider_ministerio_campus":
      return d.events.filter(
        (e) =>
          e.scope === "geral" ||
          (e.scope === "campus" && e.campusId === d.currentCampusId) ||
          (e.scope === "ministerio" &&
            e.campusId === d.currentCampusId &&
            d.ministries.find((m) => m.id === e.ministryId)?.kind === d.currentMinistryKind),
      );
  }
}

export function visiblePeople(d: DB): Person[] {
  switch (d.currentRole) {
    case "gestor":
      return d.people;
    case "lider_campus":
      return d.people.filter((p) => p.campusId === d.currentCampusId);
    case "lider_geral_ministerio":
      return d.people.filter((p) =>
        p.ministryIds.some(
          (mid) => d.ministries.find((m) => m.id === mid)?.kind === d.currentMinistryKind,
        ),
      );
    case "lider_ministerio_campus":
      return d.people.filter(
        (p) =>
          p.campusId === d.currentCampusId &&
          p.ministryIds.some(
            (mid) => d.ministries.find((m) => m.id === mid)?.kind === d.currentMinistryKind,
          ),
      );
  }
}
