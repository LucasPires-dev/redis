import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Droplet, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDB, actions, visiblePeople, MINISTRY_LABEL } from "@/lib/mock-store";
import { toast } from "sonner";

export const Route = createFileRoute("/app/pessoas")({
  head: () => ({ meta: [{ title: "Pessoas — Redis" }] }),
  component: PeoplePage,
});

function PeoplePage() {
  const db = useDB((d) => d);
  const people = visiblePeople(db);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    campusId: db.campuses[0]?.id ?? "",
    baptized: false,
  });

  const filtered = useMemo(
    () =>
      people.filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q.toLowerCase()) ||
          p.email.toLowerCase().includes(q.toLowerCase()),
      ),
    [people, q],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pessoas</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} pessoas visíveis no seu escopo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome ou email"
              className="h-9 w-64 pl-8"
            />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" /> Nova pessoa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar pessoa</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Nome</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Campus</Label>
                  <Select value={form.campusId} onValueChange={(v) => setForm({ ...form, campusId: v })}>
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
                <label className="flex items-center gap-2 pt-1 text-sm">
                  <Checkbox
                    checked={form.baptized}
                    onCheckedChange={(v) => setForm({ ...form, baptized: !!v })}
                  />
                  Já é batizado(a)
                </label>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    if (!form.name || !form.email) return;
                    actions.addPerson({
                      name: form.name,
                      email: form.email,
                      campusId: form.campusId,
                      ministryIds: [],
                      baptized: form.baptized,
                      baptizedAt: form.baptized ? new Date().toISOString().slice(0, 10) : undefined,
                    });
                    setForm({ name: "", email: "", campusId: db.campuses[0]?.id ?? "", baptized: false });
                    setOpen(false);
                    toast.success("Pessoa adicionada");
                  }}
                >
                  Adicionar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Campus</TableHead>
              <TableHead>Ministérios</TableHead>
              <TableHead>Célula</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice(0, 100).map((p) => {
              const campus = db.campuses.find((c) => c.id === p.campusId);
              const cell = db.cells.find((c) => c.id === p.cellId);
              const initials = p.name
                .split(" ")
                .map((s) => s[0])
                .slice(0, 2)
                .join("");
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-xs text-primary">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{campus?.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {p.ministryIds.map((mid) => {
                        const m = db.ministries.find((mm) => mm.id === mid);
                        return m ? (
                          <Badge key={mid} variant="secondary" className="capitalize">
                            {MINISTRY_LABEL[m.kind]}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {cell ? (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Sparkles className="h-3 w-3" /> {cell.name}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.baptized ? (
                      <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/10">
                        <Droplet className="h-3 w-3" /> Batizado
                      </Badge>
                    ) : (
                      <Badge variant="outline">Não batizado</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">Sem resultados.</div>
        )}
      </div>
    </div>
  );
}
