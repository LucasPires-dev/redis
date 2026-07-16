import { createFileRoute, Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Building2,
  Users,
  HeartHandshake,
  Sparkles,
  Calendar,
  GraduationCap,
  Church,
  ChevronsUpDown,
  LogOut,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABEL, MINISTRY_LABEL, actions, useDB, type RoleKey, type MinistryKind } from "@/lib/mock-store";

export const Route = createFileRoute("/app")({
  head: () => ({ meta: [{ title: "Painel — Kairos" }] }),
  component: AppShell,
});

const NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/campus", label: "Campus", icon: Building2 },
  { to: "/app/ministerios", label: "Ministérios", icon: HeartHandshake },
  { to: "/app/pessoas", label: "Pessoas", icon: Users },
  { to: "/app/celulas", label: "Células", icon: Sparkles },
  { to: "/app/eventos", label: "Eventos", icon: Calendar },
  { to: "/app/cursos", label: "Cursos", icon: GraduationCap },
] as const;

function AppShell() {
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
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-1 py-1.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Church className="h-4 w-4" />
          </div>
          <div className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
            <div className="truncate text-sm font-semibold">Kairos</div>
            <div className="truncate text-xs text-muted-foreground">Mega Igreja Vida</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Geral</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => {
                const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link to={item.to}>
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
  const role = useDB((d) => d.currentRole);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-2 rounded-md p-1.5 text-left hover:bg-sidebar-accent">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs">PD</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
            <div className="truncate text-sm font-medium">Pastor Demo</div>
            <div className="truncate text-xs text-muted-foreground">{ROLE_LABEL[role]}</div>
          </div>
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" className="w-56">
        <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            actions.reset();
          }}
        >
          Resetar dados de demo
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ to: "/" })}>
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TopBar() {
  const role = useDB((d) => d.currentRole);
  const currentCampusId = useDB((d) => d.currentCampusId);
  const currentMinistryKind = useDB((d) => d.currentMinistryKind);
  const campuses = useDB((d) => d.campuses);

  const showCampus = role === "lider_campus" || role === "lider_ministerio_campus";
  const showMinistry = role === "lider_geral_ministerio" || role === "lider_ministerio_campus";

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
      <SidebarTrigger />
      <div className="ml-2 flex flex-1 items-center gap-2">
        <span className="text-xs text-muted-foreground">Perfil de demonstração</span>
        <Select value={role} onValueChange={(v) => actions.setRole(v as RoleKey)}>
          <SelectTrigger className="h-8 w-[240px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(ROLE_LABEL) as RoleKey[]).map((k) => (
              <SelectItem key={k} value={k}>
                {ROLE_LABEL[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showCampus && (
          <Select value={currentCampusId} onValueChange={(v) => actions.setCampus(v)}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {campuses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {showMinistry && (
          <Select
            value={currentMinistryKind}
            onValueChange={(v) => actions.setMinistryKind(v as MinistryKind)}
          >
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(MINISTRY_LABEL) as MinistryKind[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {MINISTRY_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <Button size="sm" variant="outline" onClick={() => actions.reset()}>
        Resetar demo
      </Button>
    </header>
  );
}
