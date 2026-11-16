// Discount coupons for paid events and course classes (cells never charge).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";

export type CouponKind = "percent" | "fixed";

export interface Coupon {
  id: string;
  code: string;
  kind: CouponKind;
  percent: number | null;
  amount_cents: number | null;
  /** null = no limit. Only active registrations/enrollments count. */
  max_uses: number | null;
  valid_until: string | null;
  is_active: boolean;
  uses: number;
  /** "20% de desconto" / "R$ 10,00 de desconto". */
  label: string;
  created_at: string;
}

/** What a person learns when checking a code. */
export interface CheckedCoupon {
  code: string;
  kind: CouponKind;
  percent: number | null;
  amount_cents: number | null;
  label: string;
}

export type CouponTarget = { event: string } | { courseClass: string };

export interface CouponInput {
  code: string;
  kind: CouponKind;
  percent: number | null;
  amount_cents: number | null;
  max_uses: number | null;
  valid_until: string | null;
  is_active?: boolean;
}

const BASE = "/api/payments/coupons/";

function targetQuery(t: CouponTarget) {
  return "event" in t ? `event=${t.event}` : `course_class=${t.courseClass}`;
}

function targetBody(t: CouponTarget) {
  return "event" in t ? { event_id: t.event } : { course_class_id: t.courseClass };
}

function targetKey(t: CouponTarget) {
  return ["coupons", "event" in t ? t.event : t.courseClass];
}

/** Mirrors the server: percent rounds down; a fixed amount never exceeds the total. */
export function couponDiscount(
  c: Pick<CheckedCoupon, "kind" | "percent" | "amount_cents">,
  totalCents: number,
) {
  if (c.kind === "percent") return Math.floor((totalCents * (c.percent ?? 0)) / 100);
  return Math.min(c.amount_cents ?? 0, totalCents);
}

export function checkCoupon(target: CouponTarget, code: string) {
  return apiFetch<CheckedCoupon>(`${BASE}check/`, {
    method: "POST",
    body: JSON.stringify({ code, ...targetBody(target) }),
  });
}

export function useCoupons(target: CouponTarget) {
  return useQuery({
    queryKey: targetKey(target),
    queryFn: () =>
      apiFetch<{ results: Coupon[] } | Coupon[]>(`${BASE}?${targetQuery(target)}`).then((r) =>
        Array.isArray(r) ? r : r.results,
      ),
  });
}

export function useSaveCoupon(target: CouponTarget) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<CouponInput> & { id?: string }) =>
      id
        ? apiFetch<Coupon>(`${BASE}${id}/`, { method: "PATCH", body: JSON.stringify(data) })
        : apiFetch<Coupon>(BASE, {
            method: "POST",
            body: JSON.stringify({ ...data, ...targetBody(target) }),
          }),
    onSuccess: () => qc.invalidateQueries({ queryKey: targetKey(target) }),
  });
}

export function useDeleteCoupon(target: CouponTarget) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`${BASE}${id}/`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: targetKey(target) }),
  });
}
