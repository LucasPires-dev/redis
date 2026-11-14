import {
  MIN_PAID_PRICE_CENTS,
  formatTicketPrice,
  type EventTicketConfig,
} from "@/lib/api/payments";

/** Form state for a ticket. Price is kept in cents; the input shows it masked. */
export interface TicketDraft {
  mode: "free" | "paid";
  priceCents: number;
  maxCapacity: string;
  /** `datetime-local` value (local time, no timezone). */
  deadline: string;
  description: string;
  /** Companions per registration ("0": none). */
  maxCompanions: string;
  isPublic: boolean;
}

export type TicketErrors = Partial<
  Record<"priceCents" | "maxCapacity" | "deadline" | "maxCompanions", string>
>;

export const EMPTY_TICKET: TicketDraft = {
  mode: "free",
  priceCents: 0,
  maxCapacity: "",
  deadline: "",
  description: "",
  maxCompanions: "0",
  isPublic: false,
};

/** ISO date → `datetime-local` value in the browser's timezone. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ticketDraftFromConfig(config: EventTicketConfig): TicketDraft {
  return {
    mode: config.price_cents > 0 ? "paid" : "free",
    priceCents: config.price_cents,
    maxCapacity: config.max_capacity != null ? String(config.max_capacity) : "",
    deadline: config.registration_deadline ? toLocalInput(config.registration_deadline) : "",
    description: config.description ?? "",
    maxCompanions: String(config.max_companions ?? 0),
    isPublic: !!config.is_public,
  };
}

export function ticketDraftToPayload(draft: TicketDraft) {
  return {
    price_cents: draft.mode === "paid" ? draft.priceCents : 0,
    max_capacity: draft.maxCapacity ? Number(draft.maxCapacity) : null,
    registration_deadline: draft.deadline ? new Date(draft.deadline).toISOString() : null,
    description: draft.description.trim(),
    max_companions: draft.maxCompanions ? Number(draft.maxCompanions) : 0,
    is_public: draft.isPublic,
  };
}

/**
 * Same rules as the backend (apps/payments/serializers.py), so the person sees
 * the problem next to the field before submitting. `startsAt` is the event's
 * `datetime-local` start, when known.
 */
export function validateTicketDraft(draft: TicketDraft, startsAt?: string): TicketErrors {
  const errors: TicketErrors = {};
  if (draft.mode === "paid" && draft.priceCents < MIN_PAID_PRICE_CENTS) {
    errors.priceCents = `O valor mínimo de um ingresso pago é ${formatTicketPrice(MIN_PAID_PRICE_CENTS)}.`;
  }
  if (draft.maxCapacity) {
    const n = Number(draft.maxCapacity);
    if (!Number.isInteger(n) || n < 1) {
      errors.maxCapacity = "Informe um número inteiro de vagas (mínimo 1).";
    }
  }
  if (draft.maxCompanions) {
    const n = Number(draft.maxCompanions);
    if (!Number.isInteger(n) || n < 0 || n > 10) {
      errors.maxCompanions = "De 0 a 10 acompanhantes.";
    }
  }
  if (draft.deadline && startsAt && new Date(draft.deadline) > new Date(startsAt)) {
    errors.deadline = "O prazo precisa terminar até o início do evento.";
  }
  return errors;
}
