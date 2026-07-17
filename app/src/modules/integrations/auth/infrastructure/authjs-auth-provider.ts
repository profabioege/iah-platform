/**
 * Implementação REAL do contrato {@link AuthProvider} sobre o Auth.js
 * (login Google) — substitui o stub de D-019 quando as credenciais
 * existem. Toda autenticação da plataforma passa por este contrato;
 * nenhum componente importa next-auth diretamente.
 */

import { auth, signIn, signOut } from "@/auth";
import { isAuthConfigured } from "@/lib/auth-flags";
import type { AuthProvider, AuthSession } from "../domain/auth-provider";

export const authJsAuthProvider: AuthProvider = {
  id: "google",
  get isConfigured() {
    return isAuthConfigured();
  },
  async signIn() {
    // Dispara o fluxo OAuth (redireciona). A sessão resultante é lida
    // por getSession() no request seguinte.
    await signIn("google", { redirectTo: "/dashboard" });
    throw new Error("signIn deveria ter redirecionado para o Google.");
  },
  async signOut() {
    await signOut({ redirectTo: "/entrar" });
  },
  async getSession(): Promise<AuthSession | null> {
    if (!isAuthConfigured()) return null;
    const session = await auth();
    const email = session?.user?.email;
    if (!email) return null;
    const user = session.user as typeof session.user & {
      platformUserId?: string;
    };
    return {
      provider: "google",
      user: {
        id: user.platformUserId ?? email,
        name: user.name ?? email,
        email,
      },
    };
  },
};
