import { LogOut } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { isAuthConfigured } from "@/lib/auth-flags";
import {
  getWorkspaceUser,
  WORKSPACE_SESSION_COOKIE,
} from "@/modules/workspace";
import { Button } from "@/components/ui/button";

/**
 * Controles de sessão do header da Plataforma (server component,
 * injetado no AppHeader pelo layout). Com a autenticação real
 * configurada, vale a sessão do Auth.js; sem ela, vale a sessão local
 * do Institutional Workspace (M15). Sem nenhuma sessão, não renderiza
 * nada.
 */
export async function SessionControls() {
  if (isAuthConfigured()) {
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

  const user = await getWorkspaceUser();
  if (!user) return null;

  return (
    <form
      className="flex items-center gap-2"
      action={async () => {
        "use server";
        const store = await cookies();
        store.delete(WORKSPACE_SESSION_COOKIE);
        redirect("/entrar");
      }}
    >
      <span className="hidden max-w-40 truncate text-xs text-muted-foreground md:inline">
        {user.name}
      </span>
      <Button type="submit" variant="ghost" size="sm" title="Sair da plataforma">
        <LogOut className="size-4" />
        Sair
      </Button>
    </form>
  );
}
