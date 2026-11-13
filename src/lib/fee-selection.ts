import type { ClassFeeItem, FeeChoice } from "@/lib/api/courses";
import { MIN_PAID_PRICE_CENTS } from "@/lib/api/payments";

/** What the person picked: item id → chosen option ("" when it has none). */
export type FeeSelection = Record<string, string>;

/** Required items start selected (their option still to be chosen). */
export function initialSelection(items: ClassFeeItem[]): FeeSelection {
  return Object.fromEntries(items.filter((i) => i.required && i.id).map((i) => [i.id!, ""]));
}

export function selectionTotal(items: ClassFeeItem[], selection: FeeSelection) {
  return items.filter((i) => i.id && i.id in selection).reduce((s, i) => s + i.price_cents, 0);
}

/** An item with options needs one picked. */
export function selectionComplete(items: ClassFeeItem[], selection: FeeSelection) {
  return items.every(
    (i) => !i.id || !(i.id in selection) || !i.options.length || !!selection[i.id],
  );
}

export function toChoices(selection: FeeSelection): FeeChoice[] {
  return Object.entries(selection).map(([fee_item_id, option]) => ({ fee_item_id, option }));
}

/** Installment counts allowed for a total: up to the class limit, R$ 5,00 each at least. */
export function installmentOptions(total: number, max: number) {
  const limit = Math.max(1, Math.min(max, Math.floor(total / MIN_PAID_PRICE_CENTS)));
  return Array.from({ length: limit }, (_, i) => i + 1);
}
