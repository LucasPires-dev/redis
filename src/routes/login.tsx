import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Church } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — Kairos" }] }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      localStorage.setItem(
        "kairos-user",
        JSON.stringify({ name: name || "Pastor Demo", email: email || "demo@igreja.org" }),
      );
    } catch {}
    navigate({ to: "/app" });
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="flex flex-col justify-between border-r border-border bg-muted/40 p-10">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Church className="h-4 w-4" />
          </div>
          <span className="font-semibold tracking-tight">Kairos</span>
        </Link>
        <div>
          <p className="max-w-md text-2xl font-medium leading-snug tracking-tight text-foreground">
            "Uma plataforma que enxerga a igreja inteira — do gestor geral ao líder de célula."
          </p>
          <p className="mt-4 text-sm text-muted-foreground">Protótipo de demonstração</p>
        </div>
        <div className="text-xs text-muted-foreground">© Kairos 2026</div>
      </div>

      <div className="flex items-center justify-center p-10">
        <form onSubmit={submit} className="w-full max-w-sm space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Use qualquer nome e email para acessar a demo.
            </p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                placeholder="Pastor João"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="voce@igreja.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pwd">Senha</Label>
              <Input id="pwd" type="password" placeholder="••••••••" />
            </div>
          </div>
          <Button type="submit" className="w-full">
            Entrar na plataforma
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Ainda sem cadastro?{" "}
            <span className="text-foreground underline underline-offset-4">Criar conta</span>
          </p>
        </form>
      </div>
    </div>
  );
}
