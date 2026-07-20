/**
 * Implementação LOCAL do `WorkspaceAuthProvider` — credenciais
 * simuladas contra o seed institucional, senha única de demonstração
 * (exibida na tela de login, nunca tratada como segredo). É a
 * implementação em uso até uma autenticação real (Google/Supabase/
 * Microsoft/Sophia) entrar pelo mesmo contrato.
 *
 * M18 — a validação de domínio institucional lê `Institution.domain`
 * (dado, nunca string fixa no código): só e-mails do domínio da
 * instituição seedada são aceitos, mesmo com a senha certa. Quando
 * houver mais de uma instituição seedada, a regra passa a resolver a
 * instituição pelo domínio do e-mail em vez de uma única constante.
 */

import type { WorkspaceAuthProvider } from "../domain/auth-provider";
import {
  findWorkspaceUserByEmail,
  WORKSPACE_DEMO_PASSWORD,
  WORKSPACE_INSTITUTION,
} from "../seeds/institution-seed";

function emailDomain(email: string): string {
  return email.trim().toLowerCase().split("@")[1] ?? "";
}

export const localWorkspaceAuthProvider: WorkspaceAuthProvider = {
  id: "local",
  async authenticate(email, password) {
    if (password !== WORKSPACE_DEMO_PASSWORD) return null;
    if (emailDomain(email) !== WORKSPACE_INSTITUTION.domain.toLowerCase()) return null;
    return findWorkspaceUserByEmail(email);
  },
};
