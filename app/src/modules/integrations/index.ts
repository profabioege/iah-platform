/**
 * Módulo Integrations — abstrações para provedores externos (Google
 * Workspace hoje; Microsoft Teams é um provedor futuro possível sob os
 * mesmos contratos). A UI nunca importa uma implementação diretamente,
 * apenas os contratos e a instância injetada.
 */

export type {
  AuthProvider,
  AuthSession,
  AuthUser,
} from "./auth/domain/auth-provider";
export { mockAuthProvider } from "./auth/infrastructure/mock-auth-provider";
export { googleAuthProvider } from "./auth/infrastructure/google-auth-provider";

export type {
  ClassroomProvider,
  ExternalCourse,
  ExternalStudent,
} from "./classroom/domain/classroom-provider";
export { mockClassroomProvider } from "./classroom/infrastructure/mock-classroom-provider";
export { googleClassroomProvider } from "./classroom/infrastructure/google-classroom-provider";

export { isGoogleWorkspaceConfigured } from "./config";
