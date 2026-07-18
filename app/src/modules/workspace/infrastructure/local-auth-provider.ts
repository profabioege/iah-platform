/**
 * Implementação LOCAL do `WorkspaceAuthProvider` — credenciais
 * simuladas contra o seed institucional, senha única de demonstração
 * (exibida na tela de login, nunca tratada como segredo). É a
 * implementação em uso até uma autenticação real (Google/Supabase/
 * Microsoft/Sophia) entrar pelo mesmo contrato.
 */

import type { WorkspaceAuthProvider } from "../domain/auth-provider";
import {
  findWorkspaceUserByEmail,
  WORKSPACE_DEMO_PASSWORD,
} from "../seeds/beryon-seed";

export const localWorkspaceAuthProvider: WorkspaceAuthProvider = {
  id: "local",
  async authenticate(email, password) {
    if (password !== WORKSPACE_DEMO_PASSWORD) return null;
    return findWorkspaceUserByEmail(email);
  },
};
