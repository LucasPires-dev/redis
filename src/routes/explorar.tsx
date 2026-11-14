import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RedisLogo } from "@/components/brand/RedisLogo";
import { ExploreList } from "@/components/explore/ExploreList";
import { hasAccessToken } from "@/lib/api/client";

// Public "Explorar": what churches opened to everyone, without logging in.
export const Route = createFileRoute("/explorar")({
  head: () => ({ meta: [{ title: "Explorar — Redis" }] }),
  component: PublicExplore,
});

function PublicExplore() {
  // The token lives in localStorage: only known after hydration.
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => setSignedIn(hasAccessToken()), []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur">
        <Link to="/" className="inline-flex">
          <RedisLogo withWordmark className="text-sm" />
        </Link>
        {signedIn ? (
          <Button asChild size="sm" variant="outline">
            <Link to="/app">Abrir o app</Link>
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline">
            <Link to="/login">Entrar</Link>
          </Button>
        )}
      </header>
      <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Explorar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Eventos, cursos e células abertos a todos os públicos.
          </p>
        </div>
        <ExploreList />
      </main>
    </div>
  );
}
