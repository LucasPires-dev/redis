import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PersonSearch } from "@/components/cells/PersonSearch";
import { useAddEnrollment, type Enrollment } from "@/lib/api/courses";
import { apiErrorMessage } from "@/lib/api/client";
import type { PersonMini } from "@/lib/api/people";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  existingEnrollments: Enrollment[];
}

export function AddEnrollmentDialog({ open, onOpenChange, classId, existingEnrollments }: Props) {
  const addEnrollment = useAddEnrollment();
  const [selected, setSelected] = useState<PersonMini | null>(null);

  const excludeIds = new Set(existingEnrollments.map((e) => e.person.id));

  const reset = () => setSelected(null);

  const submit = () => {
    if (!selected) return;
    addEnrollment.mutate(
      { classId, person_id: selected.id },
      {
        onSuccess: () => {
          toast.success(`${selected.name} inscrito na turma`);
          onOpenChange(false);
          reset();
        },
        onError: (e) =>
          toast.error(apiErrorMessage(e, "Não foi possível inscrever o aluno.")),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inscrever aluno</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {selected ? (
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <p className="text-sm font-medium">{selected.name}</p>
                <p className="text-xs text-muted-foreground">{selected.email}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                Trocar
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Buscar pessoa</Label>
              <PersonSearch
                endpoint={`/api/course-classes/${classId}/search-people/`}
                onSelect={setSelected}
                excludeIds={excludeIds}
                placeholder="Buscar por nome ou email"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!selected || addEnrollment.isPending}>
            {addEnrollment.isPending ? "Salvando…" : "Inscrever"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
