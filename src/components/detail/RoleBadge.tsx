import { Crown, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { RosterRole } from "@/lib/roster";

export function RoleBadge({ role }: { role: RosterRole }) {
  if (role === "leader") {
    return (
      <Badge variant="outline" className="gap-1 shrink-0">
        <Crown className="h-3 w-3" /> Líder
      </Badge>
    );
  }
  if (role === "trainee") {
    return (
      <Badge
        variant="outline"
        className="gap-1 shrink-0 border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-400"
      >
        <GraduationCap className="h-3 w-3" /> Em treinamento
      </Badge>
    );
  }
  if (role === "co_leader") {
    return (
      <Badge variant="secondary" className="gap-1 shrink-0">
        Colíder
      </Badge>
    );
  }
  return null;
}
