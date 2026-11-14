import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Droplet } from "lucide-react";
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
import { RouteError } from "@/components/RouteError";
import { TableSkeleton } from "@/components/skeletons";
import { useCampuses, MINISTRY_LABEL } from "@/lib/api/ministries";
import { usePeople, useCreatePerson } from "@/lib/api/people";
import { toast } from "sonner";

export const Route = createFileRoute("/app/pessoas")({
  head: () => ({ meta: [{ title: "Pessoas — Redis" }] }),
  component: PeoplePage,
  errorComponent: RouteError,
});

const emptyForm = { name: "", email: "", password: "", campusId: "", baptized: false };

function PeoplePage() {
  const navigate = useNavigate();
  const { data: people, isLoading } = usePeople();
  const { data: campuses } = useCampuses();
  const createPerson = useCreatePerson();

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const filtered = useMemo(
    () =>
      (people ?? []).filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q.toLowerCase()) ||
          p.email.toLowerCase().includes(q.toLowerCase()),
      ),
    [people, q],
  );

  function submit() {
    if (!form.name || !form.email || !form.password) return;
    createPerson.mutate(
      {
        name: form.name,
        email: form.email,
        password: form.password,
        campus_id: form.campusId || undefined,
        baptized: form.baptized,
      },
      {
        onSuccess: () => {
          setForm(emptyForm);
          setOpen(false);
          toast.success("Pessoa adicionada");
        },
        onError: () => toast.error("Não foi possível adicionar essa pessoa."),
      },
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pessoas</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Carregando…" : `${filtered.length} pessoas visíveis no seu escopo.`}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome ou email"
              className="h-9 w-full pl-8 sm:w-64"
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
                  <Label>Senha</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Campus</Label>
                  <Select value={form.campusId} onValueChange={(v) => setForm({ ...form, campusId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um campus" />
                    </SelectTrigger>
                    <SelectContent>
                      {(campuses ?? []).map((c) => (
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
                <Button onClick={submit} disabled={createPerson.isPending}>
                  {createPerson.isPending ? "Adicionando…" : "Adicionar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? <TableSkeleton /> : <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">Campus</TableHead>
              <TableHead className="hidden lg:table-cell">Ministérios</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice(0, 100).map((p) => {
              const initials = p.name
                .split(" ")
                .map((s) => s[0])
                .slice(0, 2)
                .join("");
              return (
                <TableRow
                  key={p.id}
                  className="cursor-pointer"
                  tabIndex={0}
                  role="link"
                  onClick={() => navigate({ to: "/app/pessoas/$id", params: { id: p.id } })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate({ to: "/app/pessoas/$id", params: { id: p.id } });
                    }
                  }}
                >
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
                        {p.campus && (
                          <div className="text-xs text-muted-foreground md:hidden">{p.campus.name}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{p.campus?.name ?? "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {p.ministries.map((m) => (
                        <Badge key={m.id} variant="secondary" className="capitalize">
                          {MINISTRY_LABEL[m.kind]}
                        </Badge>
                      ))}
                    </div>
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
        {!isLoading && filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">Sem resultados.</div>
        )}
      </div>}
    </div>
  );
}
