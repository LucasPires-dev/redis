import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { RouteError } from "@/components/RouteError";
import { CardGridSkeleton } from "@/components/skeletons";
import { toast } from "sonner";
import { useMe } from "@/lib/api/auth";
import { useCampuses, useCreateCampus } from "@/lib/api/ministries";
import { usePeople } from "@/lib/api/people";
import { useMinistries } from "@/lib/api/ministries";
import { useCells } from "@/lib/api/cells";

export const Route = createFileRoute("/app/campus")({
  head: () => ({ meta: [{ title: "Campus — Redis" }] }),
  component: CampusPage,
  errorComponent: RouteError,
});

function CampusPage() {
  const { data: me } = useMe();
  const { data: campuses, isLoading } = useCampuses();
  const { data: people } = usePeople();
  const { data: ministries } = useMinistries();
  const { data: cells } = useCells({ season: "current" });
  const createCampus = useCreateCampus();

  const list = campuses ?? [];
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
        {me?.is_manager && (
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
                  disabled={createCampus.isPending}
                  onClick={() => {
                    if (!name || !city) return;
                    createCampus.mutate(
                      { name, city },
                      {
                        onSuccess: () => {
                          setName("");
                          setCity("");
                          setOpen(false);
                          toast.success("Campus adicionado");
                        },
                      },
                    );
                  }}
                >
                  {createCampus.isPending ? "Adicionando…" : "Adicionar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading && <CardGridSkeleton />}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {list.map((c) => {
          const peopleCount = (people ?? []).filter((p) => p.campus?.id === c.id).length;
          const minsCount = (ministries ?? []).filter((m) => m.campus.id === c.id).length;
          const cellsCount = (cells ?? []).filter((ce) => ce.campus.id === c.id).length;
          return (
            <Link key={c.id} to="/app/campus/$id" params={{ id: c.id }} className="group">
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight">{c.name}</h3>
                  <p className="text-sm text-muted-foreground">{c.city}</p>
                  <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4 text-center">
                    <Metric label="Pessoas" value={peopleCount} />
                    <Metric label="Ministérios" value={minsCount} />
                    <Metric label="Células" value={cellsCount} />
                  </div>
                </CardContent>
              </Card>
            </Link>
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
