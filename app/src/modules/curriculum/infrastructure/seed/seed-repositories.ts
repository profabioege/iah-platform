/**
 * Implementação SEED dos contratos do Curriculum Engine — em memória,
 * mesmo padrão de `modules/knowledge/infrastructure/seed/seed-repositories.ts`.
 */

import type { CurriculumTheme, CurriculumUnit, Discipline } from "../../domain/entities";
import type { CurriculumRepositories } from "../../domain/curriculum-repository";
import { DEMO_DISCIPLINE, DEMO_THEME, DEMO_UNIT } from "../../seeds/demo-seed";

export function createSeedCurriculumRepositories(): CurriculumRepositories {
  // Cópias mutáveis por instância — escritas não vazam entre factories
  // (mesma regra de modules/platform/modules/knowledge).
  const disciplines: Discipline[] = [DEMO_DISCIPLINE];
  const units: CurriculumUnit[] = [DEMO_UNIT];
  const themes: CurriculumTheme[] = [DEMO_THEME];

  return {
    disciplines: {
      async list() {
        return disciplines;
      },
    },
    units: {
      async listByDiscipline(disciplineId) {
        return units.filter((u) => u.disciplineId === disciplineId).sort((a, b) => a.order - b.order);
      },
      async getById(id) {
        return units.find((u) => u.id === id) ?? null;
      },
      async save(unit) {
        const index = units.findIndex((u) => u.id === unit.id);
        if (index === -1) units.push(unit);
        else units[index] = unit;
        return unit;
      },
    },
    themes: {
      async listByUnit(unitId) {
        return themes.filter((t) => t.unitId === unitId).sort((a, b) => a.order - b.order);
      },
      async getById(id) {
        return themes.find((t) => t.id === id) ?? null;
      },
      async save(theme) {
        const index = themes.findIndex((t) => t.id === theme.id);
        if (index === -1) themes.push(theme);
        else themes[index] = theme;
        return theme;
      },
    },
  };
}
