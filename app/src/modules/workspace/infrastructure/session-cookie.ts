/**
 * Constantes e resolução de sessão do Workspace — ARQUIVO EDGE-SAFE
 * (importado pelo middleware): só o nome do cookie e a resolução
 * userId → papel a partir do seed, nenhuma dependência de Node.
 *
 * A "sessão" desta fase é deliberadamente simples — o cookie guarda só
 * o id do usuário simulado. Quando a autenticação real entrar
 * (`WorkspaceAuthProvider`), este arquivo é o segundo e último ponto de
 * troca (cookie de sessão real/JWT), sem que nenhuma tela mude.
 */

import type { Role } from "../domain/entities";
import { findWorkspaceUserById } from "../seeds/institution-seed";

export const WORKSPACE_SESSION_COOKIE = "iah_workspace_session";

/** Papel do usuário da sessão — `null` quando o cookie não aponta para um usuário válido. */
export function resolveSessionRole(userId: string | undefined): Role | null {
  if (!userId) return null;
  return findWorkspaceUserById(userId)?.role ?? null;
}
