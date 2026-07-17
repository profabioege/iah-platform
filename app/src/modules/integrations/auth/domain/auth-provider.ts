/**
 * Abstração de autenticação — a UI depende apenas deste contrato, nunca de
 * um provedor específico (Google, Microsoft, simulado). Trocar o provedor
 * é trocar a implementação injetada, nunca a interface.
 */

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthSession {
  provider: "mock" | "google";
  user: AuthUser;
}

/** Porta de autenticação (domínio). Implementações em `infrastructure/`. */
export interface AuthProvider {
  readonly id: "mock" | "google";
  /** Falso enquanto as credenciais reais do provedor não existem. */
  readonly isConfigured: boolean;
  signIn(): Promise<AuthSession>;
  signOut(): Promise<void>;
  getSession(): Promise<AuthSession | null>;
}
