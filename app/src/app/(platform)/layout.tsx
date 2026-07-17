import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SessionControls } from "@/components/layout/session-controls";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

/**
 * Layout do bloco PLATAFORMA IAH (sistema de ensino).
 *
 * Monta o App Shell (sidebar + header) e ativa o tema Premium Dark via
 * wrapper `.dark`, isolando o visual da plataforma do CSS da Landing.
 * A barreira de autenticação vive no middleware (src/middleware.ts);
 * aqui entram só os controles de sessão do header (logout), que não
 * renderizam nada no modo demonstração. Ver docs/AUTHENTICATION.md.
 */
export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark bg-background text-foreground font-sans">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <AppHeader actions={<SessionControls />} />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
