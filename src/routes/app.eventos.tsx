import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Calendar, Globe, Building2, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDB, actions, visibleEvents, type EventScope, MINISTRY_LABEL } from "@/lib/mock-store";
import { toast } from "sonner";

export const Route = createFileRoute("/app/eventos")({
  head: () => ({ meta: [{ title: "Eventos — Redis" }] }),
  component: EventsPage,
});

const scopeIcon = { geral: Globe, campus: Building2, ministerio: HeartHandshake } as const;

function EventsPage() {
  const db = useDB((d) => d);
  const events = visibleEvents(db).slice().sort((a, b) => a.date.localeCompare(b.date));
  const role = db.currentRole;

  // Escopos permitidos por papel
  const allowedScopes: EventScope[] =
    role === "gestor"
      ? ["geral", "campus", "ministerio"]
      : role === "lider_campus"
        ? ["campus"]
        : role === "lider_ministerio_campus"
          ? ["ministerio"]
          : [];

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{
    title: string;
    date: string;
    scope: EventScope;
    campusId?: string;
    ministryId?: string;
  }>({
    title: "",
    date: new Date().toISOString().slice(0, 10),
    scope: allowedScopes[0] ?? "geral",
    campusId: db.currentCampusId,
  });

  const campusMins = db.ministries.filter((m) => m.campusId === (form.campusId ?? db.currentCampusId));

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Eventos</h1>
          <p className="text-sm text-muted-foreground">
            Cascata: geral → campus → ministerial. Sua visão respeita seu papel.
          </p>
        </div>
        {allowedScopes.length > 0 && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" /> Novo evento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar evento</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Título</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Data</Label>
                    <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Escopo</Label>
                    <Select
                      value={form.scope}
                      onValueChange={(v) => setForm({ ...form, scope: v as EventScope })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {allowedScopes.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {(form.scope === "campus" || form.scope === "ministerio") && (
                  <div className="space-y-1.5">
                    <Label>Campus</Label>
                    <Select
                      value={form.campusId}
                      onValueChange={(v) => setForm({ ...form, campusId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {db.campuses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {form.scope === "ministerio" && (
                  <div className="space-y-1.5">
                    <Label>Ministério</Label>
                    <Select
                      value={form.ministryId}
                      onValueChange={(v) => setForm({ ...form, ministryId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Escolher" />
                      </SelectTrigger>
                      <SelectContent>
                        {campusMins.map((m) => (
                          <SelectItem key={m.id} value={m.id} className="capitalize">
                            {MINISTRY_LABEL[m.kind]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    if (!form.title) return;
                    if (form.scope === "ministerio" && !form.ministryId) {
                      toast.error("Selecione o ministério");
                      return;
                    }
                    actions.addEvent({
                      title: form.title,
                      date: form.date,
                      scope: form.scope,
                      campusId: form.scope !== "geral" ? form.campusId : undefined,
                      ministryId: form.scope === "ministerio" ? form.ministryId : undefined,
                    });
                    setForm({ ...form, title: "" });
                    setOpen(false);
                    toast.success("Evento criado");
                  }}
                >
                  Criar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {events.map((e) => {
          const Icon = scopeIcon[e.scope];
          const campus = e.campusId ? db.campuses.find((c) => c.id === e.campusId) : null;
          const ministry = e.ministryId ? db.ministries.find((m) => m.id === e.ministryId) : null;
          return (
            <Card key={e.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="secondary" className="gap-1 capitalize">
                    <Calendar className="h-3 w-3" />
                    {new Date(e.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </Badge>
                </div>
                <h3 className="mt-4 text-lg font-semibold tracking-tight">{e.title}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="capitalize">
                    {e.scope}
                  </Badge>
                  {campus && <span>{campus.name}</span>}
                  {ministry && <span>· {MINISTRY_LABEL[ministry.kind]}</span>}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {events.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum evento visível para seu perfil.</p>
        )}
      </div>
    </div>
  );
}
