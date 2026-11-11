import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export interface AreaTab {
  /** Route of the tab (each tab is its own page). */
  to: string;
  label: ReactNode;
  /** Hidden when false — management tabs depend on the person's capabilities. */
  show?: boolean;
  /** Match only this exact path (the area's index tab). */
  exact?: boolean;
}

/**
 * Tab bar for an area screen (Cursos, Eventos, Células) where every tab is a
 * route: links, back button and bookmarks work, and each tab loads only its own
 * data. Looks like the Radix tabs used elsewhere.
 */
export function AreaTabs({ tabs }: { tabs: AreaTab[] }) {
  const visible = tabs.filter((t) => t.show !== false);
  if (visible.length < 2) return null;
  return (
    <nav aria-label="Seções" className="-mx-1 overflow-x-auto px-1">
      <div className="inline-flex h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground">
        {visible.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            activeOptions={{ exact: !!t.exact, includeSearch: false }}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
            activeProps={{
              className: "bg-background text-foreground shadow",
              "aria-current": "page",
            }}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
