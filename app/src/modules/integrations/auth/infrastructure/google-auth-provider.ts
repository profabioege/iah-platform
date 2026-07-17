import type { AuthProvider } from "../domain/auth-provider";

const NOT_CONFIGURED_MESSAGE =
  "Google Auth Provider ainda não está configurado. Defina as credenciais " +
  "OAuth (ver docs/GOOGLE_WORKSPACE.md) antes de usar este provedor.";

/**
 * Stub do {@link AuthProvider} real (Google OAuth). Não faz nenhuma chamada
 * de rede — existe só para fixar o contrato que a implementação real vai
 * cumprir quando o projeto Google Cloud estiver disponível.
 */
export const googleAuthProvider: AuthProvider = {
  id: "google",
  isConfigured: false,
  async signIn() {
    throw new Error(NOT_CONFIGURED_MESSAGE);
  },
  async signOut() {
    throw new Error(NOT_CONFIGURED_MESSAGE);
  },
  async getSession() {
    return null;
  },
};
