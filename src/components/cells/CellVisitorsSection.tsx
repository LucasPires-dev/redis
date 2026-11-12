import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { HeartHandshake, Phone, Plus, UserCheck } from "lucide-react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { DetailSection, EmptyState } from "@/components/detail/DetailSection";
import { PersonSearch } from "@/components/cells/PersonSearch";
import { apiErrorMessage } from "@/lib/api/client";
import {
  useCellVisitors,
  useCreateCellVisitor,
  useForwardCellVisitor,
  useMakeVisitorMember,
  VISITOR_STATUS_LABEL,
  type Cell,
  type CellVisitor,
  type VisitorStatus,
} from "@/lib/api/cells";
import { formatDate } from "@/lib/api/seasons";

const STATUS_CLASS: Record<VisitorStatus, string> = {
  visiting: "border-primary/40 bg-primary/10 text-primary",
  member: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  forwarded: "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-400",
};

// Still visiting first, then the ones in Reconciliação, then who joined.
const STATUS_ORDER: Record<VisitorStatus, number> = { visiting: 0, forwarded: 1, member: 2 };

/**
 * The cell's guests by name: who came, how often, and what happened next —
 * joined the cell or handed to Reconciliação for follow-up (consolidação).
 * Only for whoever manages the cell (the list carries contact data).
 */
export function CellVisitorsSection({ cell }: { cell: Cell }) {
  const { data: visitors, isLoading } = useCellVisitors(cell.id);
  const forward = useForwardCellVisitor(cell.id);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState<CellVisitor | null>(null);

  const sorted = (visitors ?? [])
    .slice()
    .sort(
      (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name),
    );

  const sendToReconciliation = (v: CellVisitor) => {
    if (
      !window.confirm(
        `Encaminhar ${v.name} à Reconciliação? Ele(a) entra na fila de triagem do campus para receber acompanhamento.`,
      )
    )
      return;
    forward.mutate(v.id, {
      onSuccess: () => toast.success(`${v.name} encaminhado(a) à Reconciliação`),
      onError: (e) => toast.error(apiErrorMessage(e, "Não foi possível encaminhar.")),
    });
  };

  return (
    <DetailSection
      title="Visitantes"
      count={visitors?.length ?? 0}
      action={
        <Button size="sm" variant="outline" className="gap-1" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Novo visitante
        </Button>
      }
    >
      {isLoading ? (
        <EmptyState>Carregando…</EmptyState>
      ) : sorted.length === 0 ? (
        <EmptyState>
          Nenhum visitante cadastrado. Cadastre quem visitar a célula para acompanhar quem volta.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {sorted.map((v) => (
            <Card key={v.id} data-testid="cell-visitor">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{v.name}</div>
                    {v.phone && (
                      <a
                        href={`tel:${v.phone}`}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                      >
                        <Phone className="h-3 w-3" /> {v.phone}
                      </a>
                    )}
                  </div>
                  <Badge variant="outline" className={STATUS_CLASS[v.status]}>
                    {VISITOR_STATUS_LABEL[v.status]}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {v.visit_count === 0
                    ? "Ainda sem presença registrada"
                    : `${v.visit_count} ${v.visit_count === 1 ? "visita" : "visitas"} · primeira em ${formatDate(v.first_visit!)}` +
                      (v.visit_count > 1 ? ` · última em ${formatDate(v.last_visit!)}` : "")}
                </p>
                {v.status === "member" && v.person ? (
                  <Link
                    to="/app/pessoas/$id"
                    params={{ id: v.person.id }}
                    className="text-xs text-primary hover:underline"
                  >
                    Ver cadastro de {v.person.name}
                  </Link>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => setJoining(v)}
                    >
                      <UserCheck className="h-4 w-4" /> Tornar membro
                    </Button>
                    {!v.forwarded && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1"
                        disabled={forward.isPending}
                        onClick={() => sendToReconciliation(v)}
                      >
                        <HeartHandshake className="h-4 w-4" /> Encaminhar à Reconciliação
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <NewVisitorDialog cell={cell} open={creating} onOpenChange={setCreating} />
      <MakeMemberDialog cell={cell} visitor={joining} onClose={() => setJoining(null)} />
    </DetailSection>
  );
}

function NewVisitorDialog({
  cell,
  open,
  onOpenChange,
}: {
  cell: Cell;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateCellVisitor(cell.id);
  const empty = { name: "", phone: "", email: "", notes: "" };
  const [form, setForm] = useState(empty);

  const close = () => {
    setForm(empty);
    onOpenChange(false);
  };

  const submit = () => {
    if (!form.name.trim()) return;
    create.mutate(
      {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        notes: form.notes,
      },
      {
        onSuccess: (v) => {
          toast.success(`${v.name} cadastrado(a) como visitante`);
          close();
        },
        onError: (e) => toast.error(apiErrorMessage(e, "Não foi possível cadastrar.")),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo visitante</DialogTitle>
          <DialogDescription>
            Na hora de registrar o encontro, é só marcar a presença dele(a).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="visitor-name">Nome</Label>
            <Input
              id="visitor-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="visitor-phone">Telefone</Label>
              <Input
                id="visitor-phone"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="visitor-email">E-mail (opcional)</Label>
              <Input
                id="visitor-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="visitor-notes">Observações (opcional)</Label>
            <Textarea
              id="visitor-notes"
              rows={2}
              placeholder="Quem convidou, pedido de oração…"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!form.name.trim() || create.isPending}>
            {create.isPending ? "Salvando…" : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MakeMemberDialog({
  cell,
  visitor,
  onClose,
}: {
  cell: Cell;
  visitor: CellVisitor | null;
  onClose: () => void;
}) {
  const makeMember = useMakeVisitorMember(cell.id);
  const [email, setEmail] = useState("");

  const done = (name: string) => {
    toast.success(`${name} agora é membro da célula`);
    setEmail("");
    onClose();
  };
  const failed = (e: unknown) =>
    toast.error(apiErrorMessage(e, "Não foi possível tornar o visitante membro."));

  return (
    <Dialog
      open={visitor !== null}
      onOpenChange={(o) => {
        if (!o) {
          setEmail("");
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tornar {visitor?.name} membro</DialogTitle>
          <DialogDescription>
            Se a pessoa já tem cadastro na igreja, escolha-a na busca. Se não, cadastre-a com o
            e-mail dela; nome e telefone vêm do visitante.
          </DialogDescription>
        </DialogHeader>
        {visitor && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Já tem cadastro</Label>
              <PersonSearch
                endpoint={`/api/cells/${cell.id}/people-search/`}
                placeholder="Buscar por nome ou e-mail"
                disabled={makeMember.isPending}
                onSelect={(p) =>
                  makeMember.mutate(
                    { id: visitor.id, person_id: p.id },
                    { onSuccess: () => done(p.name), onError: failed },
                  )
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member-email">Cadastrar com o e-mail</Label>
              <div className="flex gap-2">
                <Input
                  id="member-email"
                  type="email"
                  placeholder="email@exemplo.com"
                  defaultValue={visitor.email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button
                  disabled={makeMember.isPending || !(email || visitor.email).trim()}
                  onClick={() =>
                    makeMember.mutate(
                      { id: visitor.id, email: (email || visitor.email).trim() },
                      { onSuccess: () => done(visitor.name), onError: failed },
                    )
                  }
                >
                  Cadastrar
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
