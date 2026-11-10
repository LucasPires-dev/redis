import { createFileRoute, Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  HeartHandshake,
  Sparkles,
  Calendar,
  GraduationCap,
  Clapperboard,
  ChevronsUpDown,
  LogOut,
  UserCog,
} from "lucide-react";
import { RedisLogo } from "@/components/brand/RedisLogo";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { hasAccessToken } from "@/lib/api/client";
import {
  canCoordinateCells,
  canManageResponsibles,
  deriveRoleLabel,
  hasCellLeadership,
  isMinistryLeaderOnly,
  isReconciliadorOnly,
  useAuth,
} from "@/lib/api/auth";

export const Route = createFileRoute("/app")({
  head: () => ({ meta: [{ title: "Painel — Redis" }] }),
  component: AppShell,
});

const NAV: {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  hideForMinistryLeader?: boolean;
  /** Show only when this predicate returns true (checked in AppSidebar). */
  visibleWhen?: "cellCoordinator" | "responsibleManager";
}[] = [
  {
    to: "/app",
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
    hideForMinistryLeader: true,
  },
  { to: "/app/campus", label: "Campus", icon: Building2, hideForMinistryLeader: true },
  { to: "/app/ministerios", label: "Ministérios", icon: HeartHandshake },
  { to: "/app/producao", label: "Produção", icon: Clapperboard },
  { to: "/app/pessoas", label: "Pessoas", icon: Users, hideForMinistryLeader: true },
  { to: "/app/celulas", label: "Células", icon: Sparkles, hideForMinistryLeader: true },
  {
    to: "/app/celulas/coordination",
    label: "Coord. Células",
    icon: Sparkles,
    hideForMinistryLeader: true,
    visibleWhen: "cellCoordinator",
  },
  { to: "/app/eventos", label: "Eventos", icon: Calendar, hideForMinistryLeader: true },
  { to: "/app/cursos", label: "Cursos", icon: GraduationCap, hideForMinistryLeader: true },
  // Appointing responsibles: manager, campus leaders and general area responsibles.
  {
    to: "/app/responsaveis",
    label: "Responsáveis",
    icon: UserCog,
    visibleWhen: "responsibleManager",
  },
];


function AppShell() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!hasAccessToken()) {
      navigate({ to: "/login" });
      return;
    }
    if (!isLoading && !isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Client-only guard (no token / not yet authenticated) — render nothing while
  // useEffect above redirects, same SSR-tolerance pattern the mock store used.
  if (typeof window === "undefined" || !hasAccessToken() || isLoading || !isAuthenticated) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <TopBar />
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { me } = useAuth();
  const restrictedNav = isMinistryLeaderOnly(me) || isReconciliadorOnly(me);
  const isCellCoordinator =
    canCoordinateCells(me) || (me?.led_campuses_cells ?? []).length > 0;
  const items = NAV.filter((item) => {
    if (item.visibleWhen === "cellCoordinator" && !isCellCoordinator) return false;
    if (item.visibleWhen === "responsibleManager" && !canManageResponsibles(me)) return false;
    if (!item.hideForMinistryLeader || !restrictedNav) return true;
    return item.to === "/app/celulas" && hasCellLeadership(me);
  });
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-1 py-1.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white ring-1 ring-sidebar-border">
            <RedisLogo className="h-5 w-5" />
          </div>
          <div className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
            <div className="truncate text-sm font-semibold tracking-tight">redis</div>
            <div className="truncate text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Mega Igreja Vida
            </div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Geral</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link to={item.to as string}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}

function UserMenu() {
  const navigate = useNavigate();
  const { me, logout } = useAuth();
  const initials = me
    ? me.name
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("")
    : "…";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-2 rounded-md p-1.5 text-left hover:bg-sidebar-accent">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
            <div className="truncate text-sm font-medium">{me?.name ?? "…"}</div>
            <div className="truncate text-xs text-muted-foreground">{deriveRoleLabel(me)}</div>
          </div>
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" className="w-56">
        <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            logout();
            navigate({ to: "/login" });
          }}
        >
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
      <SidebarTrigger />
      <div className="flex-1" />
    </header>
  );
}
