import { useState } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import {
  Award,
  Download,
  GraduationCap,
  HeartHandshake,
  LogOut,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DetailSkeleton } from "@/components/skeletons";
import { StatCard } from "@/components/detail/StatCard";
import { DetailSection, EmptyState } from "@/components/detail/DetailSection";
import { capabilitiesOf, useMe } from "@/lib/api/auth";
import {
  CLASS_STATE_LABEL,
  useCourseReport,
  type ClassState,
  type CourseReportRow,
} from "@/lib/api/courses";
import { formatBRL } from "@/lib/api/payments";
import { cn } from "@/lib/utils";

const ALL = "all";

// "Relatórios": how the classes of the campuses the person coordinates are
// doing — enrollment, attendance, completion, dropouts and money — with who
// needs care. Each row opens the class.
export const Route = createFileRoute("/app/cursos/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios de cursos — Redis" }] }),
  component: CourseReportsPage,
});

const STATE_TONE: Record<ClassState, string> = {
  upcoming: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  ongoing: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  finished: "bg-muted text-muted-foreground",
};

const pct = (n: number | null) => (n == null ? "—" : `${n}%`);

function shortDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

function period(r: CourseReportRow) {
  if (r.start_date && r.end_date) return `${shortDate(r.start_date)} a ${shortDate(r.end_date)}`;
  if (r.start_date) return `desde ${shortDate(r.start_date)}`;
  return "";
}

