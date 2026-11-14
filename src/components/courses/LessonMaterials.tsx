// Links handed out with a lesson: teachers and coordination add them on the
// class page; students open them from their enrollment.
import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Link2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiErrorMessage } from "@/lib/api/client";
import {
  useAddMaterial,
  useRemoveMaterial,
  type Lesson,
  type LessonMaterialLink,
} from "@/lib/api/courses";

/** A list of material links (read only). */
export function MaterialLinks({ materials }: { materials: LessonMaterialLink[] }) {
  if (!materials.length) return null;
  return (
    <ul className="space-y-1">
      {materials.map((m) => (
        <li key={m.id}>
          <a
            href={m.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            data-testid="material-link"
          >
            <Link2 className="h-3.5 w-3.5 shrink-0" />
            {m.title}
            <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
          </a>
        </li>
      ))}
    </ul>
  );
}

/** The selected lesson's materials on the class page, with add/remove. */
export function LessonMaterials({
  lesson,
  classId,
  canManage,
}: {
  lesson: Lesson;
  classId: string;
  canManage: boolean;
}) {
  const add = useAddMaterial(classId);
  const remove = useRemoveMaterial(classId);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  const submit = () =>
    add.mutate(
      { lessonId: lesson.id, title: title.trim(), url: url.trim() },
      {
        onSuccess: () => {
          setTitle("");
          setUrl("");
          toast.success("Material adicionado");
        },
        onError: (e) =>
          toast.error(apiErrorMessage(e, "Não foi possível adicionar. Confira o link.")),
      },
    );

  return (
    <Card data-testid="lesson-materials">
      <CardContent className="space-y-3 p-4">
        <h3 className="text-sm font-semibold">
          Materiais da aula {lesson.order}
          {lesson.title ? ` — ${lesson.title}` : ""}
        </h3>
        {lesson.materials.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum material. Os alunos veem aqui os links que você adicionar (slides, apostila,
            vídeo).
          </p>
        ) : (
          <ul className="space-y-1.5">
            {lesson.materials.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2">
                <MaterialLinks materials={[m]} />
                {canManage && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0"
                    aria-label={`Remover ${m.title}`}
                    disabled={remove.isPending}
                    onClick={() =>
                      remove.mutate(
                        { lessonId: lesson.id, materialId: m.id },
                        {
                          onError: (e) =>
                            toast.error(apiErrorMessage(e, "Não foi possível remover.")),
                        },
                      )
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {canManage && (
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <Input
              aria-label="Nome do material"
              placeholder="Nome (ex: Slides)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="sm:max-w-[12rem]"
            />
            <Input
              aria-label="Link do material"
              placeholder="https://…"
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button
              type="submit"
              size="sm"
              variant="outline"
              className="shrink-0 gap-1"
              disabled={!title.trim() || !url.trim() || add.isPending}
            >
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
