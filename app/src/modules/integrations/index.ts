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
export { authJsAuthProvider } from "./auth/infrastructure/authjs-auth-provider";

/**
 * AuthProvider em uso: o real (Auth.js + Google) quando as credenciais
 * existem, o simulado caso contrário. Toda autenticação passa por aqui.
 */
import { authJsAuthProvider } from "./auth/infrastructure/authjs-auth-provider";
import { mockAuthProvider } from "./auth/infrastructure/mock-auth-provider";
import type { AuthProvider } from "./auth/domain/auth-provider";

export function getAuthProvider(): AuthProvider {
  return authJsAuthProvider.isConfigured ? authJsAuthProvider : mockAuthProvider;
}

export type {
  ClassroomProvider,
  ExternalCourse,
  ExternalStudent,
} from "./classroom/domain/classroom-provider";
export { mockClassroomProvider } from "./classroom/infrastructure/mock-classroom-provider";
export { googleClassroomProvider } from "./classroom/infrastructure/google-classroom-provider";

export type {
  ImportProvider,
  ImportProviderId,
  ImportedClassroom,
  ImportedStudent,
} from "./import/domain/import-provider";
export {
  apiImportProvider,
  createManualImportProvider,
  csvImportProvider,
  googleClassroomImportProvider,
  microsoftTeamsImportProvider,
  moodleImportProvider,
} from "./import/infrastructure/import-providers";

export { isGoogleWorkspaceConfigured } from "./config";
