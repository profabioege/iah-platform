/**
 * Camada de dados do módulo: acesso à Google Classroom API.
 *
 * STUB deliberado (padrão D-019/D-023): não existem credenciais OAuth
 * nesta fase, então cada método lança em vez de fingir uma chamada HTTP
 * nunca executada. Quando o projeto Google Cloud existir
 * (docs/GOOGLE_WORKSPACE.md), é aqui — e só aqui — que entram as
 * chamadas reais; o ClassroomService e os mappers acima não mudam.
 */

import type { GoogleClassroomRepository } from "../contracts";
import { isGoogleWorkspaceConfigured } from "../../config";

const NOT_CONFIGURED =
  "Google Classroom API não está configurada — faltam credenciais OAuth. " +
  "Ver docs/GOOGLE_WORKSPACE.md e docs/GOOGLE_CLASSROOM_INTEGRATION.md.";

/**
 * Endpoints previstos quando a implementação real entrar:
 *   fetchCourses     → GET /v1/courses?courseStates=ACTIVE
 *   fetchStudents    → GET /v1/courses/{courseId}/students
 *   fetchTeachers    → GET /v1/courses/{courseId}/teachers
 *   fetchAssignments → GET /v1/courses/{courseId}/courseWork
 */
export const googleClassroomRepository: GoogleClassroomRepository = {
  get isConfigured() {
    return isGoogleWorkspaceConfigured();
  },
  async fetchCourses() {
    throw new Error(NOT_CONFIGURED);
  },
  async fetchStudents() {
    throw new Error(NOT_CONFIGURED);
  },
  async fetchTeachers() {
    throw new Error(NOT_CONFIGURED);
  },
  async fetchAssignments() {
    throw new Error(NOT_CONFIGURED);
  },
};
