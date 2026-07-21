import type { AttachedContext, GeneratedMaterial, GenerationUsage } from "../../domain/entities";
import type { DocentiahRepositories } from "../../domain/repositories";

export function createSeedDocentiahRepositories(): DocentiahRepositories {
  const materials: GeneratedMaterial[] = [];
  const usageEntries: GenerationUsage[] = [];
  const attachedContexts: AttachedContext[] = [];

  return {
    materials: {
      async listByTeacher(institutionId, teacherId) {
        return materials
          .filter((item) => item.institutionId === institutionId && item.teacherId === teacherId)
          .map((item) => structuredClone(item))
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      },
      async getById(institutionId, id) {
        const found = materials.find((item) => item.institutionId === institutionId && item.id === id);
        return found ? structuredClone(found) : null;
      },
      async save(institutionId, material) {
        const item = structuredClone({ ...material, institutionId });
        const index = materials.findIndex(
          (current) => current.institutionId === institutionId && current.id === item.id,
        );
        if (index >= 0) materials[index] = item;
        else materials.push(item);
      },
    },
    usage: {
      async listByInstitution(institutionId) {
        return usageEntries
          .filter((item) => item.institutionId === institutionId)
          .map((item) => structuredClone(item));
      },
      async save(institutionId, usage) {
        usageEntries.push(structuredClone({ ...usage, institutionId }));
      },
    },
    attachedContext: {
      async listByMaterial(materialId) {
        return attachedContexts
          .filter((item) => item.materialId === materialId)
          .map((item) => structuredClone(item));
      },
      async save(context) {
        attachedContexts.push(structuredClone(context));
      },
    },
  };
}
