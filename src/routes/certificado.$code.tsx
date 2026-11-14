import type React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RedisLogo } from "@/components/brand/RedisLogo";
import { useCertificateCheck } from "@/lib/api/courses";

// Public page printed on every certificate: anyone can confirm, without an
// account, that a certificate is genuine and still valid.
export const Route = createFileRoute("/certificado/$code")({
  head: () => ({ meta: [{ title: "Verificar certificado — Redis" }] }),
  component: CertificateCheckPage,
});

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function shortDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

function CertificateShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background px-4 pb-10 pt-6 sm:px-6 lg:pt-16">
      <div className="mx-auto w-full max-w-md">
        <Link to="/" className="mb-8 inline-flex">
          <RedisLogo withWordmark className="text-base" />
        </Link>
        {children}
      </div>
    </div>
  );
}

function CertificateCheckPage() {
  const { code } = Route.useParams();
  const { data: certificate, isLoading, isError } = useCertificateCheck(code);

  return (
    <CertificateShell>
      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-16 w-16 rounded-2xl" />
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {!isLoading && (isError || !certificate) && (
        <div className="space-y-4" data-testid="certificate-invalid">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Certificado não encontrado</h1>
          <p className="text-sm text-muted-foreground">
            {isError
              ? "Não foi possível consultar agora. Tente novamente em alguns minutos."
              : `Não há certificado válido com o código ${code.toUpperCase()}. Confira se o código foi digitado exatamente como aparece no certificado.`}
          </p>
          <Button asChild variant="outline" className="h-11 w-full">
            <Link to="/">Ir para o início</Link>
          </Button>
        </div>
      )}

      {!isLoading && certificate && (
        <div className="space-y-6" data-testid="certificate-valid">
          <div>
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              <Award className="h-8 w-8" />
            </div>
            <p className="mt-5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
              Certificado válido
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">{certificate.person_name}</h1>
            <p className="text-sm text-muted-foreground">
              concluiu {certificate.course_name} em {formatDate(certificate.completed_on)}
            </p>
          </div>

          <dl className="divide-y rounded-lg border text-sm">
            <Row label="Curso" value={certificate.course_name} />
            <Row label="Turma" value={certificate.class_name} />
            <Row label="Igreja" value={`${certificate.church_name} · ${certificate.campus_name}`} />
            {certificate.start_date && certificate.end_date && (
              <Row
                label="Período"
                value={`${shortDate(certificate.start_date)} a ${shortDate(certificate.end_date)}`}
              />
            )}
            <Row
              label="Aulas"
              value={
                certificate.attendance_percent != null
                  ? `${certificate.lesson_count} · frequência de ${certificate.attendance_percent}%`
                  : String(certificate.lesson_count)
              }
            />
            {certificate.teachers.length > 0 && (
              <Row
                label={certificate.teachers.length === 1 ? "Professor" : "Professores"}
                value={certificate.teachers.join(", ")}
              />
            )}
            <Row label="Código" value={certificate.code} mono />
          </dl>
        </div>
      )}
    </CertificateShell>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 px-3 py-2">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className={`text-right ${mono ? "font-mono tracking-wide" : ""}`}>{value}</dd>
    </div>
  );
}
