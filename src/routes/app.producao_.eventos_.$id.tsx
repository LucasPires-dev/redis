import { useState } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { Clapperboard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DetailHeader } from "@/components/detail/DetailHeader";
import { DetailSection, EmptyState } from "@/components/detail/DetailSection";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/api/auth";
import { MINISTRY_LABEL, type MinistryKind } from "@/lib/api/ministries";
import { useEvent, useSetRundownItemStatus, type ItemStatusValue } from "@/lib/api/production";

export const Route = createFileRoute("/app/producao_/eventos_/$id")({
  head: () => ({ meta: [{ title: "Ordem do Culto — Redis" }] }),
  component: EventRundown,
  notFoundComponent: () => (
    <div className="p-10 text-sm text-muted-foreground">Evento não encontrado.</div>
  ),
});

const EVENT_STATUS_LABEL: Record<string, string> = {
  planning: "Planejamento",
  confirmed: "Confirmado",
  in_progress: "Em andamento",
  closed: "Encerrado",
};

const ITEM_STATUS: { value: ItemStatusValue; label: string; dot: string }[] = [
  { value: "ok", label: "Pronto", dot: "bg-emerald-500" },
  { value: "attention", label: "Atenção", dot: "bg-amber-500" },
  { value: "problem", label: "Problema", dot: "bg-red-500" },
];

function statusDot(value: ItemStatusValue) {
  return ITEM_STATUS.find((s) => s.value === value)?.dot ?? "bg-muted-foreground";
}

function myMinistryKinds(
  me: { led_ministries: { kind: MinistryKind }[]; general_led_kinds: MinistryKind[] } | undefined,
) {
  if (!me) return [];
  const kinds = new Set<MinistryKind>([
    ...me.led_ministries.map((m) => m.kind),
    ...me.general_led_kinds,
  ]);
  return Array.from(kinds);
}

function EventRundown() {
  const { id } = Route.useParams();
  const { me } = useAuth();
  const { data: event, isLoading, error } = useEvent(id, { poll: true });
  const setStatus = useSetRundownItemStatus(id);
  const myKinds = myMinistryKinds(me);
  const [reportingKind, setReportingKind] = useState<MinistryKind | "">(myKinds[0] ?? "");

  if (error instanceof ApiError && [404, 403].includes(error.status)) throw notFound();
  if (isLoading || !event) {
    return <div className="p-10 text-sm text-muted-foreground">Carregando…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <DetailHeader
        backTo="/app/producao"
        backLabel="Produção"
        icon={<Clapperboard className="h-6 w-6" />}
        title={event.title}
        subtitle={
          <>
            {new Date(event.starts_at).toLocaleString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
            {event.campus ? ` · ${event.campus.name}` : " · Todos os campi"}
          </>
        }
        actions={<Badge variant="outline">{EVENT_STATUS_LABEL[event.status]}</Badge>}
      />

      {myKinds.length > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Reportando como:</span>
          <Select value={reportingKind} onValueChange={(v) => setReportingKind(v as MinistryKind)}>
            <SelectTrigger className="h-8 w-48">
              <SelectValue placeholder="Selecione o ministério" />
            </SelectTrigger>
            <SelectContent>
              {myKinds.map((k) => (
                <SelectItem key={k} value={k}>
                  {MINISTRY_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <DetailSection title="Ordem do culto" count={event.rundown_items.length}>
        {event.rundown_items.length === 0 ? (
          <EmptyState>Nenhum item na ordem do culto ainda.</EmptyState>
        ) : (
          <div className="space-y-2">
            {event.rundown_items.map((item) => (
              <Card key={item.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{item.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.scheduled_time
                          ? new Date(item.scheduled_time).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                        {" · "}
                        {MINISTRY_LABEL[item.ministry_kind]}
                      </div>
                    </div>
                  </div>

                  {item.statuses.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {item.statuses.map((s) => (
                        <Badge key={s.ministry_kind} variant="outline" className="gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${statusDot(s.status)}`} />
                          {MINISTRY_LABEL[s.ministry_kind]}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {reportingKind && (
                    <div className="flex gap-1.5 pt-1">
                      {ITEM_STATUS.map((s) => (
                        <Button
                          key={s.value}
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          disabled={setStatus.isPending}
                          onClick={() =>
                            setStatus.mutate({
                              itemId: item.id,
                              ministryKind: reportingKind,
                              status: s.value,
                            })
                          }
                        >
                          <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                          {s.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DetailSection>
    </div>
  );
}
