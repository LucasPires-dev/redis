import { useState } from "react";
import { Copy, Link2Off, RefreshCw, Share2, Ticket } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DetailSection, EmptyState } from "@/components/detail/DetailSection";
import { InviteQr } from "@/components/membership/InviteQr";
import { apiErrorMessage } from "@/lib/api/client";
import {
  inviteLink,
  useCampusInvite,
  useCampusInviteChange,
  useDecideJoinRequest,
  useJoinRequests,
} from "@/lib/api/membership";

/** Campus leadership: answer join requests and manage the campus invite. */
export function CampusMembersSection({
  campusId,
  campusName,
}: {
  campusId: string;
  campusName: string;
}) {
  return (
    <div className="space-y-6">
      <JoinRequestsList campusId={campusId} />
      <CampusInvite campusId={campusId} campusName={campusName} />
    </div>
  );
}

function JoinRequestsList({ campusId }: { campusId: string }) {
  const { data, isLoading } = useJoinRequests({ status: "pending", campus: campusId });
  const decide = useDecideJoinRequest();
  const requests = data ?? [];

  const answer = (id: string, name: string, decision: "approve" | "reject") =>
    decide.mutate(
      { id, decision },
      {
        onSuccess: () =>
          toast.success(decision === "approve" ? `${name} agora é do campus` : "Pedido recusado"),
        onError: (err) => toast.error(apiErrorMessage(err, "Não foi possível responder.")),
      },
    );

  return (
    <div id="pedidos" className="scroll-mt-20">
      <DetailSection title="Pedidos de vínculo" count={requests.length}>
        {isLoading && <Skeleton className="h-28 w-full" />}
        {!isLoading && requests.length === 0 && (
          <EmptyState>Nenhum pedido aguardando resposta.</EmptyState>
        )}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {requests.map((r) => (
            <Card key={r.id}>
              <CardContent className="space-y-3 p-4">
                <div className="min-w-0">
                  <div className="truncate font-medium">{r.person.name}</div>
                  <div className="truncate text-sm text-muted-foreground">{r.person.email}</div>
                  <div className="text-xs text-muted-foreground">
                    Pediu{" "}
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: ptBR })}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="h-11"
                    disabled={decide.isPending}
                    onClick={() => answer(r.id, r.person.name, "reject")}
                  >
                    Recusar
                  </Button>
                  <Button
                    className="h-11"
                    disabled={decide.isPending}
                    onClick={() => answer(r.id, r.person.name, "approve")}
                  >
                    Aprovar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DetailSection>
    </div>
  );
}

function CampusInvite({ campusId, campusName }: { campusId: string; campusName: string }) {
  const { data, isLoading } = useCampusInvite(campusId, true);
  const change = useCampusInviteChange(campusId);
  const [confirm, setConfirm] = useState<"rotate" | "disable" | null>(null);
  const code = data?.code ?? null;

  const run = (kind: "rotate" | "disable") =>
    change.mutate(kind, {
      onSuccess: () =>
        toast.success(
          kind === "disable"
            ? "Convite desativado"
            : code
              ? "Novo código gerado"
              : "Convite criado",
        ),
      onError: (err) => toast.error(apiErrorMessage(err, "Não foi possível alterar o convite.")),
    });

  async function copyLink() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(inviteLink(code));
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar. Copie o código manualmente.");
    }
  }

  async function share() {
    if (!code) return;
    const text = `Entre no campus ${campusName} pelo app da igreja`;
    if (navigator.share) {
      try {
        await navigator.share({ title: campusName, text, url: inviteLink(code) });
      } catch {
        // The person closed the share sheet.
      }
    } else {
      await copyLink();
    }
  }

  return (
    <DetailSection title="Convite do campus">
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-5">
          {isLoading && <Skeleton className="h-24 w-full" />}

          {!isLoading && !code && (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <Ticket className="h-5 w-5" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Crie um link de convite para mandar no grupo ou mostrar no culto. Quem entrar por
                  ele já fica no campus como membro, sem precisar de aprovação.
                </p>
              </div>
              <Button
                className="h-11 w-full sm:w-auto"
                disabled={change.isPending}
                onClick={() => run("rotate")}
              >
                Criar convite
              </Button>
            </div>
          )}

          {!isLoading && code && (
            <>
              <div className="rounded-lg bg-muted/60 p-4 text-center">
                <InviteQr url={inviteLink(code)} code={code} campusName={campusName} />
                <div className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">
                  Código
                </div>
                <div className="mt-1 select-all font-mono text-3xl font-semibold tracking-[0.25em]">
                  {code}
                </div>
                <div className="mt-2 truncate text-xs text-muted-foreground">
                  {inviteLink(code)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button className="h-11" onClick={share}>
                  <Share2 className="mr-1.5 h-4 w-4" /> Compartilhar
                </Button>
                <Button variant="outline" className="h-11" onClick={copyLink}>
                  <Copy className="mr-1.5 h-4 w-4" /> Copiar link
                </Button>
                <Button
                  variant="ghost"
                  className="h-11"
                  disabled={change.isPending}
                  onClick={() => setConfirm("rotate")}
                >
                  <RefreshCw className="mr-1.5 h-4 w-4" /> Novo código
                </Button>
                <Button
                  variant="ghost"
                  className="h-11 text-destructive hover:text-destructive"
                  disabled={change.isPending}
                  onClick={() => setConfirm("disable")}
                >
                  <Link2Off className="mr-1.5 h-4 w-4" /> Desativar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Qualquer pessoa com este link entra no campus. Se ele vazar para fora da igreja,
                gere um novo código.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] rounded-lg sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "disable" ? "Desativar o convite?" : "Gerar um novo código?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "disable"
                ? "O link atual para de funcionar e ninguém entra por convite até você criar outro."
                : "O link atual para de funcionar. Quem já entrou continua no campus."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Voltar</AlertDialogCancel>
            <AlertDialogAction className="h-11" onClick={() => confirm && run(confirm)}>
              {confirm === "disable" ? "Desativar" : "Gerar novo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DetailSection>
  );
}
