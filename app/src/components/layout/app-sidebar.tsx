"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Award,
  BookOpen,
  Building2,
  CalendarDays,
  CircleUser,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FlaskConical,
  FolderKanban,
  GraduationCap,
  HeartHandshake,
  History,
  LayoutDashboard,
  Library,
  MessageSquareText,
  NotebookPen,
  Rocket,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";

// Import direto dos arquivos de domínio (não do barrel `@/modules/workspace`,
// que também reexporta `infrastructure/session.ts` — puxa `next/headers`,
// incompatível com este componente "use client").
import { roleHome } from "@/modules/workspace/domain/workspace-context";
import type { Role } from "@/modules/workspace/domain/entities";
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

type MenuItem = { title: string; icon: typeof LayoutDashboard; href?: string };

/**
 * Menus da Plataforma, por papel do Workspace (M15) — Progressive
 * Disclosure: cada perfil vê só o que lhe pertence; o aluno tem a
 * experiência mais enxuta. Itens sem `href` permanecem visíveis (visão
 * do produto) mas honestamente "Em breve" (D-016). Sem papel resolvido
 * (autenticação real ativa, sessão gerida pelo Auth.js), vale o menu
 * completo de sempre.
 *
 * D-046: o antigo papel único "admin"/`ADMIN_MENU` foi dividido em três
 * menus institucionais enxutos — nunca mais "Gestor" genérico.
 */
const TEACHER_MENU: MenuItem[] = [
  { title: "Painel de controle", icon: LayoutDashboard, href: "/dashboard" },
  { title: "Missões", icon: Rocket, href: "/missoes" },
  { title: "Sondagens", icon: ClipboardList, href: "/professor/avaliacoes" },
  { title: "Professor", icon: GraduationCap, href: "/professor" },
  { title: "Laboratório", icon: FlaskConical },
  { title: "Biblioteca", icon: Library },
  { title: "Diário do Auditor", icon: NotebookPen, href: "/diario" },
  { title: "Projetos", icon: FolderKanban },
  { title: "Mentor IAH", icon: Sparkles },
  { title: "Agenda", icon: CalendarDays },
  { title: "Perfil", icon: CircleUser },
];

const STUDENT_MENU: MenuItem[] = [
  { title: "Minha Aula", icon: LayoutDashboard, href: "/dashboard" },
  { title: "Minha Missão", icon: Rocket, href: "/missoes" },
  { title: "Minhas Sondagens", icon: ClipboardList, href: "/avaliacoes" },
  { title: "Diário do Auditor", icon: NotebookPen, href: "/diario" },
  { title: "Meu Portfólio", icon: FolderKanban },
  { title: "Meu Histórico", icon: History },
  { title: "Minha Devolutiva", icon: MessageSquareText },
];

const MAINTAINER_MENU: MenuItem[] = [
  { title: "Início", icon: LayoutDashboard, href: "/mantenedor" },
  { title: "Unidades", icon: Building2, href: "/mantenedor/unidades" },
  { title: "Utilização", icon: Activity, href: "/mantenedor/utilizacao" },
  { title: "Implantação", icon: ClipboardList, href: "/mantenedor/implantacao" },
  { title: "Relatórios executivos", icon: FileText, href: "/mantenedor/relatorios" },
  { title: "Configurações", icon: Settings, href: "/mantenedor/configuracoes" },
];

const DIRECTOR_MENU: MenuItem[] = [
  { title: "Início", icon: LayoutDashboard, href: "/direcao" },
  { title: "Professores", icon: GraduationCap, href: "/direcao/professores" },
  { title: "Turmas", icon: Users, href: "/direcao/turmas" },
  { title: "Alunos", icon: UserRound, href: "/direcao/alunos" },
  { title: "Pendências", icon: ClipboardCheck, href: "/direcao/pendencias" },
  { title: "Calendário institucional", icon: CalendarDays, href: "/direcao/calendario" },
  { title: "Relatórios", icon: FileText, href: "/direcao/relatorios" },
  { title: "Evidências e auditoria", icon: ShieldCheck, href: "/direcao/evidencias" },
];

const COORDINATOR_MENU: MenuItem[] = [
  { title: "Início", icon: LayoutDashboard, href: "/coordenacao" },
  { title: "Professores", icon: GraduationCap, href: "/coordenacao/professores" },
  { title: "Turmas", icon: Users, href: "/coordenacao/turmas" },
  {
    title: "Atividades e avaliações",
    icon: ClipboardCheck,
    href: "/coordenacao/atividades-avaliacoes",
  },
  { title: "Aprendizagem", icon: BookOpen, href: "/coordenacao/aprendizagem" },
  { title: "Intervenções", icon: HeartHandshake, href: "/coordenacao/intervencoes" },
  { title: "Formação docente", icon: Award, href: "/coordenacao/formacao-docente" },
  { title: "Relatórios pedagógicos", icon: FileText, href: "/coordenacao/relatorios" },
];

function menuForRole(role: Role | null): MenuItem[] {
  if (role === "student") return STUDENT_MENU;
  if (role === "maintainer") return MAINTAINER_MENU;
  if (role === "director") return DIRECTOR_MENU;
  if (role === "pedagogical_coordinator") return COORDINATOR_MENU;
  return TEACHER_MENU;
}

export function AppSidebar({
  role = null,
  userName = null,
  roleLabel = null,
}: {
  role?: Role | null;
  userName?: string | null;
  roleLabel?: string | null;
}) {
  const pathname = usePathname();
  const menuItems = menuForRole(role);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const displayName = userName ?? "Auditor(a)";
  const displayRole = roleLabel ?? "Auditor da Realidade";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link
          href={role ? roleHome(role) : "/dashboard"}
          className="flex items-center gap-3 px-2 py-2.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          aria-label="IAH Educacional — ir para a página inicial"
        >
          {/* M18.3: logo completo expandida; recolhida, só o Núcleo IAH — nunca o logotipo reduzido a tamanho ilegível */}
          <Logo
            size="md"
            variant="dark"
            className="shrink-0 group-data-[collapsible=icon]:hidden"
          />
          <Logo
            size="sm"
            mark
            title="IAH"
            className="hidden shrink-0 group-data-[collapsible=icon]:block"
          />
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
        <div className="flex items-center gap-3 px-2 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary/20 text-xs font-medium text-primary">
              {initials || "AR"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-medium">{displayName}</span>
            <span className="text-xs text-muted-foreground">{displayRole}</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
