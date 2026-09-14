import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SessionControls } from "@/components/layout/session-controls";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requirePlatformDataMode } from "@/lib/platform-access";
import { getWorkspaceContext, ROLE_LABEL } from "@/modules/workspace";

/**
 * Layout do bloco PLATAFORMA IAH (sistema de ensino).
 *
 * Monta o App Shell (sidebar + header) e ativa o tema Premium Dark via
 * wrapper `.dark`. O middleware continua sendo a primeira barreira, mas
 * não a única: `requirePlatformDataMode()` interrompe o render de
 * QUALQUER tela privada quando a instância está indisponível — inclusive
 * as que não tomam decisão de fonte de dados e por isso não foram
 * tocadas uma a uma. Desde a M15 (Institutional Workspace), o contexto
 * pedagógico do usuário autenticado (papel, nome, Instituição, Ano
 * Letivo) é carregado aqui e acompanha toda a navegação.
 */
/**
 * Nenhuma tela privada pode ser prerenderizada no build: todas dependem
 * da sessão e do modo declarado em runtime. Antes isso valia por acaso
 * — a leitura do cookie no caminho de demonstração marcava o segmento
 * como dinâmico. Declarar aqui torna a regra explícita e impede que uma
 * tela privada volte a ser gerada estaticamente, sem sessão e sem modo.
 */
export const dynamic = "force-dynamic";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  requirePlatformDataMode();

  const context = await getWorkspaceContext();

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
