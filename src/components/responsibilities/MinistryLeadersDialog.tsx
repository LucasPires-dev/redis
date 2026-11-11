import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMinistryLeaders } from "@/lib/api/responsibilities";
import { ResponsiblesEditor } from "./ResponsiblesEditor";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ministryId: string;
  ministryName: string;
  campusId: string;
  campusName: string;
}

// Leaders/co-leaders of one ministry at one campus. Appointed by the levels above:
// the manager, the campus leader or the ministry's general leader.
export function MinistryLeadersDialog({
  open,
  onOpenChange,
  ministryId,
  ministryName,
  campusId,
  campusName,
}: Props) {
  const { list, add, remove } = useMinistryLeaders(open ? ministryId : undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Liderança — {ministryName}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Líderes e colíderes de {ministryName} em {campusName}. Têm o mesmo nível de acesso.
        </p>
        <ResponsiblesEditor
          responsibles={list.data}
          searchEndpoint={`/api/campuses/${campusId}/people-search/`}
          add={add}
          remove={remove}
          withRole
          canEdit
          roleLabel={`liderança de ${ministryName}`}
          emptyText="Nenhum líder definido."
        />
      </DialogContent>
    </Dialog>
  );
}
