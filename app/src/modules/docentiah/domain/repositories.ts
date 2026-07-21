import type { AttachedContext, GeneratedMaterial, GenerationUsage } from "./entities";

export interface GeneratedMaterialRepository {
  listByTeacher(institutionId: string, teacherId: string): Promise<GeneratedMaterial[]>;
  getById(institutionId: string, id: string): Promise<GeneratedMaterial | null>;
  save(institutionId: string, material: GeneratedMaterial): Promise<void>;
}

export interface GenerationUsageRepository {
  listByInstitution(institutionId: string): Promise<GenerationUsage[]>;
  save(institutionId: string, usage: GenerationUsage): Promise<void>;
}

export interface AttachedContextRepository {
  listByMaterial(materialId: string): Promise<AttachedContext[]>;
  save(context: AttachedContext): Promise<void>;
}

export interface DocentiahRepositories {
  materials: GeneratedMaterialRepository;
  usage: GenerationUsageRepository;
  attachedContext: AttachedContextRepository;
}
