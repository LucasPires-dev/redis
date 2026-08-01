import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiList } from "./client";
import type { CampusMini, MinistryKind } from "./ministries";

export interface PersonMini {
  id: string;
  name: string;
  email: string;
}

// Small, local duplicate of the ministry shape — mirrors how the backend itself
// keeps PersonMini/MinistryMini local to each serializer file to dodge a circular
// import between people.ts and ministries.ts.
export interface MinistryMini {
  id: string;
  name: string;
  kind: MinistryKind;
}

export interface Person {
  id: string;
  name: string;
  email: string;
  phone: string;
  campus: CampusMini | null;
  baptized: boolean;
  baptized_at: string | null;
  joined_at: string | null;
  is_manager: boolean;
  total_points: number;
  ministries: MinistryMini[];
}

export function usePeople() {
  return useQuery({
    queryKey: ["people"],
    queryFn: () => apiList<Person>("/api/people/"),
  });
}

export function usePerson(id: string | undefined) {
  return useQuery({
    queryKey: ["people", id],
    queryFn: () => apiFetch<Person>(`/api/people/${id}/`),
    enabled: !!id,
  });
}

export interface CreatePersonInput {
  name: string;
  email: string;
  password: string;
  campus_id?: string;
  baptized?: boolean;
}

export function useCreatePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePersonInput) =>
      apiFetch<Person>("/api/people/", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people"] });
    },
  });
}

export interface UpdatePersonInput {
  baptized?: boolean;
  baptized_at?: string | null;
}

export function useUpdatePerson(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdatePersonInput) =>
      apiFetch<Person>(`/api/people/${id}/`, { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people", id] });
      queryClient.invalidateQueries({ queryKey: ["reconciliations"] });
    },
  });
}
