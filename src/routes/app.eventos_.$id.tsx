import { toast } from "sonner";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Calendar, Building2, Clapperboard, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DetailHeader } from "@/components/detail/DetailHeader";
import { StatCard } from "@/components/detail/StatCard";
import { DetailSection, EmptyState } from "@/components/detail/DetailSection";
import { ApiError, apiErrorMessage } from "@/lib/api/client";
import { useAuth, isEventProducer } from "@/lib/api/auth";
import { useEvent, EVENT_TYPE_LABEL } from "@/lib/api/production";
import { MINISTRY_LABEL } from "@/lib/api/ministries";
import {
  useMyRegistration,
  canSelfCancel,
  formatTicketPrice,
  useRegisterForEvent,
  useCancelRegistration,
  useRegistrationStats,
  useTicketConfig,
  PAYMENT_STATUS_LABEL,
} from "@/lib/api/payments";
import { RouteError } from "@/components/RouteError";
import { DetailSkeleton } from "@/components/skeletons";

export const Route = createFileRoute("/app/eventos_/$id")({
  head: () => ({ meta: [{ title: "Evento — Redis" }] }),
  component: EventDetail,
  errorComponent: RouteError,
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

function EventDetail() {
  const { id } = Route.useParams();
  const { me } = useAuth();
  const { data: event, isLoading, error } = useEvent(id);

  if (error instanceof ApiError && [404, 403].includes(error.status)) throw notFound();
  if (isLoading || !event) {
    return <DetailSkeleton />;
  }

  const dateStr = new Date(event.starts_at).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const timeStr = new Date(event.starts_at).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const canManage = !!me && (me.is_manager || isEventProducer(me));

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <DetailHeader
        backTo="/app/eventos"
        backLabel="Eventos"
        icon={<Clapperboard className="h-6 w-6" />}
        title={event.title}
        subtitle={
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> {dateStr} · {timeStr}
          </span>
        }
        actions={
          <div className="flex gap-2">
            <Badge variant="outline">{EVENT_TYPE_LABEL[event.event_type]}</Badge>
            <Badge variant="secondary">{EVENT_STATUS_LABEL[event.status] ?? event.status}</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={<Calendar className="h-4 w-4" />}
          label="Data"
          value={new Date(event.starts_at).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
          })}
        />
        <StatCard
          icon={<Clapperboard className="h-4 w-4" />}
          label="Tipo"
          value={EVENT_TYPE_LABEL[event.event_type]}
        />
        <StatCard
          icon={<Building2 className="h-4 w-4" />}
          label="Campus"
          value={event.campus?.name ?? "Todos"}
        />
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Ministério"
          value={event.ministry_kind ? MINISTRY_LABEL[event.ministry_kind] : "—"}
        />
      </div>

      {event.description && (
        <DetailSection title="Descrição">
          <Card>
            <CardContent className="p-5 text-sm whitespace-pre-wrap">
              {event.description}
            </CardContent>
          </Card>
        </DetailSection>
      )}

      {event.producer && (
        <DetailSection title="Produtor">
          <Card>
            <CardContent className="p-5 text-sm">{event.producer.name}</CardContent>
          </Card>
        </DetailSection>
      )}

      {canManage && (
        <DetailSection title="Produção">
          <Card>
            <CardContent className="p-5">
              <Link
                to="/app/producao/eventos/$id"
                params={{ id: event.id }}
                className="text-sm text-primary hover:underline"
              >
                Abrir painel completo de produção (ordem do culto, escala, delegações)
              </Link>
            </CardContent>
          </Card>
        </DetailSection>
      )}

      <RegistrationSection eventId={event.id} />
    </div>
  );
}

function RegistrationSection({ eventId }: { eventId: string }) {
  const { data: config, isLoading } = useTicketConfig(eventId);
  const { data: stats } = useRegistrationStats(eventId);
  const { data: myReg } = useMyRegistration(eventId);
  const register = useRegisterForEvent();
  const cancel = useCancelRegistration();

  if (isLoading || !config) return null;

  const priceFmt = formatTicketPrice(config.price_cents);

  return (
    <DetailSection title="Inscrição">
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">{priceFmt}</div>
            {stats && (
              <div className="text-xs text-muted-foreground">
                {stats.confirmed} confirmado{stats.confirmed !== 1 ? "s" : ""}
                {stats.capacity != null && ` de ${stats.capacity} vagas`}
              </div>
            )}
          </div>

          {stats?.capacity != null && (
            <div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(100, (stats.total / stats.capacity) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {!myReg && (
            <Button
              className="w-full"
              disabled={register.isPending}
              onClick={() =>
                register.mutate(eventId, {
                  onSuccess: (reg) => {
                    toast.success(
                      reg.payment_url
                        ? "Inscrição feita! Conclua o pagamento."
                        : "Inscrição confirmada!",
                    );
                  },
                  onError: (e) =>
                    toast.error(apiErrorMessage(e, "Não foi possível fazer a inscrição.")),
                })
              }
            >
              Inscrever-se
            </Button>
          )}

          {myReg && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Sua inscrição</p>
                <Badge variant="outline">{PAYMENT_STATUS_LABEL[myReg.payment_status]}</Badge>
              </div>
              <div className="flex gap-2">
                {myReg.payment_url && myReg.payment_status === "pending" && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={myReg.payment_url} target="_blank" rel="noreferrer">
                      Pagar
                    </a>
                  </Button>
                )}
                {canSelfCancel(myReg) && (
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={cancel.isPending}
                    onClick={() =>
                      cancel.mutate(myReg.id, {
                        onSuccess: () => toast.success("Inscrição cancelada."),
                        onError: (e) =>
                          toast.error(apiErrorMessage(e, "Não foi possível cancelar a inscrição.")),
                      })
                    }
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </DetailSection>
  );
}
