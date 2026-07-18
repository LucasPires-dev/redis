import type { ReactNode } from "react";

interface Props {
  title: string;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
}

export function DetailSection({ title, count, action, children }: Props) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {title}
          {typeof count === "number" && (
            <span className="ml-2 text-muted-foreground/70">({count})</span>
          )}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
