import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { RedisLogo } from "@/components/brand/RedisLogo";

/** Public pages (sign-up, invite): phone layout first, brand panel only on desktop. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="hidden flex-col justify-between border-r border-border bg-muted/40 p-10 lg:flex">
        <Link to="/" className="inline-flex">
          <RedisLogo withWordmark withTagline className="text-lg" />
        </Link>
        <p className="max-w-md text-2xl font-medium leading-snug tracking-tight text-foreground">
          "Uma plataforma que enxerga a igreja inteira — do gestor geral ao líder de célula."
        </p>
        <div className="text-xs text-muted-foreground">© Redis 2026</div>
      </div>

      <div className="flex flex-col px-4 pb-10 pt-6 sm:px-6 lg:items-center lg:justify-center lg:p-10">
        <Link to="/" className="mb-8 inline-flex lg:hidden">
          <RedisLogo withWordmark className="text-base" />
        </Link>
        <div className="mx-auto w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
