/**
 * Módulo Curriculum — Curriculum Engine / Currículo Vivo (Sprint M14).
 *
 * Transforma o Planejamento Anual numa estrutura navegável: Disciplina
 * → Ano Letivo (`modules/platform`) → Unidades → Temas → Lessons
 * (`modules/lesson`) → Mission Flow (`modules/library`). Camadas: domain
 * (entidades + contratos + timeline), infrastructure (seed em memória +
 * database stub + factory), seeds (dados de demonstração, nunca
 * persistidos).
 *
 * NENHUMA página consumia este módulo antes desta Sprint — agora
 * `/professor/curriculo` é o primeiro consumidor.
 */

export type {
  CurriculumStatus,
  CurriculumTheme,
  CurriculumUnit,
  Discipline,
} from "./domain/entities";

export type {
  CurriculumRepositories,
  CurriculumThemeRepository,
  CurriculumUnitRepository,
  DisciplineRepository,
} from "./domain/curriculum-repository";

export {
  buildCurriculumTimeline,
  summarizeCurriculumTimeline,
  type CurriculumTimelineEntry,
  type CurriculumTimelineSummary,
} from "./domain/timeline";

export {
  createCurriculumRepositories,
  getDefaultCurriculumRepositories,
  type CurriculumRepositorySource,
} from "./infrastructure/repository-factory";
