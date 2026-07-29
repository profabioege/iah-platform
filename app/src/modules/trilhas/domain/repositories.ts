import type { Trilha } from "./entities";

export interface TrilhaRepository {
  list(institutionId: string, academicYearId?: string): Promise<Trilha[]>;
  getById(institutionId: string, id: string): Promise<Trilha | null>;
  getByCode(
    institutionId: string,
    academicYearId: string,
    code: string,
  ): Promise<Trilha | null>;
  save(institutionId: string, trilha: Trilha): Promise<void>;
}
