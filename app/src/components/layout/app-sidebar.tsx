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
  ExternalLink,
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
import { isMentorIAHEnabled } from "@/modules/mentor";
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

/**
 * Menu do aluno — "Minhas Sondagens" saiu apenas desta lista (D-047: a
 * rota `/avaliacoes` e o componente continuam existindo, só não têm mais
 * entrada fixa aqui). "Diário do Auditor" e "Mentor IAH" têm rendering
 * próprio (ver `StudentDiarioMenuItem`/`StudentMentorMenuItem`) e por isso
 * ficam fora deste array — este cobre só os itens antes e depois deles.
 */
const STUDENT_MENU_TOP: MenuItem[] = [
  { title: "Minha Aula", icon: LayoutDashboard, href: "/dashboard" },
  { title: "Minha Missão", icon: Rocket, href: "/missoes" },
];

const STUDENT_MENU_BOTTOM: MenuItem[] = [
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
  if (role === "maintainer") return MAINTAINER_MENU;
  if (role === "director") return DIRECTOR_MENU;
  if (role === "pedagogical_coordinator") return COORDINATOR_MENU;
  return TEACHER_MENU;
}

export function AppSidebar({
  role = null,
  userName = null,
  roleLabel = null,
  /** Missão ativa do aluno (resolvida no servidor, `layout.tsx`) — habilita o CTA do Mentor IAH. */
  activeMissionId = null,
}: {
  role?: Role | null;
  userName?: string | null;
  roleLabel?: string | null;
  activeMissionId?: string | null;
}) {
  const pathname = usePathname();
  const isStudent = role === "student";
  const menuItems = menuForRole(role);
  const notebookLmUrl = process.env.NEXT_PUBLIC_NOTEBOOKLM_DIARIO_URL || null;
  const mentorAvailable = isMentorIAHEnabled() && Boolean(activeMissionId);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function renderNavItem(item: MenuItem) {
    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton
          render={item.href ? <Link href={item.href} /> : undefined}
          isActive={item.href ? isActive(item.href) : false}
          disabled={!item.href}
          aria-disabled={!item.href || undefined}
          tooltip={item.href ? item.title : `${item.title} — em breve`}
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
    );
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
              {isStudent ? (
                <>
                  {STUDENT_MENU_TOP.map(renderNavItem)}
                  <StudentDiarioMenuItem notebookLmUrl={notebookLmUrl} />
                  <StudentMentorMenuItem
                    available={mentorAvailable}
                    activeMissionId={activeMissionId}
                  />
                  {STUDENT_MENU_BOTTOM.map(renderNavItem)}
                </>
              ) : (
                menuItems.map(renderNavItem)
              )}
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

/**
 * Diário do Auditor (aluno) — link externo configurável para o NotebookLM
 * (`NEXT_PUBLIC_NOTEBOOKLM_DIARIO_URL`, variável pública, lida direto do
 * bundle do cliente). Sem URL configurada, o item fica indisponível —
 * nunca abre página vazia nem lança erro.
 */
function StudentDiarioMenuItem({ notebookLmUrl }: { notebookLmUrl: string | null }) {
  if (!notebookLmUrl) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          disabled
          aria-disabled="true"
          tooltip="O Diário do Auditor ainda não foi disponibilizado."
          className="cursor-default opacity-45 hover:bg-transparent hover:text-sidebar-foreground"
        >
          <NotebookPen />
          <span>Diário do Auditor</span>
          <span className="sr-only">
            O Diário do Auditor ainda não foi disponibilizado.
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={<a href={notebookLmUrl} target="_blank" rel="noopener noreferrer" />}
        tooltip="Diário do Auditor (abre em nova aba)"
      >
        <NotebookPen />
        <span>Diário do Auditor</span>
        <ExternalLink
          className="ml-auto size-3.5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/**
 * Mentor IAH (aluno) — CTA de marca, não um item de navegação comum: leva
 * direto para a Missão ativa com o painel já aberto (`?mentor=open`, lido
 * uma única vez por `MentorIAH`). Sem Missão ativa (ou com a feature flag
 * desligada), fica indisponível — o Mentor só existe dentro do contexto de
 * uma Missão (nunca um painel global, ver auditoria da navegação).
 */
function StudentMentorMenuItem({
  available,
  activeMissionId,
}: {
  available: boolean;
  activeMissionId: string | null;
}) {
  const collapsedMark = (
    <Logo
      size="sm"
      mark
      title=""
      className="hidden h-4 w-auto shrink-0 group-data-[collapsible=icon]:block"
    />
  );
  const expandedBrand = (
    <span className="flex items-center gap-1.5 group-data-[collapsible=icon]:hidden">
      <span>Mentor</span>
      <Logo sigla size="sm" title="" className="h-4 w-auto" />
    </span>
  );

  if (!available || !activeMissionId) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          disabled
          aria-disabled="true"
          aria-label="Mentor IAH"
          tooltip="O Mentor IAH estará disponível quando você iniciar uma missão."
          className="cursor-default border border-primary/15 opacity-45 hover:bg-transparent hover:text-sidebar-foreground"
        >
          {collapsedMark}
          {expandedBrand}
          <span className="sr-only">
            O Mentor IAH estará disponível quando você iniciar uma missão.
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={<Link href={`/missoes/${activeMissionId}?mentor=open`} />}
        aria-label="Mentor IAH"
        tooltip="Mentor IAH"
        className="border border-primary/30 bg-primary/10 font-medium text-foreground hover:bg-primary/15 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        {collapsedMark}
        {expandedBrand}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
