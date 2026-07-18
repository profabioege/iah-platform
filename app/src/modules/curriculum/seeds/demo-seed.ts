/**
 * Dados de demonstração do Curriculum Engine — em memória, nunca
 * persistidos (mesma regra de docs/PERSISTENCE.md). Espelha a
 * estrutura real já existente na plataforma: o Módulo 1 da Missão 01
 * vira a primeira Unidade/Tema navegável.
 *
 * `academicYearId` referencia por id solto o `DEMO_ACADEMIC_YEAR` de
 * `modules/platform/seeds/demo-seed.ts` — desde a M16, o Ano Letivo
 * 2026 do Colégio Beryon (mesmo padrão de referência por id já usado
 * entre módulos neste projeto, ex.: `Lesson.missionId`) — sem importar
 * o seed de outro módulo diretamente (D-001).
 */

import type { CurriculumTheme, CurriculumUnit, Discipline } from "../domain/entities";

export const DEMO_DISCIPLINE: Discipline = {
  id: "discipline-iah",
  name: "Inteligência Artificial & Humanidades",
};

export const DEMO_UNIT: CurriculumUnit = {
  id: "unit-modulo-1",
  disciplineId: DEMO_DISCIPLINE.id,
  academicYearId: "year-beryon-2026",
  label: "Módulo 1 — O Auditor da Realidade",
  order: 1,
  status: "published",
  version: 1,
};

export const DEMO_THEME: CurriculumTheme = {
  id: "theme-fabrica-de-noticias",
  unitId: DEMO_UNIT.id,
  label: "Desinformação e verificação de fontes",
  order: 1,
  objectives: [
    "Compreender que a IA generativa pode produzir textos convincentes e falsos.",
    "Desenvolver critérios objetivos para verificar a confiabilidade de uma informação.",
  ],
  bnccCompetencies: [],
  bnccComputacaoCompetencies: [],
  estimatedMinutes: 50,
  lessonIds: [],
  missionIds: ["01-a-fabrica-de-noticias"],
  knowledgeDocumentIds: ["doc-como-uma-ia-escreve-noticia"],
  status: "published",
  version: 1,
};
