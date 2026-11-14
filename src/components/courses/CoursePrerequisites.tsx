// "Pré-requisitos" on the course page: the courses to complete before
// enrolling in this one, edited by whoever manages the course.
import { useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DetailSection, EmptyState } from "@/components/detail/DetailSection";
import { apiErrorMessage } from "@/lib/api/client";
import { useCourses, useSetPrerequisites, type Course } from "@/lib/api/courses";

export function CoursePrerequisites({ course }: { course: Course }) {
  const [editing, setEditing] = useState(false);
  if (!course.can_manage && course.prerequisites.length === 0) return null;

  return (
    <DetailSection
      title="Pré-requisitos"
      count={course.prerequisites.length}
      action={
        course.can_manage ? (
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Button>
        ) : undefined
      }
    >
      {course.prerequisites.length === 0 ? (
        <EmptyState>Qualquer pessoa pode se inscrever, sem curso anterior.</EmptyState>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5" data-testid="course-prerequisites">
            {course.prerequisites.map((p) => (
              <Badge key={p.id} variant="secondary">
                {p.name}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Para se inscrever, é preciso ter concluído esses cursos (em qualquer turma ou campus).
          </p>
        </div>
      )}
      {editing && <PrerequisitesDialog course={course} onClose={() => setEditing(false)} />}
    </DetailSection>
  );
}

function PrerequisitesDialog({ course, onClose }: { course: Course; onClose: () => void }) {
  const { data: courses } = useCourses();
  const save = useSetPrerequisites(course.id);
  const [chosen, setChosen] = useState(() => new Set(course.prerequisites.map((p) => p.id)));
  const options = (courses ?? []).filter((c) => c.id !== course.id);

  const toggle = (id: string, on: boolean) =>
    setChosen((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const submit = () =>
    save.mutate([...chosen], {
      onSuccess: () => {
        toast.success("Pré-requisitos atualizados");
        onClose();
      },
      onError: (e) => toast.error(apiErrorMessage(e, "Não foi possível salvar.")),
    });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pré-requisitos de {course.name}</DialogTitle>
          <DialogDescription>
            Membros só conseguem se inscrever depois de concluir os cursos marcados. A coordenação
            ainda pode inscrever alguém mesmo assim.
          </DialogDescription>
        </DialogHeader>
        {options.length === 0 ? (
          <EmptyState>Não há outros cursos cadastrados.</EmptyState>
        ) : (
          <div className="space-y-2">
            {options.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={chosen.has(c.id)}
                  onCheckedChange={(v) => toggle(c.id, v === true)}
                  aria-label={c.name}
                />
                <span>{c.name}</span>
                {c.campus && (
                  <span className="text-xs text-muted-foreground">· {c.campus.name}</span>
                )}
              </label>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={save.isPending} onClick={submit}>
            {save.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
