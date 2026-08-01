import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Users, Droplet, HeartHandshake, GraduationCap, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/detail/StatCard";
import { DetailSection, EmptyState } from "@/components/detail/DetailSection";
import { useCampuses } from "@/lib/api/ministries";
import { useReconciliationDashboard, type ReconciliationBucket } from "@/lib/api/reconciliation";

export const Route = createFileRoute("/app/reconciliacao_/dashboard")({
  head: () => ({ meta: [{ title: "Reconciliação — Dashboard — Redis" }] }),
  component: ReconciliacaoDashboard,
});

function ReconciliacaoDashboard() {
  const [campusId, setCampusId] = useState<string>("all");
  const { data: campuses } = useCampuses();
  const { data, isLoading } = useReconciliationDashboard(campusId === "all" ? undefined : campusId);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reconciliação — Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhamento dos convertidos por reconciliador e campus.
          </p>
        </div>
        <Select value={campusId} onValueChange={setCampusId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Todos os campus" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os campus</SelectItem>
            {(campuses ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <StatCard icon={<Users className="h-4 w-4" />} label="Convertidos" value={data.overall.total} />
            <StatCard icon={<Droplet className="h-4 w-4" />} label="Batizados" value={data.overall.baptized} />
            <StatCard icon={<Sparkles className="h-4 w-4" />} label="Em um GT" value={data.overall.in_cell} />
            <StatCard
              icon={<HeartHandshake className="h-4 w-4" />}
              label="Servindo"
              value={data.overall.serving}
            />
            <StatCard
              icon={<GraduationCap className="h-4 w-4" />}
              label="Jornada concluída"
              value={data.overall.jornada_completed}
            />
          </div>

          <DetailSection title="Por reconciliador" count={data.by_reconciliador.length}>
            {data.by_reconciliador.length === 0 ? (
              <EmptyState>Nenhum convertido atribuído ainda.</EmptyState>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {data.by_reconciliador.map((row) => (
                  <BucketCard key={row.reconciliador.id} title={row.reconciliador.name} bucket={row} />
                ))}
              </div>
            )}
          </DetailSection>

          <DetailSection title="Por campus" count={data.by_campus.length}>
            {data.by_campus.length === 0 ? (
              <EmptyState>Nenhum convertido atribuído ainda.</EmptyState>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {data.by_campus.map((row) => (
                  <BucketCard key={row.campus.id} title={row.campus.name} bucket={row} />
                ))}
              </div>
            )}
          </DetailSection>
        </>
      )}
    </div>
  );
}

function BucketCard({ title, bucket }: { title: string; bucket: ReconciliationBucket }) {
  return (
    <Card>
      <CardContent className="space-y-2 p-5">
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">{bucket.total} convertido(s)</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span>Batizados: {bucket.baptized}</span>
          <span>Em GT: {bucket.in_cell}</span>
          <span>Servindo: {bucket.serving}</span>
          <span>Jornada: {bucket.jornada_completed}</span>
        </div>
      </CardContent>
    </Card>
  );
}
