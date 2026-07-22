import type { CorrelatedLesson, CurriculumConnection } from "../../domain/entities";
import type { ConexoesIahRepositories } from "../../domain/repositories";

export function createSeedConexoesIahRepositories(): ConexoesIahRepositories {
  const connections: CurriculumConnection[] = [];
  const correlatedLessons: CorrelatedLesson[] = [];

  return {
    connections: {
      async getById(institutionId, id) {
        const found = connections.find((item) => item.institutionId === institutionId && item.id === id);
        return found ? structuredClone(found) : null;
      },
      async listByTeacher(institutionId, teacherId) {
        return connections
          .filter((item) => item.institutionId === institutionId && item.createdByTeacherId === teacherId)
          .map((item) => structuredClone(item))
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      },
      async save(institutionId, connection) {
        const item = structuredClone({ ...connection, institutionId });
        const index = connections.findIndex(
          (current) => current.institutionId === institutionId && current.id === item.id,
        );
        if (index >= 0) connections[index] = item;
        else connections.push(item);
      },
    },
    correlatedLessons: {
      async getByConnectionId(curriculumConnectionId) {
        const found = correlatedLessons.find((item) => item.curriculumConnectionId === curriculumConnectionId);
        return found ? structuredClone(found) : null;
      },
      async getByGeneratedMaterialId(generatedMaterialId) {
        const found = correlatedLessons.find((item) => item.generatedMaterialId === generatedMaterialId);
        return found ? structuredClone(found) : null;
      },
      async save(lesson) {
        const item = structuredClone(lesson);
        const index = correlatedLessons.findIndex((current) => current.id === item.id);
        if (index >= 0) correlatedLessons[index] = item;
        else correlatedLessons.push(item);
      },
    },
  };
}
