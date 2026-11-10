import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateLesson } from "@/lib/api/courses";
import { apiErrorMessage } from "@/lib/api/client";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  nextOrder: number;
}

export function LessonFormDialog({ open, onOpenChange, classId, nextOrder }: Props) {
  const createLesson = useCreateLesson();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDate("");
    setNotes("");
  }, [open]);

  const submit = () => {
    createLesson.mutate(
      {
        course_class_id: classId,
        order: nextOrder,
        title: title.trim(),
        date: date || undefined,
        notes: notes.trim(),
      },
      {
        onSuccess: () => {
          toast.success("Aula criada");
          onOpenChange(false);
        },
        onError: (e) =>
          toast.error(apiErrorMessage(e, "Não foi possível criar a aula.")),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova aula — #{nextOrder}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="lesson-title">Título (opcional)</Label>
            <Input
              id="lesson-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Aula ${nextOrder}`}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lesson-date">Data (opcional)</Label>
            <Input
              id="lesson-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lesson-notes">Observações</Label>
            <Textarea
              id="lesson-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Conteúdo, materiais, avisos…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={createLesson.isPending}>
            {createLesson.isPending ? "Salvando…" : "Criar aula"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
