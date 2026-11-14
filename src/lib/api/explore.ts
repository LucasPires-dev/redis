import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./client";

// What anyone may see without logging in (/api/public/…). A public cell shows
// only its church, weekday and time.

export interface ChurchMini {
  id: string;
  name: string;
}

export interface PublicPlace {
  name: string;
  city: string;
}

export interface PublicCell {
  id: string;
  church: ChurchMini;
  meeting_day: number | null;
  meeting_day_display: string;
  meeting_time: string | null;
}

export interface PublicClass {
  id: string;
  course_name: string;
  course_description: string;
  name: string;
  description: string;
  church: ChurchMini;
  campus: PublicPlace | null;
  weekday: number | null;
  start_time: string | null;
  start_date: string | null;
  end_date: string | null;
  enrollment_deadline: string | null;
  base_price_cents: number;
}

export interface ExploreEvent {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  church: ChurchMini | null;
  campus: PublicPlace | null;
  /** Null: no registration, just come. */
  registration: { price_from_cents: number } | null;
}

export interface Explore {
  churches: ChurchMini[];
  events: ExploreEvent[];
  classes: PublicClass[];
  cells: PublicCell[];
}

export function useExplore(churchId?: string) {
  return useQuery({
    queryKey: ["explore", churchId ?? "all"],
    queryFn: () =>
      apiFetch<Explore>(`/api/public/explore/${churchId ? `?church=${churchId}` : ""}`),
  });
}

export function usePublicCell(id: string) {
  return useQuery({
    queryKey: ["public-cell", id],
    queryFn: () => apiFetch<PublicCell>(`/api/public/cells/${id}/`),
    retry: false,
  });
}

export function usePublicClass(id: string) {
  return useQuery({
    queryKey: ["public-class", id],
    queryFn: () => apiFetch<PublicClass>(`/api/public/classes/${id}/`),
    retry: false,
  });
}

export const publicCellPath = (id: string) => `/celula/${id}`;
export const publicClassPath = (id: string) => `/turma/${id}`;
