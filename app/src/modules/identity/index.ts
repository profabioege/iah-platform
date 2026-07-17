/**
 * Módulo Identity — contexto Identidade & Acesso (docs/DOMAIN_MODEL.md).
 * Consumido pelo Auth.js (src/auth.ts) no primeiro login; nenhuma UI
 * importa este módulo diretamente.
 */

export type {
  PlatformUser,
  Profile,
  ProfileRole,
  ProvisionedTeacher,
} from "./domain/entities";

export {
  ensureTeacherProvisioned,
  type ProvisionInput,
} from "./services/provisioning-service";
