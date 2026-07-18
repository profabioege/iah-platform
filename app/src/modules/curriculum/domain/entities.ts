/**
 * Curriculum Engine — transforma o Planejamento Anual numa estrutura
 * navegável (Sprint M14). Estrutura: Disciplina → Ano Letivo (reaproveita
 * `AcademicYear`, `modules/platform` — D-001, nenhuma entidade
 * duplicada) → Unidades → Temas → Lessons (`modules/lesson`) → Mission
 * Flow (`modules/library`).
 *
 * `status`/`version` em `CurriculumUnit`/`CurriculumTheme` preparam a
 * arquitetura para o Currículo Vivo (atualizações e novas versões,
 * "Governança Curricular" em `ROADMAP.md`) — mesmo padrão de
 * versionamento já usado em `StudioMission` (D-022/D-026): nenhuma
 * versão é sobrescrita, editar publica cria a próxima.
 */

export type CurriculumStatus = "draft" | "published";

export interface Discipline {
  id: string;
  name: string;
}

export interface CurriculumUnit {
  id: string;
  disciplineId: string;
  /** -> `AcademicYear.id` (`modules/platform`). */
  academicYearId: string;
  label: string;
  order: number;
  status: CurriculumStatus;
  version: number;
}

/**
 * Tema — o nível que agrupa Objetivos, Competências, Tempo previsto,
 * Lessons, Mission Flows e Recursos (Sprint M14). "Avaliações" e
 * "Portfólio" não são campos próprios: Avaliação é derivada das Mission
 * Flows do Tema (mesmo parser do Mission Flow, D-027) e Portfólio segue
 * conceitual (D-028) — nenhum dado fake criado aqui.
 */
export interface CurriculumTheme {
  id: string;
  unitId: string;
  label: string;
  order: number;
  objectives: string[];
  bnccCompetencies: string[];
  bnccComputacaoCompetencies: string[];
  estimatedMinutes: number | null;
  /** -> `Lesson.id` (`modules/lesson`). */
  lessonIds: string[];
  /** -> `Mission.id` (`modules/library`) — um Tema pode referenciar uma Mission Flow direto, sem esperar por uma Lesson. */
  missionIds: string[];
  /** -> `KnowledgeDocument.id` (`modules/knowledge`). */
  knowledgeDocumentIds: string[];
  status: CurriculumStatus;
  version: number;
}
