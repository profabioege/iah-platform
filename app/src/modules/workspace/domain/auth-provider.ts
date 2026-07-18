/**
 * Contrato de autenticação do Institutional Workspace (Sprint M15).
 *
 * Hoje existe UMA implementação: `localWorkspaceAuthProvider`
 * (credenciais simuladas, senha padrão de demonstração). O contrato é o
 * ponto único de troca para as integrações futuras previstas — Google
 * OAuth/Workspace, Supabase Auth, Microsoft Entra ID, Sophia by Layers —
 * mesmo padrão D-019: nenhuma delas implementada nesta Sprint, nenhum
 * stub que finge (D-016); quando existirem, entram por aqui sem que
 * nenhuma tela mude.
 */

import type { WorkspaceUser } from "./entities";

export interface WorkspaceAuthProvider {
  readonly id: "local" | "google" | "supabase" | "microsoft-entra" | "sophia";
  /** Resolve credenciais para um usuário do Workspace — `null` quando inválidas. */
  authenticate(email: string, password: string): Promise<WorkspaceUser | null>;
}
