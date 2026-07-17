import { LogOut } from "lucide-react";

import { auth, signOut } from "@/auth";
import { isAuthConfigured } from "@/lib/auth-flags";
import { Button } from "@/components/ui/button";

/**
 * Controles de sessão do header da Plataforma (server component,
 * injetado no AppHeader pelo layout). Sem autenticação configurada ou
 * sem sessão ativa, não renderiza nada — o header fica como sempre foi.
 */
export async function SessionControls() {
  if (!isAuthConfigured()) return null;
  const session = await auth();
  if (!session?.user) return null;

  return (
    <form
      className="flex items-center gap-2"
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/entrar" });
      }}
    >
      <span className="hidden max-w-40 truncate text-xs text-muted-foreground md:inline">
        {session.user.name ?? session.user.email}
      </span>
      <Button type="submit" variant="ghost" size="sm" title="Sair da plataforma">
        <LogOut className="size-4" />
        Sair
      </Button>
    </form>
  );
}
