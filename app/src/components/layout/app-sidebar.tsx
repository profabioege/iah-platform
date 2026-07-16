"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CircleUser,
  FlaskConical,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  Library,
  NotebookPen,
  Rocket,
  Sparkles,
} from "lucide-react";

import { Logo } from "@/components/brand/logo";
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
 * Menus da Plataforma. Os itens com `href` navegam de verdade; os demais
 * permanecem visíveis (visão do produto) mas inativos até serem construídos
 * nas próximas Sprints. O estado ativo é derivado da URL atual.
 */
const menuItems: { title: string; icon: typeof LayoutDashboard; href?: string }[] =
  [
    { title: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    { title: "Missões", icon: Rocket, href: "/missoes" },
    { title: "Professor", icon: GraduationCap, href: "/professor" },
    { title: "Laboratório", icon: FlaskConical },
    { title: "Biblioteca", icon: Library },
    { title: "Diário do Auditor", icon: NotebookPen, href: "/diario" },
    { title: "Projetos", icon: FolderKanban },
    { title: "Mentor IA", icon: Sparkles },
    { title: "Agenda", icon: CalendarDays },
    { title: "Perfil", icon: CircleUser },
  ];

export function AppSidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-2 py-2.5"
          aria-label="IAH Educacional — ir para o Dashboard"
        >
          <Logo variant="dark" className="h-8 w-auto shrink-0" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">
              Educacional
            </span>
            <span className="text-xs text-muted-foreground">
              Laboratório do Auditor
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Plataforma</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={item.href ? <Link href={item.href} /> : undefined}
                    isActive={item.href ? isActive(item.href) : false}
                    disabled={!item.href}
                    aria-disabled={!item.href || undefined}
                    tooltip={
                      item.href ? item.title : `${item.title} — em breve`
                    }
                    className={
                      item.href
                        ? undefined
                        : "cursor-default opacity-45 hover:bg-transparent hover:text-sidebar-foreground"
                    }
                  >
                    <item.icon />
                    <span>{item.title}</span>
                    {item.href ? null : (
                      <span className="ml-auto rounded-full border border-sidebar-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Em breve
                      </span>
                    )}
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
