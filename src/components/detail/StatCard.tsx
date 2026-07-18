import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint?: string;
}

export function StatCard({ icon, label, value, hint }: Props) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="mt-1 truncate text-2xl font-semibold tabular-nums">{value}</div>
          {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
        </div>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
