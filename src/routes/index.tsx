import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Layers, Calendar, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RedisLogo } from "@/components/brand/RedisLogo";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <RedisLogo withWordmark className="text-base" />
          <span className="sr-only">Redis</span>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Entrar
              </Button>
            </Link>
            <Link to="/login">
              <Button size="sm">
                Começar <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          Protótipo · Gestão unificada
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
          A gestão da sua mega igreja em um só lugar.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Administre múltiplos campus, ministérios, células, cursos, eventos e milhares de pessoas —
          com uma hierarquia clara do gestor geral até o líder de GT.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/login">
            <Button size="lg">
              Explorar demo <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Layers, title: "Campus e Ministérios", desc: "Estrutura em cascata: igreja → campus → ministérios." },
          { icon: Users, title: "Pessoas e Células", desc: "Cadastro, batismo, célula, discipulador e GTs." },
          { icon: Calendar, title: "Eventos com regras", desc: "Compartilhamento geral, por campus ou ministerial." },
          { icon: ShieldCheck, title: "Papéis definidos", desc: "Gestor, líderes de campus, ministério geral e GT." },
        ].map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-border bg-card p-5 text-left"
          >
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-accent-foreground">
              <f.icon className="h-4 w-4" />
            </div>
            <h3 className="mt-4 font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-muted-foreground">
          Redis · Protótipo frontend sem backend
        </div>
      </footer>
    </div>
  );
}
