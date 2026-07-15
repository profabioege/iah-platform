import {
  CalendarDays,
  CircleUser,
  FlaskConical,
  FolderKanban,
  LayoutDashboard,
  Library,
  NotebookPen,
  Rocket,
  Sparkles,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

/**
 * Menus estáticos do Sprint 1 — sem navegação real.
 * "Dashboard" é marcado como ativo apenas para visualização do estado.
 */
const menuItems = [
  { title: "Dashboard", icon: LayoutDashboard, active: true },
  { title: "Missões", icon: Rocket, active: false },
  { title: "Laboratório", icon: FlaskConical, active: false },
  { title: "Biblioteca", icon: Library, active: false },
  { title: "Diário do Auditor", icon: NotebookPen, active: false },
  { title: "Projetos", icon: FolderKanban, active: false },
  { title: "Mentor IA", icon: Sparkles, active: false },
  { title: "Agenda", icon: CalendarDays, active: false },
  { title: "Perfil", icon: CircleUser, active: false },
];

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-chart-2 text-primary-foreground shadow-lg shadow-primary/30">
            <FlaskConical className="size-5" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">
              IA &amp; Humanidades
            </span>
            <span className="text-xs text-muted-foreground">
              Laboratório do Auditor
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Plataforma</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton isActive={item.active} tooltip={item.title}>
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary/20 text-xs font-medium text-primary">
              AR
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium">Auditor(a)</span>
            <span className="text-xs text-muted-foreground">
              Auditor da Realidade
            </span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
