import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useDB, actions } from "@/lib/mock-store";
import { toast } from "sonner";

export const Route = createFileRoute("/app/campus")({
  head: () => ({ meta: [{ title: "Campus — Kairos" }] }),
  component: CampusPage,
});

function CampusPage() {
  const db = useDB((d) => d);
  const role = db.currentRole;
  const list = role === "gestor" ? db.campuses : db.campuses.filter((c) => c.id === db.currentCampusId);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campus</h1>
          <p className="text-sm text-muted-foreground">Prédios/localidades da denominação.</p>
        </div>
        {role === "gestor" && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-1 h-4 w-4" /> Novo campus
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar campus</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Nome</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Campus Zona Norte" />
                </div>
                <div className="space-y-1.5">
                  <Label>Cidade</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="São Paulo" />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    if (!name || !city) return;
                    actions.addCampus(name, city);
                    setName("");
                    setCity("");
                    setOpen(false);
                    toast.success("Campus adicionado");
                  }}
                >
                  Adicionar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {list.map((c) => {
          const people = db.people.filter((p) => p.campusId === c.id).length;
          const mins = db.ministries.filter((m) => m.campusId === c.id).length;
          const cells = db.cells.filter((ce) => ce.campusId === c.id).length;
          return (
            <Card key={c.id} className="transition-colors hover:border-primary/40">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <Building2 className="h-5 w-5" />
                  </div>
                </div>
                <h3 className="mt-4 text-lg font-semibold tracking-tight">{c.name}</h3>
                <p className="text-sm text-muted-foreground">{c.city}</p>
                <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4 text-center">
                  <Metric label="Pessoas" value={people} />
                  <Metric label="Ministérios" value={mins} />
                  <Metric label="Células" value={cells} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