function CourseReportsPage() {
  const { data: me, isLoading: meLoading } = useMe();
  const canSee = capabilitiesOf(me).courses.coordinate;
  const [campus, setCampus] = useState(ALL);
  const [state, setState] = useState<ClassState | typeof ALL>(ALL);
  const { data: report, isLoading } = useCourseReport({
    campus: campus === ALL ? undefined : campus,
    state: state === ALL ? undefined : state,
  });

  if (me && !canSee) return <Navigate to="/app/cursos" replace />;
  if (meLoading) return <DetailSkeleton />;

  const rows = report?.classes ?? [];
  const t = report?.totals;
  const anyPaid = rows.some((r) => r.is_paid);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Como estão as turmas dos campi que você coordena: matrículas, presença, conclusão, evasão e
        quem precisa de cuidado.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        {(report?.campuses.length ?? 0) > 1 && (
          <Select value={campus} onValueChange={setCampus}>
            <SelectTrigger className="w-full sm:w-52" aria-label="Campus">
              <SelectValue placeholder="Campus" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os campi</SelectItem>
              {report!.campuses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={state} onValueChange={(v) => setState(v as ClassState | typeof ALL)}>
          <SelectTrigger className="w-full sm:w-52" aria-label="Situação">
            <SelectValue placeholder="Situação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as turmas</SelectItem>
            {(Object.keys(CLASS_STATE_LABEL) as ClassState[]).map((s) => (
              <SelectItem key={s} value={s}>
                {s === "upcoming" ? "Próximas" : s === "ongoing" ? "Em andamento" : "Encerradas"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="gap-1 sm:ml-auto"
          disabled={rows.length === 0}
          onClick={() => downloadCsv(rows)}
        >
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      {isLoading || !t ? (
        <EmptyState>Carregando…</EmptyState>
      ) : rows.length === 0 ? (
        <EmptyState>Nenhuma turma com esses filtros.</EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3" data-testid="course-report-totals">
            <StatCard
              icon={<GraduationCap className="h-4 w-4" />}
              label="Turmas"
              value={t.classes}
              hint={t.ongoing > 0 ? `${t.ongoing} em andamento` : undefined}
            />
            <StatCard
              icon={<Users className="h-4 w-4" />}
              label="Alunos"
              value={t.enrolled}
              hint={`${t.active} cursando · ${t.completed} concluíram`}
            />
            <StatCard
              icon={<UserCheck className="h-4 w-4" />}
              label="Frequência"
              value={pct(t.attendance_rate)}
              hint="presença nas aulas registradas"
            />
            <StatCard
              icon={<Award className="h-4 w-4" />}
              label="Conclusão"
              value={pct(t.completion_rate)}
              hint={`${t.completed} de ${t.enrolled + t.dropouts} que começaram`}
            />
            <StatCard
              icon={<LogOut className="h-4 w-4" />}
              label="Evasão"
              value={pct(t.dropout_rate)}
              hint={`${t.dropouts} ${t.dropouts === 1 ? "saiu" : "saíram"} da turma`}
            />
            <StatCard
              icon={<HeartHandshake className="h-4 w-4" />}
              label="Para cuidar"
              value={t.to_care}
              hint="faltas seguidas ou abaixo do mínimo"
            />
            {anyPaid && (
              <StatCard
                icon={<Wallet className="h-4 w-4" />}
                label="Recebido"
                value={formatBRL(t.received_cents)}
                hint={
                  t.outstanding_cents > 0
                    ? `${formatBRL(t.outstanding_cents)} em aberto`
                    : "nada em aberto"
                }
              />
            )}
          </div>

          <DetailSection title="Turmas" count={rows.length}>
            <Card className="overflow-x-auto [contain:inline-size]">
              <Table data-testid="course-report-classes">
                <TableHeader>
                  <TableRow>
                    <TableHead>Turma</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="text-right">Alunos</TableHead>
                    <TableHead className="text-right">Aulas</TableHead>
                    <TableHead className="text-right">Frequência</TableHead>
                    <TableHead className="text-right">Conclusão</TableHead>
                    <TableHead className="text-right">Evasão</TableHead>
                    <TableHead className="text-right">Para cuidar</TableHead>
                    {anyPaid && <TableHead className="text-right">Financeiro</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id} data-testid="course-report-class">
                      <TableCell>
                        <Link
                          to="/app/cursos/$id/turma/$classId"
                          params={{ id: r.course.id, classId: r.id }}
                          className="font-medium hover:underline"
                        >
                          {r.course.name} — {r.name}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {r.campus.name}
                          {period(r) && ` · ${period(r)}`}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATE_TONE[r.state]}>
                          {CLASS_STATE_LABEL[r.state]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.enrolled}
                        {r.capacity != null && (
                          <span className="text-muted-foreground">/{r.capacity}</span>
                        )}
                        <div className="text-xs text-muted-foreground">{r.active} cursando</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.lessons_held}
                        <span className="text-muted-foreground">/{r.lesson_count}</span>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums",
                          r.attendance_rate != null &&
                            r.attendance_rate < r.min_attendance_percent &&
                            "text-amber-700 dark:text-amber-400",
                        )}
                      >
                        {pct(r.attendance_rate)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {pct(r.completion_rate)}
                        <div className="text-xs text-muted-foreground">
                          {r.completed} concluíram
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {pct(r.dropout_rate)}
                        <div className="text-xs text-muted-foreground">
                          {r.dropouts} {r.dropouts === 1 ? "saiu" : "saíram"}
                        </div>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums",
                          r.to_care > 0 && "font-medium text-amber-700 dark:text-amber-400",
                        )}
                      >
                        {r.to_care}
                      </TableCell>
                      {anyPaid && (
                        <TableCell className="text-right tabular-nums">
                          {r.is_paid ? (
                            <>
                              {formatBRL(r.received_cents)}
                              {r.outstanding_cents > 0 && (
                                <div className="text-xs text-amber-700 dark:text-amber-400">
                                  {formatBRL(r.outstanding_cents)} em aberto
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">Gratuita</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </DetailSection>
        </>
      )}
    </div>
  );
}

// Spreadsheet-friendly for Excel in Portuguese: ";" separator, decimal comma
// and a BOM so accents survive. One row per class.
function downloadCsv(rows: CourseReportRow[]) {
  const quote = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const num = (n: number | null) => (n == null ? "" : String(n));
  const money = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
  const header = [
    "Curso",
    "Turma",
    "Campus",
    "Situação",
    "Início",
    "Fim",
    "Vagas",
    "Alunos",
    "Cursando",
    "Concluíram",
    "Saíram",
    "Conclusão (%)",
    "Evasão (%)",
    "Aulas registradas",
    "Aulas",
    "Frequência (%)",
    "Frequência mínima (%)",
    "Para cuidar",
    "Previsto (R$)",
    "Recebido (R$)",
    "Em aberto (R$)",
  ];
  const lines = rows.map((r) => [
    quote(r.course.name),
    quote(r.name),
    quote(r.campus.name),
    CLASS_STATE_LABEL[r.state],
    r.start_date ? shortDate(r.start_date) : "",
    r.end_date ? shortDate(r.end_date) : "",
    num(r.capacity),
    r.enrolled,
    r.active,
    r.completed,
    r.dropouts,
    num(r.completion_rate),
    num(r.dropout_rate),
    r.lessons_held,
    r.lesson_count,
    num(r.attendance_rate),
    r.min_attendance_percent,
    r.to_care,
    money(r.expected_cents),
    money(r.received_cents),
    money(r.outstanding_cents),
  ]);
  const csv = [header.map(quote), ...lines].map((r) => r.join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `relatorio-cursos-${new Date().toLocaleDateString("en-CA")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
