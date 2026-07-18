import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SessionControls } from "@/components/layout/session-controls";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { isAuthConfigured } from "@/lib/auth-flags";
import { getWorkspaceContext, ROLE_LABEL } from "@/modules/workspace";

/**
 * Layout do bloco PLATAFORMA IAH (sistema de ensino).
 *
 * Monta o App Shell (sidebar + header) e ativa o tema Premium Dark via
 * wrapper `.dark`. A barreira de autenticação vive no middleware
 * (src/middleware.ts). Desde a M15 (Institutional Workspace), o
 * contexto pedagógico do usuário autenticado (papel, nome, Instituição,
 * Ano Letivo) é carregado aqui e acompanha toda a navegação — sidebar
 * por papel, identidade real no rodapé, instituição no header.
 */
export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = isAuthConfigured() ? null : await getWorkspaceContext();

  return (
    <div className="dark bg-background text-foreground font-sans">
      <SidebarProvider>
        <AppSidebar
          role={context?.role ?? null}
          userName={context?.user.name ?? null}
          roleLabel={context ? ROLE_LABEL[context.role] : null}
        />
        <SidebarInset>
          <AppHeader
            actions={<SessionControls />}
            badgeLabel={
              context
                ? `${context.institution.name} · ${context.schoolYear.label}`
                : undefined
            }
          />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
