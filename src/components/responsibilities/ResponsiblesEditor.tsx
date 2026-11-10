import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RoleBadge } from "@/components/detail/RoleBadge";
import { PersonSearch } from "@/components/cells/PersonSearch";
import type { LeadershipRole } from "@/lib/api/cells";
import { apiErrorMessage } from "@/lib/api/client";
import type { Responsible } from "@/lib/api/responsibilities";

interface Mutation<TInput> {
  mutate: (input: TInput, opts: { onSuccess: () => void; onError: (e: unknown) => void }) => void;
  isPending: boolean;
}

interface Props {
  responsibles: Responsible[] | undefined;
  // People-search endpoint for the picker (campus or whole church).
  searchEndpoint: string;
  add: Mutation<{ person_id: string; role?: LeadershipRole }>;
  remove: Mutation<string>;
  // Leader/co-leader areas show a role picker; the others (e.g. producers) don't.
  withRole?: boolean;
  // Read-only for people who can see but not appoint at this level.
  canEdit: boolean;
  // Shown in the toast after adding, e.g. "responsável pelos cursos".
  roleLabel: string;
  emptyText?: string;
}

// Editable list of the people responsible for something: list, remove, and add via
// a type-ahead search. Shared by every area of the access hierarchy.
export function ResponsiblesEditor({
  responsibles,
  searchEndpoint,
  add,
  remove,
  withRole = false,
  canEdit,
  roleLabel,
  emptyText = "Ninguém definido.",
}: Props) {
  const [role, setRole] = useState<LeadershipRole>("leader");
  const list = responsibles ?? [];

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {list.length === 0 && <p className="text-sm text-muted-foreground">{emptyText}</p>}
        {list.map(({ person, role: personRole }) => (
          <div key={person.id} className="flex items-center gap-3 rounded-md border px-3 py-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{person.name}</div>
              <div className="truncate text-xs text-muted-foreground">{person.email}</div>
            </div>
            {personRole && <RoleBadge role={personRole} />}
            {canEdit && (
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Remover ${person.name}`}
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutate(person.id, {
                    onSuccess: () => toast.success(`${person.name} removido(a)`),
                    onError: (e) => toast.error(apiErrorMessage(e, "Não foi possível remover.")),
                  })
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {canEdit && (
        <div className="space-y-2 rounded-md border p-3">
          <div className="flex items-center justify-between gap-2">
            <Label>Adicionar</Label>
            {withRole && (
              <Select value={role} onValueChange={(v) => setRole(v as LeadershipRole)}>
                <SelectTrigger className="h-8 w-32" aria-label="Papel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="leader">Líder</SelectItem>
                  <SelectItem value="co_leader">Colíder</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <PersonSearch
            endpoint={searchEndpoint}
            excludeIds={new Set(list.map((r) => r.person.id))}
            disabled={add.isPending}
            onSelect={(p) =>
              add.mutate(withRole ? { person_id: p.id, role } : { person_id: p.id }, {
                onSuccess: () => toast.success(`${p.name} agora é ${roleLabel}`),
                onError: (e) => toast.error(apiErrorMessage(e, "Não foi possível adicionar.")),
              })
            }
          />
        </div>
      )}
    </div>
  );
}
