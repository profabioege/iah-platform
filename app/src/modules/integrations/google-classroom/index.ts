/**
 * Módulo Google Classroom — adaptador do Google para o IAH.
 *
 * Fronteira: nada fora deste módulo conhece os tipos Google. O resto da
 * plataforma consome o contrato genérico ImportProvider, obtido por
 * `createGoogleClassroomImportProvider` (docs/IMPORT_ARCHITECTURE.md,
 * docs/GOOGLE_CLASSROOM_INTEGRATION.md).
 *
 * Estado: o ClassroomService real está pronto, mas a camada de dados
 * (repositories/) é stub até existirem credenciais OAuth. Enquanto isso,
 * `mockClassroomService` fornece dados SIMULADOS e rotulados.
 */

export type {
  GoogleAssignment,
  GoogleClassroom,
  GoogleCourse,
  GoogleCourseState,
  GoogleStudent,
  GoogleTeacher,
} from "./types";

export type {
  ClassroomService,
  GoogleClassroomRepository,
} from "./contracts";

export {
  createGoogleClassroomService,
  googleClassroomService,
} from "./services/google-classroom-service";
export { createGoogleClassroomImportProvider } from "./services/classroom-import-adapter";
export { googleClassroomRepository } from "./repositories/google-classroom-repository";
export { mockClassroomService } from "./mock/mock-classroom-service";

/**
 * ClassroomService em uso: o real quando houver credenciais, o simulado
 * (rotulado) caso contrário. Consumidores devem checar `isSimulated`
 * antes de exibir os dados como reais.
 */
import { googleClassroomService } from "./services/google-classroom-service";
import { mockClassroomService } from "./mock/mock-classroom-service";
import type { ClassroomService } from "./contracts";

export function getClassroomService(): ClassroomService {
  return googleClassroomService.isConfigured
    ? googleClassroomService
    : mockClassroomService;
}
