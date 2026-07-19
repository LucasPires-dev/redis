import { useId } from "react";

interface Props {
  className?: string;
  title?: string;
  /** Show the "redis" wordmark next to the symbol. */
  withWordmark?: boolean;
  /** Show the tagline under the wordmark. Only used when withWordmark is true. */
  withTagline?: boolean;
}

/**
 * Redis brand mark — a geometric "R" built from connected nodes,
 * representing people, ministries, cells and campi forming one flock.
 *
 * Colors come from CSS variables so the mark adapts to light/dark:
 *   --brand-petrol  → deep petrol blue
 *   --brand-emerald → emerald green
 *   --brand-ink     → wordmark ink
 */
export function RedisLogo({
  className,
  title = "Redis",
  withWordmark = false,
  withTagline = false,
}: Props) {
  const gid = useId().replace(/:/g, "");
  const gradId = `redis-grad-${gid}`;

  const Symbol = (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--brand-petrol)" />
          <stop offset="100%" stopColor="var(--brand-emerald)" />
        </linearGradient>
      </defs>
      <g fill={`url(#${gradId})`}>
        {/* Vertical spine of the R */}
        <circle cx="14" cy="10" r="4.2" />
        <circle cx="14" cy="22" r="4.2" />
        <circle cx="14" cy="34" r="4.2" />
        <circle cx="14" cy="46" r="4.2" />
        <circle cx="14" cy="58" r="4.2" />
        {/* Top bowl */}
        <circle cx="26" cy="10" r="4.2" />
        <circle cx="38" cy="10" r="4.2" />
        <circle cx="45" cy="18" r="4.2" />
        <circle cx="45" cy="28" r="4.2" />
        <circle cx="38" cy="34" r="4.2" />
        <circle cx="26" cy="34" r="4.2" />
        {/* Diagonal leg */}
        <circle cx="30" cy="44" r="4.2" />
        <circle cx="38" cy="52" r="4.2" />
        <circle cx="46" cy="60" r="4.2" />
        {/* Connections */}
        <g
          stroke={`url(#${gradId})`}
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        >
          <line x1="14" y1="10" x2="14" y2="58" />
          <line x1="14" y1="10" x2="38" y2="10" />
          <line x1="38" y1="10" x2="45" y2="18" />
          <line x1="45" y1="18" x2="45" y2="28" />
          <line x1="45" y1="28" x2="38" y2="34" />
          <line x1="14" y1="34" x2="38" y2="34" />
          <line x1="22" y1="34" x2="30" y2="44" />
          <line x1="30" y1="44" x2="46" y2="60" />
        </g>
      </g>
    </svg>
  );

  if (!withWordmark) {
    return <span className={className}>{Symbol}</span>;
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <span className="h-full aspect-square shrink-0">{Symbol}</span>
      <span className="flex flex-col leading-none">
        <span
          className="font-semibold tracking-tight"
          style={{ color: "var(--brand-ink)", fontSize: "1.35em", letterSpacing: "-0.02em" }}
        >
          redis
        </span>
        {withTagline && (
          <span
            className="mt-1 text-[0.55em] font-medium uppercase tracking-[0.18em]"
            style={{ color: "var(--brand-petrol)" }}
          >
            administrando todo o rebanho.
          </span>
        )}
      </span>
    </span>
  );
}
