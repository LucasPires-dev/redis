import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RedisLogo } from "@/components/brand/RedisLogo";
import { ApiError, AuthError } from "@/lib/api/client";
import { login } from "@/lib/api/auth";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — Redis" }] }),
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: safeRedirect(search.redirect),
  }),
  component: Login,
});

/** Only same-site paths ("/convite/X"), never "//host" or full URLs. */
function safeRedirect(value: unknown): string | undefined {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : undefined;
}

function Login() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate({ to: redirect ?? "/app" });
    } catch (err) {
      if (err instanceof AuthError || (err instanceof ApiError && err.status === 401)) {
        setError("Email ou senha inválidos.");
      } else {
        setError("Não foi possível conectar à API. Tente novamente.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="hidden flex-col justify-between border-r border-border bg-muted/40 p-6 lg:flex lg:p-10">
        <Link to="/" className="inline-flex">
          <RedisLogo withWordmark withTagline className="text-lg" />
        </Link>
        <div>
          <p className="max-w-md text-2xl font-medium leading-snug tracking-tight text-foreground">
            "Uma plataforma que enxerga a igreja inteira — do gestor geral ao líder de célula."
          </p>
        </div>
        <div className="text-xs text-muted-foreground">© Redis 2026</div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-10">
        <form onSubmit={submit} className="w-full max-w-sm space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
            <p className="mt-1 text-sm text-muted-foreground">Acesse com seu email e senha.</p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="voce@ilan.church"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pwd">Senha</Label>
              <Input
                id="pwd"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="h-11 w-full" disabled={submitting}>
            {submitting ? "Entrando…" : "Entrar na plataforma"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Ainda não tem conta?{" "}
            <Link
              to="/cadastro"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Criar conta
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
