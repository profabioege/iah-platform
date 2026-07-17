import type { AuthProvider, AuthSession } from "../domain/auth-provider";

const MOCK_SESSION: AuthSession = {
  provider: "mock",
  user: {
    id: "prof-demo",
    name: "Professor(a) de demonstração",
    email: "professor@demonstracao.iaheducacional.com.br",
  },
};

/**
 * Implementação simulada do {@link AuthProvider} — nenhuma chamada de rede,
 * nenhuma credencial externa. Usada enquanto o Google Cloud não está
 * configurado (ver docs/GOOGLE_WORKSPACE.md).
 */
export const mockAuthProvider: AuthProvider = {
  id: "mock",
  isConfigured: true,
  async signIn() {
    return MOCK_SESSION;
  },
  async signOut() {},
  async getSession() {
    return MOCK_SESSION;
  },
};
