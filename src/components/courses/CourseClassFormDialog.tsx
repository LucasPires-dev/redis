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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMe } from "@/lib/api/auth";
import { useCreateCourseClass, WEEKDAY_LABEL } from "@/lib/api/courses";
import { useCampuses } from "@/lib/api/ministries";
import { apiErrorMessage } from "@/lib/api/client";

const NONE = "none";
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
}

export function CourseClassFormDialog({ open, onOpenChange, courseId }: Props) {
  const { data: me } = useMe();
  const { data: campuses } = useCampuses();
  const createClass = useCreateCourseClass();

  const [name, setName] = useState("");
  const [campusId, setCampusId] = useState("");
  const [weekday, setWeekday] = useState<string>(NONE);
  const [startTime, setStartTime] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    setName("");
    setCampusId(me?.campus?.id ?? "");
    setWeekday(NONE);
    setStartTime("");
    setStartDate("");
    setEndDate("");
    setDescription("");
  }, [open, me?.campus?.id]);

  const valid = name.trim().length > 0 && campusId.length > 0;

  const submit = () => {
    createClass.mutate(
      {
        course_id: courseId,
        campus_id: campusId,
        name: name.trim(),
        weekday: weekday === NONE ? undefined : Number(weekday),
        start_time: startTime || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        description: description.trim(),
      },
      {
        onSuccess: () => {
          toast.success("Turma criada");
          onOpenChange(false);
        },
        onError: (e) =>
          toast.error(apiErrorMessage(e, "Não foi possível criar a turma.")),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova turma</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="class-name">Nome</Label>
            <Input
              id="class-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Turma A — Noturno"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Campus</Label>
            <Select value={campusId} onValueChange={setCampusId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {(campuses ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Dia da semana</Label>
              <Select value={weekday} onValueChange={setWeekday}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Não definido</SelectItem>
                  {WEEKDAYS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {WEEKDAY_LABEL[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="class-time">Horário</Label>
              <Input
                id="class-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Período (opcional)</Label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="date"
                aria-label="Início"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                type="date"
                aria-label="Fim"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="class-desc">Descrição</Label>
            <Textarea
              id="class-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!valid || createClass.isPending}>
            {createClass.isPending ? "Salvando…" : "Criar turma"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
