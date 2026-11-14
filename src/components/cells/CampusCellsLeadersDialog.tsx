import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RoleBadge } from "@/components/detail/RoleBadge";
import { campusCellsLeaderAssignableIds, useMe } from "@/lib/api/auth";
import {
  useAssignCampusCellsLeader,
  useCampusCellsLeaders,
  useRemoveCampusCellsLeader,
  type LeadershipRole,
} from "@/lib/api/cells";
import { apiErrorMessage } from "@/lib/api/client";
import { useCampuses } from "@/lib/api/ministries";
import { PersonSearch } from "./PersonSearch";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Responsáveis pelas células de cada campus. Defined by the campus leader (or
// the manager / general cells leader).
export function CampusCellsLeadersDialog({ open, onOpenChange }: Props) {
  const { data: me } = useMe();
  const { data: campuses } = useCampuses();
  const allowed = campusCellsLeaderAssignableIds(me);
  const options = (campuses ?? []).filter((c) => allowed === null || allowed.has(c.id));
  const [picked, setPicked] = useState<string>("");
  const campusId = picked || options[0]?.id || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Responsáveis pelas células</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Cuidam de todas as células do campus: criam células, definem líderes e renovam para a
          próxima temporada.
        </p>
        {options.length > 1 && (
          <div className="space-y-1.5">
            <Label>Campus</Label>
            <Select value={campusId} onValueChange={setPicked}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {campusId ? (
          <CampusLeaders
            campusId={campusId}
            campusName={options.find((c) => c.id === campusId)?.name}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum campus disponível.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CampusLeaders({ campusId, campusName }: { campusId: string; campusName?: string }) {
  const { data: leaders } = useCampusCellsLeaders(campusId);
  const assign = useAssignCampusCellsLeader(campusId);
  const remove = useRemoveCampusCellsLeader(campusId);
  const [role, setRole] = useState<LeadershipRole>("leader");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {(leaders ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum responsável definido{campusName ? ` em ${campusName}` : ""}.
          </p>
        )}
        {(leaders ?? []).map((l) => (
          <div key={l.id} className="flex items-center gap-3 rounded-md border px-3 py-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{l.person.name}</div>
              <div className="truncate text-xs text-muted-foreground">{l.person.email}</div>
            </div>
            <RoleBadge role={l.role} />
            <Button
              size="icon"
              variant="ghost"
              aria-label="Remover"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(l.person.id, {
                  onSuccess: () => toast.success("Responsável removido"),
                  onError: (e) => toast.error(apiErrorMessage(e, "Não foi possível remover.")),
                })
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-2 rounded-md border p-3">
        <div className="flex items-center justify-between gap-2">
          <Label>Adicionar (pessoas do campus)</Label>
          <Select value={role} onValueChange={(v) => setRole(v as LeadershipRole)}>
            <SelectTrigger className="h-8 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="leader">Líder</SelectItem>
              <SelectItem value="co_leader">Colíder</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <PersonSearch
          endpoint={`/api/campuses/${campusId}/people-search/`}
          excludeIds={new Set((leaders ?? []).map((l) => l.person.id))}
          disabled={assign.isPending}
          onSelect={(p) =>
            assign.mutate(
              { person_id: p.id, role },
              {
                onSuccess: () => toast.success(`${p.name} agora é responsável pelas células`),
                onError: (e) => toast.error(apiErrorMessage(e, "Não foi possível adicionar.")),
              },
            )
          }
        />
      </div>
    </div>
  );
}
