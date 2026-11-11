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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PersonSearch } from "@/components/cells/PersonSearch";
import {
  useAddTeacher,
  TEACHER_ROLE_LABEL,
  type TeacherRole,
  type Teacher,
} from "@/lib/api/courses";
import { apiErrorMessage } from "@/lib/api/client";
import type { PersonMini } from "@/lib/api/people";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  existingTeachers: Teacher[];
}

export function AddTeacherDialog({ open, onOpenChange, classId, existingTeachers }: Props) {
  const addTeacher = useAddTeacher();
  const [selected, setSelected] = useState<PersonMini | null>(null);
  const [role, setRole] = useState<TeacherRole>("teacher");

  const excludeIds = new Set(existingTeachers.map((t) => t.person.id));

  const reset = () => {
    setSelected(null);
    setRole("teacher");
  };

  const submit = () => {
    if (!selected) return;
    addTeacher.mutate(
      { classId, person_id: selected.id, role },
      {
        onSuccess: () => {
          toast.success(`${selected.name} adicionado como ${TEACHER_ROLE_LABEL[role].toLowerCase()}`);
          onOpenChange(false);
          reset();
        },
        onError: (e) =>
          toast.error(apiErrorMessage(e, "Não foi possível adicionar o professor.")),
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
          <DialogTitle>Adicionar professor</DialogTitle>
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

          <div className="space-y-1.5">
            <Label>Função</Label>
            <Select value={role} onValueChange={(v) => setRole(v as TeacherRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="teacher">{TEACHER_ROLE_LABEL.teacher}</SelectItem>
                <SelectItem value="assistant">{TEACHER_ROLE_LABEL.assistant}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!selected || addTeacher.isPending}>
            {addTeacher.isPending ? "Salvando…" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
