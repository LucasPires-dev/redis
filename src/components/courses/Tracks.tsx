// Growth tracks (trilhas): the member's progress in each one, and their
// upkeep by the church-wide coordination.
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Circle,
  CircleDot,
  Pencil,
  Plus,
  Route as RouteIcon,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { DetailSection, EmptyState } from "@/components/detail/DetailSection";
import { apiErrorMessage } from "@/lib/api/client";
import {
  TRACK_STEP_STATE_LABEL,
  useCourses,
  useDeleteTrack,
  useSaveTrack,
  useTracks,
  type CourseMini,
  type CourseTrack,
  type TrackStepState,
} from "@/lib/api/courses";
import { cn } from "@/lib/utils";

const STEP_ICON: Record<TrackStepState, typeof Circle> = {
  completed: CheckCircle2,
  in_progress: CircleDot,
  not_started: Circle,
};

const STEP_TONE: Record<TrackStepState, string> = {
  completed: "text-emerald-700 dark:text-emerald-400",
  in_progress: "text-sky-700 dark:text-sky-400",
  not_started: "text-muted-foreground",
};

/** "Minhas trilhas": where the person stands in each track of the church. */
export function MyTracks() {
  const { data: tracks } = useTracks();
  if (!tracks?.length) return null;

  return (
    <DetailSection title="Minhas trilhas" count={tracks.length}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {tracks.map((t) => (
          <TrackProgressCard key={t.id} track={t} />
        ))}
      </div>
    </DetailSection>
  );
}

