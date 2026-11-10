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
import { useCreateCourse } from "@/lib/api/courses";
import { useCampuses } from "@/lib/api/ministries";
import { apiErrorMessage } from "@/lib/api/client";

const NONE = "none";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CourseFormDialog({ open, onOpenChange }: Props) {
  const { data: me } = useMe();
  const { data: campuses } = useCampuses();
  const createCourse = useCreateCourse();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [campusId, setCampusId] = useState<string>(NONE);

  useEffect(() => {
    if (!open) return;
    setName("");
    setDescription("");
    setCampusId(me?.campus?.id ?? NONE);
  }, [open, me?.campus?.id]);

  const valid = name.trim().length > 0;

  const submit = () => {
    createCourse.mutate(
      {
        name: name.trim(),
        description: description.trim(),
        campus_id: campusId === NONE ? null : campusId,
      },
      {
        onSuccess: () => {
          toast.success("Curso criado");
          onOpenChange(false);
        },
        onError: (e) =>
          toast.error(apiErrorMessage(e, "Não foi possível criar o curso.")),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo curso</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="course-name">Nome</Label>
            <Input
              id="course-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Escola de Líderes"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Campus</Label>
            <Select value={campusId} onValueChange={setCampusId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Geral (toda a igreja)</SelectItem>
                {(campuses ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Selecione &quot;Geral&quot; para um curso aberto a todos os campi.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="course-desc">Descrição</Label>
            <Textarea
              id="course-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Objetivo e público-alvo do curso"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!valid || createCourse.isPending}>
            {createCourse.isPending ? "Salvando…" : "Criar curso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
