// The class's waitlist, for its teachers and coordination (Alunos tab).
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DetailSection } from "@/components/detail/DetailSection";
import { apiErrorMessage } from "@/lib/api/client";
import { formatDateTime } from "@/lib/utils";
import { useRemoveWaitlistEntry, useWaitlistEntries, type CourseClass } from "@/lib/api/courses";

export function ClassWaitlistSection({ courseClass: cc }: { courseClass: CourseClass }) {
  const show = cc.can_manage && cc.waitlist_count > 0;
  const { data: entries } = useWaitlistEntries(cc.id, show);
  const remove = useRemoveWaitlistEntry(cc.id);
  if (!show || !entries?.length) return null;

  return (
    <DetailSection title="Lista de espera" count={entries.length}>
      <div className="space-y-2" data-testid="class-waitlist">
        {entries.map((e) => (
          <Card key={e.id} data-testid="waitlist-entry">
            <CardContent className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">
                  {e.position ? `${e.position}º · ` : ""}
                  {e.person.name}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  Na fila desde {formatDateTime(e.created_at)}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {e.offer_expires_at ? (
                  <Badge className="text-[10px]">
                    Vaga reservada até {formatDateTime(e.offer_expires_at)}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">
                    Aguardando
                  </Badge>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  aria-label={`Tirar ${e.person.name} da lista`}
                  disabled={remove.isPending}
                  onClick={() => {
                    if (!window.confirm(`Tirar ${e.person.name} da lista de espera?`)) return;
                    remove.mutate(e.id, {
                      onError: (err) => toast.error(apiErrorMessage(err, "Não foi possível.")),
                    });
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        <p className="text-xs text-muted-foreground">
          Quando uma vaga abre, ela fica reservada para o primeiro da fila pelo prazo de reserva da
          turma ({cc.reservation_days} {cc.reservation_days === 1 ? "dia" : "dias"}). Para atender
          mais gente, aumente o limite de vagas em “Editar turma”.
        </p>
      </div>
    </DetailSection>
  );
}
