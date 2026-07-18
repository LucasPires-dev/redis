import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  backTo: string;
  backLabel: string;
  icon: ReactNode;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

export function DetailHeader({ backTo, backLabel, icon, title, subtitle, actions }: Props) {
  return (
    <div className="space-y-4">
      <Link
        to={backTo}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {backLabel}
      </Link>
      <div className="flex flex-wrap items-start gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-accent-foreground">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && (
            <div className="mt-0.5 text-sm text-muted-foreground">{subtitle}</div>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
