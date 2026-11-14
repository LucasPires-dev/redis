import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Eye, EyeOff } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/membership/AuthShell";
import { ApiError, apiErrorMessage } from "@/lib/api/client";
import { register, useInviteLookup } from "@/lib/api/membership";

export const Route = createFileRoute("/cadastro")({
  head: () => ({ meta: [{ title: "Criar conta — Redis" }] }),
  validateSearch: (search: Record<string, unknown>): { convite?: string; evento?: string } => ({
    convite: typeof search.convite === "string" && search.convite ? search.convite : undefined,
    // Came from an event's public link: back to it after signing up.
    evento:
      typeof search.evento === "string" && /^[0-9a-f-]{36}$/i.test(search.evento)
        ? search.evento
        : undefined,
  }),
  component: SignUp,
});

type Field = "name" | "email" | "phone" | "password";

function fieldErrors(error: unknown): Partial<Record<Field, string>> {
  if (!(error instanceof ApiError) || !error.detail || typeof error.detail !== "object") return {};
  const detail = error.detail as Record<string, unknown>;
  const out: Partial<Record<Field, string>> = {};
  for (const field of ["name", "email", "phone", "password"] as Field[]) {
    const value = detail[field];
    if (Array.isArray(value) && typeof value[0] === "string") out[field] = value[0];
  }
  return out;
}

function SignUp() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { convite, evento } = Route.useSearch();
  const invite = useInviteLookup(convite);

  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (field: Field, value: string) => setForm((f) => ({ ...f, [field]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    setSubmitting(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        invite_code: invite.data ? convite : undefined,
      });
      queryClient.clear();
      if (evento) navigate({ to: "/app/eventos/$id", params: { id: evento } });
      else navigate({ to: "/app" });
    } catch (err) {
      const byField = fieldErrors(err);
      setErrors(byField);
      if (err instanceof ApiError && err.status === 429) {
        setFormError("Muitas tentativas a partir desta rede. Tente novamente mais tarde.");
      } else if (Object.keys(byField).length === 0) {
        setFormError(apiErrorMessage(err, "Não foi possível criar a conta. Tente novamente."));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const loginSearch = convite
    ? { redirect: `/convite/${convite}` }
    : evento
      ? { redirect: `/app/eventos/${evento}` }
      : {};

  return (
    <AuthShell>
      <form onSubmit={submit} className="space-y-6" noValidate>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Criar conta</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {invite.data
              ? "Depois de criar a conta você já entra no campus do convite."
              : "Depois você escolhe o seu campus."}
          </p>
        </div>

        {invite.data && (
          <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 text-sm">
              <div className="text-muted-foreground">Convite para</div>
              <div className="truncate font-semibold">{invite.data.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                {invite.data.church.name}
                {invite.data.city && ` · ${invite.data.city}`}
              </div>
            </div>
          </div>
        )}
        {invite.isError && (
          <p className="rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
            Este convite não é mais válido. Você ainda pode criar a conta e escolher o campus
            depois.
          </p>
        )}

        <div className="space-y-4">
          <FormField id="name" label="Nome completo" error={errors.name}>
            <Input
              id="name"
              autoComplete="name"
              className="h-11"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </FormField>
          <FormField id="email" label="E-mail" error={errors.email}>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              className="h-11"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              required
            />
          </FormField>
          <FormField id="phone" label="Celular (opcional)" error={errors.phone}>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(11) 99999-9999"
              className="h-11"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </FormField>
          <FormField
            id="password"
            label="Senha"
            error={errors.password}
            hint="Pelo menos 8 caracteres, sem ser só números."
          >
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="h-11 pr-11"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground"
                aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </FormField>
        </div>

        {formError && <p className="text-sm text-destructive">{formError}</p>}

        <Button
          type="submit"
          className="h-11 w-full"
          disabled={submitting || !form.name.trim() || !form.email.trim() || !form.password}
        >
          {submitting ? "Criando conta…" : "Criar conta"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link
            to="/login"
            search={loginSearch}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Entrar
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

function FormField({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
