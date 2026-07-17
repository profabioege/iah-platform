import type { ClassroomProvider } from "../domain/classroom-provider";

const NOT_CONFIGURED_MESSAGE =
  "Google Classroom Provider ainda não está configurado. Defina as " +
  "credenciais OAuth e habilite a Classroom API (ver docs/GOOGLE_WORKSPACE.md).";

/**
 * Stub do {@link ClassroomProvider} real (Google Classroom API). Não faz
 * nenhuma chamada de rede — fixa o contrato que a implementação real vai
 * cumprir quando o projeto Google Cloud estiver disponível.
 */
export const googleClassroomProvider: ClassroomProvider = {
  id: "google",
  isConfigured: false,
  async listCourses() {
    throw new Error(NOT_CONFIGURED_MESSAGE);
  },
  async listStudents() {
    throw new Error(NOT_CONFIGURED_MESSAGE);
  },
  async publishMission() {
    throw new Error(NOT_CONFIGURED_MESSAGE);
  },
};
