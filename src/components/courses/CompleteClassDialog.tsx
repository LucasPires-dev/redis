import { useState } from "react";
import { toast } from "sonner";
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
import { apiErrorMessage } from "@/lib/api/client";
import { attendanceLabel, attendanceTone } from "@/lib/attendance";
import { useCompleteClass, type CourseClass, type Enrollment } from "@/lib/api/courses";

/**
 * Closes the class: who reached the minimum attendance comes pre-selected;
 * the rest can be included by hand (a pastoral decision, not the system's).
 */
export function CompleteClassDialog({
  open,
  onOpenChange,
  courseClass,
  enrollments,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseClass: CourseClass;
  /** Active students (holding a seat, not yet completed). */
  enrollments: Enrollment[];
}) {
  const complete = useCompleteClass(courseClass.id);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [wasOpen, setWasOpen] = useState(false);
  // Pre-select who meets the criterion each time the dialog opens.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSelected(new Set(enrollments.filter((e) => e.meets_attendance).map((e) => e.person.id)));
    }
  }

  const toggle = (personId: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(personId);
      else next.delete(personId);
      return next;
    });

  const meeting = enrollments.filter((e) => e.meets_attendance);
  const below = enrollments.filter((e) => !e.meets_attendance);

  const submit = () =>
    complete.mutate([...selected], {
      onSuccess: () => {
        toast.success(
          selected.size === 1
            ? "1 aluno concluiu a turma"
            : `${selected.size} alunos concluíram a turma`,
        );
        onOpenChange(false);
      },
      onError: (e) => toast.error(apiErrorMessage(e, "Não foi possível concluir.")),
    });

  const row = (e: Enrollment) => (
    <label
      key={e.id}
      className="flex items-center justify-between gap-3 rounded-md border p-2 text-sm"
      data-testid="complete-row"
    >
      <span className="flex min-w-0 items-center gap-2">
        <Checkbox
          checked={selected.has(e.person.id)}
          onCheckedChange={(v) => toggle(e.person.id, v === true)}
          aria-label={`Concluir ${e.person.name}`}
        />
        <span className="truncate">{e.person.name}</span>
      </span>
      <span
        className={`shrink-0 text-xs tabular-nums ${attendanceTone(e.meets_attendance, e.attendance)}`}
      >
        {attendanceLabel(e.attendance)}
      </span>
    </label>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Concluir turma</DialogTitle>
          <DialogDescription>
            Quem teve pelo menos {courseClass.min_attendance_percent}% de presença já vem marcado.
            Você pode incluir outros alunos, se fizer sentido.
          </DialogDescription>
        </DialogHeader>

        {enrollments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum aluno ativo para concluir.</p>
        ) : (
          <div className="space-y-4">
            {meeting.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Atingiram a frequência ({meeting.length})
                </h4>
                {meeting.map(row)}
              </div>
            )}
            {below.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Abaixo do mínimo ({below.length})
                </h4>
                {below.map(row)}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={selected.size === 0 || complete.isPending} onClick={submit}>
            {complete.isPending
              ? "Concluindo…"
              : `Concluir ${selected.size} ${selected.size === 1 ? "aluno" : "alunos"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
