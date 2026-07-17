/**
 * Adapta um ClassroomService (Google) ao contrato genérico
 * ImportProvider — o ponto exato em que "Google" deixa de existir para
 * o resto da plataforma (docs/IMPORT_ARCHITECTURE.md).
 *
 * Por isso o ImportService/ClassroomSyncService nunca importam nada
 * deste módulo: recebem um ImportProvider e não sabem a origem.
 */

import type { ImportProvider } from "@/modules/integrations";
import type { ClassroomService } from "../contracts";
import { toImportedClassroom, toImportedStudent } from "../mappers";

export function createGoogleClassroomImportProvider(
  service: ClassroomService,
): ImportProvider {
  return {
    id: "google",
    get isConfigured() {
      return service.isConfigured;
    },
    async listClassrooms() {
      const courses = await service.listCourses();
      return courses
        .filter((course) => course.state === "ACTIVE")
        .map(toImportedClassroom);
    },
    async listStudents(externalClassroomId) {
      const students = await service.listStudents(externalClassroomId);
      return students.map(toImportedStudent);
    },
  };
}