function TrackProgressCard({ track }: { track: CourseTrack }) {
  const p = track.my_progress;
  const percent = p.total ? Math.round((100 * p.completed) / p.total) : 0;
  return (
    <Card data-testid="my-track">
      <CardContent className="space-y-3 p-4">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">{track.name}</h3>
            <span className="text-xs tabular-nums text-muted-foreground">
              {p.completed} de {p.total}
            </span>
          </div>
          {track.description && (
            <p className="text-xs text-muted-foreground">{track.description}</p>
          )}
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progresso na trilha ${track.name}`}
          >
            <div className="h-full rounded-full bg-emerald-600" style={{ width: `${percent}%` }} />
          </div>
        </div>
        <ol className="space-y-1.5">
          {p.steps.map((s) => {
            const Icon = STEP_ICON[s.state];
            return (
              <li
                key={s.id}
                className="flex items-center justify-between gap-2 text-sm"
                data-testid="track-step"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Icon className={cn("h-4 w-4 shrink-0", STEP_TONE[s.state])} />
                  <span className="truncate">
                    {s.order}. {s.course.name}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {s.state === "not_started" && s.open_classes > 0 && (
                    <Link to="/app/cursos" className="text-xs text-primary hover:underline">
                      Inscrições abertas
                    </Link>
                  )}
                  <span className={cn("text-xs", STEP_TONE[s.state])}>
                    {TRACK_STEP_STATE_LABEL[s.state]}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
        {p.completed === p.total && p.total > 0 ? (
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            Trilha concluída!
          </p>
        ) : (
          p.next_course && (
            <p className="text-xs text-muted-foreground">
              Próximo passo: <span className="font-medium">{p.next_course.name}</span>
            </p>
          )
        )}
      </CardContent>
    </Card>
  );
}

/** "Trilhas" in Gestão: everyone who coordinates sees them; the church-wide
 *  coordination creates and edits them. */
export function TracksManagement({ canManage }: { canManage: boolean }) {
  const { data: tracks, isLoading } = useTracks();
  const remove = useDeleteTrack();
  const [editing, setEditing] = useState<CourseTrack | "new" | null>(null);

  return (
    <DetailSection
      title="Trilhas"
      count={tracks?.length}
      action={
        canManage ? (
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" /> Nova trilha
          </Button>
        ) : undefined
      }
    >
      {isLoading ? (
        <EmptyState>Carregando…</EmptyState>
      ) : !tracks?.length ? (
        <EmptyState>
          Nenhuma trilha ainda. Uma trilha organiza os cursos na ordem em que a pessoa deve fazê-los
          — por exemplo, Membresia → Fundamentos → Liderança.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {tracks.map((t) => (
            <Card key={t.id} data-testid="managed-track">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <RouteIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <h3 className="truncate font-semibold">{t.name}</h3>
                  </div>
                  {t.can_manage && (
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        aria-label={`Editar trilha ${t.name}`}
                        onClick={() => setEditing(t)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        aria-label={`Excluir trilha ${t.name}`}
                        disabled={remove.isPending}
                        onClick={() => {
                          if (!window.confirm(`Excluir a trilha ${t.name}? Os cursos continuam.`))
                            return;
                          remove.mutate(t.id, {
                            onSuccess: () => toast.success("Trilha excluída"),
                            onError: (e) =>
                              toast.error(apiErrorMessage(e, "Não foi possível excluir.")),
                          });
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                <div className="flex flex-wrap items-center gap-1 text-sm">
                  {t.steps.map((s, i) => (
                    <span key={s.id} className="flex items-center gap-1">
                      {i > 0 && <span className="text-muted-foreground">→</span>}
                      <Badge variant="secondary">{s.course.name}</Badge>
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {canManage && <TrackFormDialog track={editing} onClose={() => setEditing(null)} />}
    </DetailSection>
  );
}

function TrackFormDialog({
  track,
  onClose,
}: {
  track: CourseTrack | "new" | null;
  onClose: () => void;
}) {
  const { data: courses } = useCourses();
  const save = useSaveTrack();
  const existing = track && track !== "new" ? track : null;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<CourseMini[]>([]);
  const [openedFor, setOpenedFor] = useState<typeof track>(null);
  // Reset the form each time the dialog opens for another track (or a new one).
  if (track !== openedFor) {
    setOpenedFor(track);
    if (track) {
      setName(existing?.name ?? "");
      setDescription(existing?.description ?? "");
      setSteps(existing?.steps.map((s) => s.course) ?? []);
    }
  }

  const chosen = new Set(steps.map((s) => s.id));
  const available = (courses ?? []).filter((c) => !chosen.has(c.id));
  const move = (index: number, delta: number) =>
    setSteps((prev) => {
      const next = prev.slice();
      const [item] = next.splice(index, 1);
      next.splice(index + delta, 0, item);
      return next;
    });

  const submit = () =>
    save.mutate(
      {
        id: existing?.id,
        name: name.trim(),
        description: description.trim(),
        course_ids: steps.map((s) => s.id),
      },
      {
        onSuccess: () => {
          toast.success(existing ? "Trilha atualizada" : "Trilha criada");
          onClose();
        },
        onError: (e) => toast.error(apiErrorMessage(e, "Não foi possível salvar a trilha.")),
      },
    );

  return (
    <Dialog open={track !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? "Editar trilha" : "Nova trilha"}</DialogTitle>
          <DialogDescription>
            Os cursos na ordem em que a pessoa deve fazê-los. Todos os membros veem o próprio
            progresso.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="track-name">Nome</Label>
            <Input
              id="track-name"
              value={name}
              placeholder="Ex: Trilha de crescimento"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="track-description">Descrição</Label>
            <Textarea
              id="track-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Cursos, em ordem</Label>
            {steps.length === 0 ? (
              <p className="text-sm text-muted-foreground">Adicione pelo menos um curso.</p>
            ) : (
              <ol className="space-y-1.5">
                {steps.map((s, i) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-sm"
                    data-testid="track-form-step"
                  >
                    <span className="truncate">
                      {i + 1}. {s.name}
                    </span>
                    <span className="flex shrink-0 gap-0.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        aria-label={`Subir ${s.name}`}
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        aria-label={`Descer ${s.name}`}
                        disabled={i === steps.length - 1}
                        onClick={() => move(i, 1)}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        aria-label={`Tirar ${s.name}`}
                        onClick={() => setSteps((prev) => prev.filter((x) => x.id !== s.id))}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </span>
                  </li>
                ))}
              </ol>
            )}
            {available.length > 0 && (
              <Select
                value=""
                onValueChange={(id) => {
                  const course = available.find((c) => c.id === id);
                  if (course) setSteps((prev) => [...prev, { id: course.id, name: course.name }]);
                }}
              >
                <SelectTrigger aria-label="Adicionar curso">
                  <SelectValue placeholder="Adicionar curso…" />
                </SelectTrigger>
                <SelectContent>
                  {available.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!name.trim() || steps.length === 0 || save.isPending} onClick={submit}>
            {save.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
