/**
 * Contratos de persistência do Curriculum Engine — mesmo padrão de
 * `modules/knowledge/domain/repositories.ts` (D-034): domínio não
 * conhece banco, só a interface.
 */

import type { CurriculumTheme, CurriculumUnit, Discipline } from "./entities";

export interface DisciplineRepository {
  list(): Promise<Discipline[]>;
}

export interface CurriculumUnitRepository {
  listByDiscipline(disciplineId: string): Promise<CurriculumUnit[]>;
  getById(id: string): Promise<CurriculumUnit | null>;
  save(unit: CurriculumUnit): Promise<CurriculumUnit>;
}

export interface CurriculumThemeRepository {
  listByUnit(unitId: string): Promise<CurriculumTheme[]>;
  getById(id: string): Promise<CurriculumTheme | null>;
  save(theme: CurriculumTheme): Promise<CurriculumTheme>;
}

/** Agregado — o que a factory (`infrastructure/repository-factory.ts`) entrega. */
export interface CurriculumRepositories {
  disciplines: DisciplineRepository;
  units: CurriculumUnitRepository;
  themes: CurriculumThemeRepository;
}
