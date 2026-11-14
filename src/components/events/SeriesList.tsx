// "Eventos recorrentes" in the Produção tab: the series the person organizes,
// their next dates, pause/resume and end.
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiErrorMessage } from "@/lib/api/client";
import {
  WEEKDAY_LABEL,
  useEndSeries,
  useEventSeries,
  useUpdateSeries,
  type EventSeries,
} from "@/lib/api/production";

function rhythm(s: EventSeries) {
  // "Toda quarta às 20:00", "Todo domingo às 19:00", "A cada 2 semanas, sábado às 10:00"
  const day = WEEKDAY_LABEL[s.weekday].toLowerCase();
  const at = s.start_time.slice(0, 5);
  if (s.every_weeks > 1) return `A cada ${s.every_weeks} semanas, ${day} às ${at}`;
  return `${s.weekday >= 5 ? "Todo" : "Toda"} ${day} às ${at}`;
}

const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

export function SeriesList() {
  const { data: series } = useEventSeries();
  const update = useUpdateSeries();
  const end = useEndSeries();
  const [ending, setEnding] = useState<EventSeries | null>(null);

  if (!series?.length) return null;

  return (
    <section data-testid="series-list">
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Eventos recorrentes
      </h2>
      <div className="space-y-2">
        {series.map((s) => (
          <div key={s.id} className="space-y-2 rounded-lg border bg-card p-4" data-testid="series">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <Repeat className="h-4 w-4 shrink-0 text-muted-foreground" /> {s.title}
                  {!s.is_active && <Badge variant="outline">Pausado</Badge>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {rhythm(s)}
                  {s.campus ? ` · ${s.campus.name}` : ""}
                  {s.ends_on ? ` · até ${shortDate(s.ends_on)}` : ""}
                </p>
              </div>
              <Switch
                checked={s.is_active}
                aria-label={s.is_active ? "Pausar" : "Retomar"}
                disabled={update.isPending}
                onCheckedChange={(on) =>
                  update.mutate(
                    { id: s.id, is_active: on },
                    {
                      onSuccess: () =>
                        toast.success(on ? "Repetição retomada." : "Repetição pausada."),
                      onError: (e) => toast.error(apiErrorMessage(e, "Não foi possível.")),
                    },
                  )
                }
              />
            </div>
            {s.next_dates.length > 0 && (
              <p className="flex flex-wrap gap-1.5 text-xs">
                <span className="text-muted-foreground">Próximas:</span>
                {s.next_dates.map((d) => (
                  <Badge key={d} variant="secondary" className="font-normal">
                    {shortDate(d)}
                  </Badge>
                ))}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {s.upcoming} data(s) já na agenda
                {s.template && (
                  <>
                    {" · modelo: "}
                    <Link
                      to="/app/eventos/$id/producao"
                      params={{ id: s.template.id }}
                      className="text-primary hover:underline"
                    >
                      {s.template.title}
                    </Link>
                  </>
                )}
              </span>
              <Button size="sm" variant="ghost" onClick={() => setEnding(s)}>
                Encerrar
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!ending} onOpenChange={(o) => !o && setEnding(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Encerrar “{ending?.title}”?</DialogTitle>
            <DialogDescription>
              Não serão criadas novas datas. As próximas datas já criadas também são apagadas, menos
              as que já têm inscrições. Os eventos que já passaram continuam no histórico.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnding(null)}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              disabled={end.isPending}
              onClick={() =>
                ending &&
                end.mutate(ending.id, {
                  onSuccess: () => {
                    toast.success("Repetição encerrada.");
                    setEnding(null);
                  },
                  onError: (e) => toast.error(apiErrorMessage(e, "Não foi possível encerrar.")),
                })
              }
            >
              Encerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
