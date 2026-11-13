import type { ReactNode } from "react";
import { MessageCircle, Phone, TrendingDown, TrendingUp, UserX, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DetailSection, EmptyState } from "@/components/detail/DetailSection";
import { CellHealthBadge, HEALTH_DOT } from "@/components/cells/CellHealthBadge";
import { cn } from "@/lib/utils";
import { useCellCare, type Cell, type CellHealth } from "@/lib/api/cells";
import { formatDate } from "@/lib/api/seasons";

// wa.me wants the number with the country code; local numbers are Brazilian.
function whatsappUrl(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}`;
}

function ContactLinks({ phone }: { phone: string }) {
  if (!phone) return <span className="text-xs text-muted-foreground">Sem telefone</span>;
  const whatsapp = whatsappUrl(phone);
  return (
    <div className="flex items-center gap-3 text-xs">
      <a
        href={`tel:${phone}`}
        className="flex items-center gap-1 text-muted-foreground hover:text-primary"
      >
        <Phone className="h-3 w-3" /> {phone}
      </a>
      {whatsapp && (
        <a
          href={whatsapp}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-emerald-700 hover:underline dark:text-emerald-400"
        >
          <MessageCircle className="h-3 w-3" /> WhatsApp
        </a>
      )}
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function HealthSummary({ health }: { health: CellHealth }) {
  const trend = health.trend;
  return (
    <Card data-testid="cell-health-summary">
      <CardContent className="space-y-4 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Metric
            label="Frequência"
            value={health.attendance_rate === null ? "—" : `${health.attendance_rate}%`}
            hint="média dos últimos 4 encontros"
          />
          <Metric
            label="Tendência"
            value={
              trend === null ? (
                "—"
              ) : (
                <span
                  className={cn(
                    "inline-flex items-center gap-1",
                    trend < 0 && "text-red-600 dark:text-red-400",
                    trend > 0 && "text-emerald-600 dark:text-emerald-400",
                  )}
                >
                  {trend < 0 ? (
                    <TrendingDown className="h-4 w-4" />
                  ) : (
                    trend > 0 && <TrendingUp className="h-4 w-4" />
                  )}
                  {trend > 0 ? "+" : ""}
                  {trend}%
                </span>
              )
            }
            hint={trend === null ? "ainda sem histórico" : "presença ante os 4 anteriores"}
          />
          <Metric
            label="Visitantes"
            value={health.recent_visitors}
            hint="nos últimos 4 encontros"
          />
        </div>
        {health.reasons.length > 0 ? (
          <ul className="space-y-1.5 border-t pt-4 text-sm" data-testid="cell-health-reasons">
            {health.reasons.map((r) => (
              <li key={r.text} className="flex items-center gap-2">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", HEALTH_DOT[r.level])} />
                {r.text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-t pt-4 text-sm text-muted-foreground">
            {health.status === "new"
              ? "Os indicadores aparecem conforme os encontros forem registrados."
              : "Tudo em dia: encontros registrados, boa frequência e visitantes chegando."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * How the cell is doing (for whoever leads or coordinates it) and
 * "Pessoas para cuidar": members who stopped coming and visitors who didn't
 * come back, with a shortcut to call or message them.
 */
export function CellHealthSection({ cell }: { cell: Cell }) {
  const { data: care, isLoading } = useCellCare(cell.id, !!cell.health);
  if (!cell.health) return null;

  const absent = care?.absent_members ?? [];
  const visitors = care?.visitors_not_returning ?? [];

  return (
    <>
      <DetailSection title="Saúde da célula" action={<CellHealthBadge cell={cell} />}>
        <HealthSummary health={cell.health} />
      </DetailSection>

      <DetailSection title="Pessoas para cuidar" count={absent.length + visitors.length}>
        {isLoading ? (
          <EmptyState>Carregando…</EmptyState>
        ) : absent.length + visitors.length === 0 ? (
          <EmptyState>
            Ninguém precisando de atenção agora: quem é da célula tem vindo e os visitantes estão
            voltando.
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {absent.map((row) => (
              <Card key={row.person.id} data-testid="care-absent">
                <CardContent className="space-y-1.5 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <UserX className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                    <span className="truncate">{row.person.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Faltou aos últimos {row.absences} encontros
                    {row.last_attended
                      ? ` · última presença em ${formatDate(row.last_attended)}`
                      : " · ainda não veio a nenhum"}
                  </p>
                  <ContactLinks phone={row.person.phone} />
                </CardContent>
              </Card>
            ))}
            {visitors.map((v) => (
              <Card key={v.id} data-testid="care-visitor">
                <CardContent className="space-y-1.5 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Users className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span className="truncate">{v.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">visitante</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {v.visit_count} {v.visit_count === 1 ? "visita" : "visitas"} · não volta desde{" "}
                    {formatDate(v.last_visit)} ({v.missed} encontros)
                  </p>
                  <ContactLinks phone={v.phone} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DetailSection>
    </>
  );
}
